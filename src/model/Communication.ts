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
    c.payload = c.payload.map((p: CommunicationPayload) =>
      CommunicationPayload.from(p)
    );
    return c;
  }

  static tempCommunicationFrom(communicationRequest: any): Communication {
    let c = Communication.from(communicationRequest);
    c.sent = null;
    return c;
  }

  static createCommunication(
    messageContent: string,
    patient: Patient,
    carePlan: CarePlan,
    occurredDateTimeString: string,
    messageType: Coding
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
    c.sent = occurredDateTimeString;
    c.recipient = [{ reference: patient.reference }];
    c.setText(messageContent);
    return c;
  }
  static createNonSMSCommunication(
    messageContent: string,
    patient: Patient,
    carePlan: CarePlan,
    occurredDateTimeString: string,): Communication {
    return this.createCommunication(
        messageContent,
        patient,
        carePlan,
        occurredDateTimeString,
        IsaccMessageCategory.isaccNonSMSMessage
    );
  }

  displayText() {
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