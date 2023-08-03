import PlanDefinition from "./PlanDefinition";
import CarePlan from "./CarePlan";
import {CommunicationRequest} from "./CommunicationRequest";

import Patient from "./Patient";
import {MessageDraft} from "../components/ScheduleSetup";


export function makeCommunicationRequests(patient: Patient,  messages: MessageDraft[]): CommunicationRequest[] {
    return messages.map((message) => {
        let patientName = patient.name[0].given[0];
        let str = message.text.replace("{name}", patientName);

        return CommunicationRequest.createNewScheduledMessage(str, patient, null, message.scheduledDateTime);
    });
}

export function makeCarePlan(planDefinition: PlanDefinition, patient: Patient, communicationRequests: CommunicationRequest[]): CarePlan {
    return CarePlan.createIsaccCarePlan(patient, planDefinition, communicationRequests);
}
