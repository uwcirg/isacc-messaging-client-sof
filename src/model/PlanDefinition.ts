import {
    ActivityDefinitionStatusKind,
    IActivityDefinition,
    IActivityDefinition_DynamicValue,
    IPlanDefinition,
    IPlanDefinition_Action,
    IResourceList,
    ITiming,
    PlanDefinitionStatusKind
} from "@ahryman40k/ts-fhir-types/lib/R4";
import defaultSchedule from "../fhir/PlanDefinition.json"
import {ITriggerDefinition} from "@ahryman40k/ts-fhir-types/lib/R4/Resource/RTTI_TriggerDefinition";
import Patient from "./Patient";
import {birthdaysBetweenDates} from "../util/isacc_util";
import {MessageDraft} from "../components/ScheduleSetup";
import {makeCommunicationRequests} from "./modelUtil";
import {CommunicationRequest} from "./CommunicationRequest";

export default class PlanDefinition implements IPlanDefinition {
    resourceType: "PlanDefinition";
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

    isBirthdayMessage(activityDefinitionId: string): boolean {
        return this.action.find(
            (action: IPlanDefinition_Action) => action.definitionCanonical.slice(1) === activityDefinitionId)?.trigger?.find(
            (trigger: ITriggerDefinition) => trigger.type === 'named-event' && trigger.name === 'birthday'
        ) != null;
    }

    get reference(): string {
        return `${this.resourceType}/${this.id}`;
    }

    createMessageList(patient: Patient, replacements: object): CommunicationRequest[] {
        // regular messages
        let messages: MessageDraft[] = this.activityDefinitions.map(
            (activityDef: ActivityDefinition) => {
                if (!this.isBirthdayMessage(activityDef.id) && activityDef.timingTiming) {
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
            let birthdayMessageActivityDefinition = this.activityDefinitions.find(
                (activityDef: ActivityDefinition) => activityDef.id === birthdayMessageAction.definitionCanonical.slice(1)
            );
            if (birthdayMessageAction && birthdayMessageActivityDefinition) {
                if (patient.birthDate) {
                    let dobNumbers = patient.birthDate.split('-').map((v:string) => parseInt(v))
                    let year, month, day;
                    if (dobNumbers.length >= 1) {
                        year = dobNumbers[0];
                    }
                    if (dobNumbers.length >= 2) {
                        month = dobNumbers[1];
                    }
                    if (dobNumbers.length >= 3) {
                        day = dobNumbers[2];
                    }

                    let birthdays = birthdaysBetweenDates(programStart, programEnd, new Date(year, month, day));
                    birthdays.forEach((d: Date) => messages.push({
                        text: birthdayMessageActivityDefinition.payloadText,
                        scheduledDateTime: birthdayMessageActivityDefinition.nextOccurrenceTimeAtDate(d),
                    }));
                }
            }
        }

        //TODO: Add holidays
        messages = messages.sort((a, b) => a.scheduledDateTime < b.scheduledDateTime ? -1 : 1);
        return makeCommunicationRequests(patient, this, messages);
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
        if (!this.timingTiming?.repeat) {
            throw Error("No timing or repeat specified in ActivityDefinition")
        }
        if (this.timingTiming.repeat.periodUnit && this.timingTiming.repeat.periodUnit !== 'wk' && this.timingTiming.repeat.periodUnit !== 'd') {
            throw Error("Unhandled time unit in timingTiming");
        }

        let date = new Date();
        if (this.timingTiming.repeat.periodUnit === 'wk') {
            date.setDate(date.getDate() + 7 * this.timingTiming.repeat.period);
        } else if (this.timingTiming.repeat.periodUnit === 'd') {
            date.setDate(date.getDate() + this.timingTiming.repeat.period);
        }

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

    nextOccurrenceTimeAtDate(date: Date) {
        if (!this.timingTiming.repeat.timeOfDay) {
            throw Error("No timeOfDay given in timingTiming");
        }
        ActivityDefinition.setTimeOfDay(date, this.timingTiming);
        return date;
    }

    get payloadText() {
        return this.dynamicValue.find(
            (dynVal) => dynVal.path === "payload.contentString"
        ).expression.expression
    }
}

export async function getMessageSchedule(
  projectID: string = null
): Promise<PlanDefinition> {
  console.log("Project ID ", projectID);
  if (!projectID) return getDefaultMessageSchedule();
  const planDefinition = await import(
    `../fhir/PlanDefinition_${projectID}.json`
  ).catch((e) => {
    console.log(
      `Error occurred. Unable to load project plan definition for ${projectID} Loading the default instead.`,
      e
    );
    return getDefaultMessageSchedule();
  });
  return PlanDefinition.from(planDefinition as IPlanDefinition);
}

export function getDefaultMessageSchedule(): PlanDefinition {
    console.log("Loading the default plan definition.");
    let raw = defaultSchedule as IPlanDefinition;
    return PlanDefinition.from(raw);
}
