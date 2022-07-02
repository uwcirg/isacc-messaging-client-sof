import FhirTranslations from "../FhirTranslations";
import {
  IAnnotation,
  IAttachment, ICodeableConcept,
  ICommunication, ICommunication_Payload,
  IElement,
  IExtension, IIdentifier, IMeta, INarrative, IReference, IResourceList
} from "@ahryman40k/ts-fhir-types/lib/R4";

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
  meta?: IMeta;
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


  static from(communication: ICommunication): Communication {
    if (!communication) return null;
    let c:Communication = Object.assign(new Communication(), communication);
    c.payload = c.payload.map((p)=>CommunicationPayload.from(p));
    return c;
  }

  displayText() {
    return this.payload.map((p) => {
      return p.contentStringLocalized()
    }).join("\n");
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

  static from(payload: ICommunication_Payload) : CommunicationPayload {
    if (!payload) return null;
    return Object.assign(new CommunicationPayload(), payload);
  }

  contentStringLocalized() {
    return FhirTranslations.extractTranslation(this.contentString, this._contentString);
  }
}