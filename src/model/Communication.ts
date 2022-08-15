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
import CarePlan from "./CarePlan";
import Patient from "./Patient";
import {ExtensionUrl, IsaccMessageCategory, Medium} from "./CodeSystem";

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
        c.payload = c.payload.map((p: CommunicationPayload) => CommunicationPayload.from(p));
        return c;
    }

    displayText() {
        return this.payload.map((p: CommunicationPayload) => {
            return p.contentStringLocalized()
        }).join("\n");
    }

    static createNewOutgoingMessage(messageContent: string, patient: Patient, carePlan: CarePlan): Communication {
        let c = new Communication();
        c.resourceType = "Communication";
        c.partOf = [{reference: carePlan.reference}];
        c.status = "completed";
        c.category = [{coding: [IsaccMessageCategory.isaccManuallySentMessage]}];
        c.medium = [Medium.sms];
        c.sent = new Date().toISOString();// TODO: Update to the actual time
        c.recipient = [{reference: patient.reference}];
        c.payload = [CommunicationPayload.from({contentString: messageContent})];
        return c;
    }

    getThemes(): string[] {
        let themes: string[] = this.extension?.filter((extension: IExtension) => extension.url === ExtensionUrl.messageThemeUrl)?.map((extension: IExtension) => extension.valueString);
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