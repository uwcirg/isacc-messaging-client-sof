import {
    ICodeableConcept,
    ICommunicationRequest,
    ICommunicationRequest_Payload,
    IReference
} from "@ahryman40k/ts-fhir-types/lib/R4";
import {IsaccMessageCategory} from "./CodeSystem";

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
}