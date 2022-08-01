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

    get reference(): string {
        return `${this.resourceType}/${this.id}`;
    }

    resourceType: "PlanDefinition";
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

        if (this.timingTiming.repeat.timeOfDay.length > 1) {
            throw Error("More than one timeOfDay in timingTiming");
        }

        const components: Array<string> = this.timingTiming.repeat.timeOfDay[0].split(":");
        const hours = parseFloat(components[0]) * 60 * 60 * 1000;
        const minutes = parseFloat(components[1]) * 60 * 1000;
        const seconds = parseFloat(components[1]) * 1000;
        date.setTime(hours + minutes + seconds);

        return date;
    }

}

export function getDefaultMessageSchedule(): PlanDefinition {
    let raw = defaultSchedule as IPlanDefinition;
    return PlanDefinition.from(raw);
}
