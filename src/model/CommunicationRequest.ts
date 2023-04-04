import {
    ICodeableConcept,
    ICommunicationRequest,
    ICommunicationRequest_Payload,
    IReference
} from "@ahryman40k/ts-fhir-types/lib/R4";
import {Coding, IsaccMessageCategory, Medium} from "./CodeSystem";
import Patient from "./Patient";
import CarePlan from "./CarePlan";

export class CommunicationRequest implements ICommunicationRequest {
  resourceType: "CommunicationRequest";
  id: string;
  occurrenceDateTime: string; // ISO string
  payload: ICommunicationRequest_Payload[];
  recipient: IReference[];
  status: string;
  medium: ICodeableConcept[];
  category: ICodeableConcept[];
  basedOn: IReference[];

  get reference(): string {
    return `${this.resourceType}/${this.id}`;
  }

  static from(raw: any): CommunicationRequest {
    if (!raw) return null;
    let a = Object.assign(new CommunicationRequest(), raw);
    return a;
  }

  constructor() {
    this.resourceType = "CommunicationRequest";
    this.status = "active";
    this.category = [{ coding: [IsaccMessageCategory.isaccScheduledMessage] }];
  }

  static createNewScheduledMessage(
    messageContent: string,
    patient: Patient,
    carePlan: CarePlan,
    occurrenceDateTime: Date
  ): CommunicationRequest {
    let c = this.createNewOutgoingMessage(
      messageContent,
      patient,
      carePlan,
      IsaccMessageCategory.isaccScheduledMessage
    );
    c.setOccurrenceDate(occurrenceDateTime);
    return c;
  }
  static createNewManualOutgoingMessage(
    messageContent: string,
    patient: Patient,
    carePlan: CarePlan
  ) {
    return this.createNewOutgoingMessage(
      messageContent,
      patient,
      carePlan,
      IsaccMessageCategory.isaccManuallySentMessage
    );
  }

  static createNewOutgoingMessage(
    messageContent: string,
    patient: Patient,
    carePlan: CarePlan,
    messageType: Coding,
    occurredDate: Date = new Date()
  ): CommunicationRequest {
    if (!messageType) {
      messageType = IsaccMessageCategory.isaccManuallySentMessage;
    }

    let c = new CommunicationRequest();
    if (carePlan) {
      c.basedOn = [{ reference: carePlan.reference }];
    }
    c.category = [{ coding: [messageType] }];
    c.medium = [Medium.sms];
    c.setOccurrenceDate(occurredDate);
    c.recipient = [{ reference: patient.reference }];
    c.setText(messageContent);
    return c;
  }

  getOccurrenceDate(): Date {
    return new Date(this.occurrenceDateTime);
  }

  setOccurrenceDate(date: Date) {
    this.occurrenceDateTime = date.toISOString();
  }

  getText(): string {
    if (this.payload) {
      return this.payload[0].contentString;
    }
    return null;
  }

  setText(text: string) {
    this.payload = [{ contentString: text }];
  }
}