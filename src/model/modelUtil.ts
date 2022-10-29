import PlanDefinition from "./PlanDefinition";
import CarePlan, {CarePlanActivity} from "./CarePlan";

import {Medium} from "./CodeSystem";
import {CommunicationRequest} from "./CommunicationRequest";

import Patient from "./Patient";
import {MessageDraft} from "../components/ScheduleSetup";


export function makeCommunicationRequests(patient: Patient, planDefinition: PlanDefinition, messages: MessageDraft[]): CommunicationRequest[] {
    return messages.map((message) => {
        let patientName = patient.name[0].given[0];
        let str = message.text.replace("{name}", patientName);

        let c = new CommunicationRequest();
        c.payload = [{contentString: str}];
        c.occurrenceDateTime = message.scheduledDateTime.toISOString();
        c.recipient = [{reference: patient.reference}]; // TODO: Reference to RelatedPerson
        c.medium = [Medium.sms];
        return c;
    });
}

export function makeCarePlan(planDefinition: PlanDefinition, patient: Patient, communicationRequests: CommunicationRequest[], patientNote: string): CarePlan {
    let activities = communicationRequests.map((req) => CarePlanActivity.withReference(req.reference));
    let carePlan = CarePlan.createIsaccCarePlan(patient, planDefinition, activities);
    carePlan.description = patientNote;
    return carePlan;
}
