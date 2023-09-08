import {
    IAnnotation,
    ICodeableConcept,
    ICommunicationRequest,
    ICommunicationRequest_Payload,
    IReference
} from "@ahryman40k/ts-fhir-types/lib/R4";
import {Coding, IsaccMessageCategory, Medium} from "./CodeSystem";
import Patient from "./Patient";
import CarePlan from "./CarePlan";
import Practitioner from "./Practitioner";

export class CommunicationRequest implements ICommunicationRequest {
  resourceType: "CommunicationRequest";
  id: string;
  occurrenceDateTime: string; // ISO string
  payload: ICommunicationRequest_Payload[];
  recipient: IReference[];
  status: string;
  sender?: IReference;
  medium: ICodeableConcept[];
  category: ICodeableConcept[];
  basedOn: IReference[];
  note?: IAnnotation[];

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
    carePlan: CarePlan,
    sender: Patient | Practitioner = null,
    note: string = ""
  ) {
    return this.createNewOutgoingMessage(
      messageContent,
      patient,
      carePlan,
      IsaccMessageCategory.isaccManuallySentMessage,
      sender,
      note
    );
  }

  static createNewOutgoingMessage(
    messageContent: string,
    patient: Patient,
    carePlan: CarePlan,
    messageType: Coding,
    sender: Patient | Practitioner = null,
    note: string = ""
  ): CommunicationRequest {
    if (!messageType) {
      messageType = IsaccMessageCategory.isaccManuallySentMessage;
    }

    let c = new CommunicationRequest();
    if (carePlan && carePlan.id) {
      c.basedOn = [{ reference: carePlan.reference }];
    }
    c.category = [{ coding: [messageType] }];
    c.medium = [Medium.sms];
    c.setOccurrenceDate(new Date());
    c.recipient = [{ reference: patient.reference }];
    if (sender) c.sender = { reference: sender.reference };
    if (note) c.setNote(note);
    c.setText(messageContent);
    return c;
  }

  static isScheduledOutgoingMessage(cr: CommunicationRequest): boolean {
    return (
      cr?.category[0]?.coding[0]?.code ===
      IsaccMessageCategory.isaccScheduledMessage.code
    );
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
    return "";
  }

  setText(text: string) {
    this.payload = [{ contentString: text }];
  }

  displayNote() {
    if (!this.note) return "";
    return this.note
      .map((n: IAnnotation) => {
        return n.text;
      })
      .join("\n");
  }

  setNote(note: string) {
    let n = new Annotation();
    n.text = note;
    this.note = [n];
  }
}

class Annotation implements IAnnotation {
    text: string;
    // other props

}
