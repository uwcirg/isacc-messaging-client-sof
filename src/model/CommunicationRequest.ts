import {
    ICodeableConcept,
    ICommunicationRequest,
    ICommunicationRequest_Payload,
    IReference
} from "@ahryman40k/ts-fhir-types/lib/R4";
import {IsaccMessageCategory, Medium} from "./CodeSystem";
import Patient from "./Patient";
import CarePlan from "./CarePlan";

export class CommunicationRequest implements ICommunicationRequest {
    resourceType: "CommunicationRequest";
    id: string;
    occurrenceDateTime: string;
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
        this.category = [{coding: [IsaccMessageCategory.isaccScheduledMessage]}]
    }

    static createNewOutgoingMessage(messageContent: string, patient: Patient, carePlan: CarePlan): CommunicationRequest {
        let c = new CommunicationRequest();
        c.basedOn = [{reference: carePlan.reference}];
        c.status = "active";
        c.category = [{coding: [IsaccMessageCategory.isaccManuallySentMessage]}];
        c.medium = [Medium.sms];
        c.occurrenceDateTime = new Date().toISOString();
        c.recipient = [{reference: patient.reference}];
        c.payload = [{contentString: messageContent}];
        return c;
    }
}