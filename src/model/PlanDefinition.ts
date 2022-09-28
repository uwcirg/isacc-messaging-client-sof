import {
    ActivityDefinitionStatusKind,
    IActivityDefinition,
    IActivityDefinition_DynamicValue,
    IPlanDefinition,
    IPlanDefinition_Action,
    IResourceList, ITiming,
    PlanDefinitionStatusKind
} from "@ahryman40k/ts-fhir-types/lib/R4";
import defaultSchedule from "../resource/default_message_schedule.json"
import {ITriggerDefinition} from "@ahryman40k/ts-fhir-types/lib/R4/Resource/RTTI_TriggerDefinition";
import Patient from "./Patient";
import {birthdaysBetweenDates} from "../util/isacc_util";
import {MessageDraft} from "../components/ScheduleSetup";

export default class PlanDefinition implements IPlanDefinition {
    activityDefinitions: ActivityDefinition[];
    action: IPlanDefinition_Action[];
    contained: IResourceList[];
    id: string;
    status: PlanDefinitionStatusKind;
    title: string;


    static from(raw: IPlanDefinition): PlanDefinition {
        if (!raw) return null;
        let planDefinition = Object.assign(new PlanDefinition(), raw);
        planDefinition.activityDefinitions = planDefinition.action.map(function (action: IPlanDefinition_Action) {
                let id = action.definitionCanonical.slice(1);
                let activityDefinition = planDefinition.contained.find((r: IResourceList) => r.id === id);
                return ActivityDefinition.from(activityDefinition);
            }
        );
        return planDefinition;
    }

    triggerForActivityDefinition(activityDefinitionId: string): ITriggerDefinition[] {
        return this.action.find((action: IPlanDefinition_Action) => action.definitionCanonical.slice(1) === activityDefinitionId)?.trigger;
    }

    get reference(): string {
        return `${this.resourceType}/${this.id}`;
    }

    resourceType: "PlanDefinition";

    createMessageList(patient: Patient, replacements: object): MessageDraft[] {
        // regular messages
        const messages: MessageDraft[] = this.activityDefinitions.map(
            (activityDef: ActivityDefinition) => {
                if (activityDef.timingTiming) {
                    let contentString = activityDef.payloadText;
                    if (replacements) {
                        for (const [key, value] of Object.entries(replacements)) {
                            contentString = contentString.replace(key, value);
                        }
                    }
                    let date = activityDef.occurrenceTimeFromNow();
                    return {
                        text: contentString,
                        scheduledDateTime: date
                    } as MessageDraft;
                }
                return null;
            }).filter(m => m != null);

        // add birthday messages
        let messageDates = messages.map((m: MessageDraft) => m.scheduledDateTime).sort(((a, b) => a < b ? -1 : 1));
        if (messageDates.length > 0) {
            let programStart = messageDates[0];
            let programEnd = messageDates[messageDates.length - 1];

            let birthdayMessageAction = this.action.find(
                (action: IPlanDefinition_Action) => action.trigger?.find(
                    (t: ITriggerDefinition) => t.type === "named-event" && t.name === "birthday"
                )
            );
            let birthdayMessageTrigger = birthdayMessageAction?.trigger?.find(
                (t: ITriggerDefinition) => t.type === "named-event" && t.name === "birthday"
            );
            let birthdayMessageActivityDefinition = this.activityDefinitions.find(
                (activityDef: ActivityDefinition) => activityDef.id === birthdayMessageAction.definitionCanonical.slice(1)
            );
            if (birthdayMessageAction && birthdayMessageTrigger && birthdayMessageActivityDefinition) {
                let birthdays = birthdaysBetweenDates(programStart, programEnd, new Date(patient.birthDate));
                birthdays.forEach((d: Date) => messages.push({
                    text: birthdayMessageActivityDefinition.payloadText,
                    scheduledDateTime: birthdayMessageActivityDefinition.nextOccurrenceTimeAtDate(d, birthdayMessageTrigger.timingTiming),
                }));
            }
        }

        //TODO: Add holidays

        return messages.sort((a, b) => a.scheduledDateTime < b.scheduledDateTime ? -1 : 1);
    }
}

export class ActivityDefinition implements IActivityDefinition {
    dynamicValue: IActivityDefinition_DynamicValue[];
    id: string;
    kind: string;
    name: string;
    status: ActivityDefinitionStatusKind;
    resourceType: "ActivityDefinition";
    timingTiming: ITiming;


    static from(raw: IResourceList): ActivityDefinition {
        if (!raw) return null;
        return Object.assign(new ActivityDefinition(), raw);
    }

    occurrenceTimeFromNow(): Date {
        if (this.timingTiming.repeat.periodUnit !== 'wk') {
            throw Error("Unhandled time unit in timingTiming");
        }

        let date = new Date();
        date.setDate(date.getDate() + 7 * this.timingTiming.repeat.period);

        if (!this.timingTiming.repeat.timeOfDay) {
            return date;
        }

        ActivityDefinition.setTimeOfDay(date, this.timingTiming);

        return date;
    }

    private static setTimeOfDay(date: Date, timingTiming: ITiming) {
        if (timingTiming.repeat.timeOfDay.length > 1) {
            throw Error("More than one timeOfDay in timingTiming");
        }

        const components: Array<string> = timingTiming.repeat.timeOfDay[0].split(":");
        date.setHours(parseFloat(components[0]));
        date.setMinutes(parseFloat(components[1]));
        date.setSeconds(parseFloat(components[2]));

        return date;
    }

    nextOccurrenceTimeAtDate(date: Date, timingTiming: ITiming) {
        if (!timingTiming.repeat.timeOfDay) {
            throw Error("No timeOfDay given in timingTiming");
        }
        ActivityDefinition.setTimeOfDay(date, timingTiming);
        return date;
    }

    get payloadText() {
        return this.dynamicValue.find(
            (dynVal) => dynVal.path === "payload.contentString"
        ).expression.expression
    }
}

export function getDefaultMessageSchedule(): PlanDefinition {
    let raw = defaultSchedule as IPlanDefinition;
    return PlanDefinition.from(raw);
}
