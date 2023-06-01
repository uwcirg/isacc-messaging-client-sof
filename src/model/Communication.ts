import FhirTranslations from "../FhirTranslations";
import {
    IAnnotation,
    IAttachment,
    ICodeableConcept,
    ICommunication,
    ICommunication_Payload,
    IElement,
    IExtension,
    IIdentifier,
    INarrative,
    IReference,
    IResourceList
} from "@ahryman40k/ts-fhir-types/lib/R4";
import { Coding, ExtensionUrl, IsaccMessageCategory } from "./CodeSystem";
import Patient from "./Patient";
import CarePlan from "./CarePlan";
import Practitioner from "./Practitioner";


export default class Communication implements ICommunication {
  _implicitRules?: IElement;
  _instantiatesUri?: IElement[];
  _language?: IElement;
  _priority?: IElement;
  _received?: IElement;
  _sent?: IElement;
  _status?: IElement;
  about?: IReference[];
  basedOn?: IReference[];
  category?: ICodeableConcept[];
  contained?: IResourceList[];
  encounter?: IReference;
  extension?: IExtension[];
  id?: string;
  identifier?: IIdentifier[];
  implicitRules?: string;
  inResponseTo?: IReference[];
  instantiatesCanonical?: string[];
  instantiatesUri?: string[];
  language?: string;
  medium?: ICodeableConcept[];
  meta?: any;
  modifierExtension?: IExtension[];
  note?: IAnnotation[];
  partOf?: IReference[];
  priority?: string;
  reasonCode?: ICodeableConcept[];
  reasonReference?: IReference[];
  received?: string;
  recipient?: IReference[];
  resourceType: "Communication";
  sender?: IReference;
  sent?: string;
  status?: string;
  statusReason?: ICodeableConcept;
  subject?: IReference;
  text?: INarrative;
  topic?: ICodeableConcept;

  payload?: CommunicationPayload[];

  static from(communication: any): Communication {
    if (!communication) return null;
    let c: Communication = Object.assign(new Communication(), communication);
    c.payload = c.payload?.map((p: CommunicationPayload) =>
      CommunicationPayload.from(p)
    );
    return c;
  }

  static tempCommunicationFrom(communicationRequest: any): Communication {
    let c = Communication.from(communicationRequest);
    c.sent = null;
    return c;
  }

  static create(
    messageContent: string,
    patient: Patient,
    carePlan: CarePlan,
    sentDateTimeString: string,
    receivedDateTimeString: string,
    messageType: Coding,
    note: string,
    sender: Practitioner | Patient = null
  ): Communication {
    if (!messageType) {
      messageType = IsaccMessageCategory.isaccManuallySentMessage;
    }
    let c = new Communication();
    c.resourceType = "Communication";
    if (carePlan) {
      c.partOf = [{ reference: carePlan.reference }];
    }
    c.category = [{ coding: [messageType] }];
    if (sentDateTimeString) c.sent = sentDateTimeString;
    if (receivedDateTimeString) c.received = receivedDateTimeString;
    if (note) c.setNote(note);
    c.subject = { reference: patient.reference };
    c.setText(messageContent);
    if (sender) c.sender = {reference: sender.reference};
    return c;
  }
  
  displayText() {
    if (!this.payload) return null;
    return this.payload
      .map((p: CommunicationPayload) => {
        return p.contentStringLocalized();
      })
      .join("\n");
  }

  setText(text: string) {
    let c = new CommunicationPayload();
    c.contentString = text;
    this.payload = [c];
  }

  displayNote() {
    if (!this.note) return "";
    return this.note.map((n: IAnnotation) => {
        return n.text
    }).join("\n");
  }

  setNote(note: string) {
    let n = new Annotation();
    n.text = note;
    this.note = [n];
  }

  getThemes(): string[] {
    let themes: string[] = this.extension
      ?.filter(
        (extension: IExtension) =>
          extension.url === ExtensionUrl.messageThemeUrl
      )
      ?.map((extension: IExtension) => extension.valueString);
    if (themes) return themes;
    return [];
  }
}

class CommunicationPayload implements ICommunication_Payload {
    _contentString?: IElement;
    contentAttachment?: IAttachment;
    contentReference?: IReference;
    contentString?: string;
    extension?: IExtension[];
    id?: string;
    modifierExtension?: IExtension[];

    static from(payload: ICommunication_Payload): CommunicationPayload {
        if (!payload) return null;
        return Object.assign(new CommunicationPayload(), payload);
    }

    contentStringLocalized() {
        return FhirTranslations.extractTranslation(this.contentString, this._contentString);
    }
}

class Annotation implements IAnnotation {
    text: string;
    // other props

}