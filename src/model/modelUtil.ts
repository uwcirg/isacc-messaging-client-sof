import PlanDefinition from "./PlanDefinition";
import CarePlan from "./CarePlan";

import {CommunicationRequest} from "./CommunicationRequest";

import Patient from "./Patient";
import {MessageDraft} from "../components/ScheduleSetup";
import { SystemURL } from "./CodeSystem";
import Client from "fhirclient/lib/Client";


export function makeCommunicationRequests(patient: Patient, planDefinition: PlanDefinition, messages: MessageDraft[]): CommunicationRequest[] {
    return messages.map((message) => {
        let patientName = patient.name[0].given[0];
        let str = message.text.replace("{name}", patientName);

        return CommunicationRequest.createNewScheduledMessage(str, patient, null, message.scheduledDateTime);
    });
}

export function makeCarePlan(planDefinition: PlanDefinition, patient: Patient, communicationRequests: CommunicationRequest[]): CarePlan {
    return CarePlan.createIsaccCarePlan(patient, planDefinition, communicationRequests);
}

export function unmarkTestPatient(
  client: Client,
  patientId: string
): Promise<any> {
  if (!client) return null;
  return client.request({
    url: `Patient/${patientId}/$meta-delete`,
    method: "POST",
    headers: {
      "content-type": "application/xml",
    },
    body: `<Parameters xmlns="http://hl7.org/fhir"><parameter><name value="meta"/><valueMeta><security><system value="${SystemURL.testPatientUrl}"/><code value="${Patient.TEST_PATIENT_SECURITY_CODE}"/></security></valueMeta></parameter></Parameters>`,
});
}
