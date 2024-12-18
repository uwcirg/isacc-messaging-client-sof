//import PlanDefinition from "./PlanDefinition";
import CarePlan from "./CarePlan";

import { CommunicationRequest } from "./CommunicationRequest";

import Patient from "./Patient";
import { MessageDraft } from "../components/ScheduleSetup";
import { SystemURL } from "./CodeSystem";
import Client from "fhirclient/lib/Client";

export function makeCommunicationRequests(
  patient: Patient,
  messages: MessageDraft[]
): CommunicationRequest[] {
  return messages.map((message) => {
    return CommunicationRequest.createNewScheduledMessage(
      message.text,
      patient,
      null,
      message.scheduledDateTime
    );
  });
}

export function makeCarePlan(
  patient: Patient,
  communicationRequests: CommunicationRequest[],
  carePlanDate: Date | null
): CarePlan {
  return CarePlan.createIsaccCarePlan(
    patient,
    communicationRequests,
    carePlanDate
  );
}

export function unmarkTestPatient(
  client: Client,
  patientId: string
): Promise<any> {
  if (!client) return null;
  return client.request({
    url: `Patient/${patientId}/$meta-delete`,
    method: "POST",
    // xml version
    headers: {
      "content-type": "application/xml",
    },
    body: `<Parameters xmlns="http://hl7.org/fhir"><parameter><name value="meta"/><valueMeta><security><system value="${SystemURL.testPatientUrl}"/><code value="${Patient.TEST_PATIENT_SECURITY_CODE}"/></security></valueMeta></parameter></Parameters>`,
    // JSON version
    // headers: {
    //   "content-type": "application/json",
    // },
    // body: `{
    //   "resourceType": "Parameters",
    //   "parameter":[{
    //     "name":"meta",
    //     "valueMeta":{"security":[{"system":"${SystemURL.testPatientUrl}","code":"${Patient.TEST_PATIENT_SECURITY_CODE}"}]}
    //   }]
    // }`,
  });
}
