import {
    BundleTypeKind,
    ICodeableConcept,
    ICommunicationRequest,
    ICommunicationRequest_Payload,
    IReference
} from "@ahryman40k/ts-fhir-types/lib/R4";
import CCPlanDefinition from "./PlanDefinition";
import CarePlan, {CarePlanActivity, Bundle} from "./CarePlan";

import {Coding} from "./CodeSystem";



class CommunicationRequest implements ICommunicationRequest {
    resourceType: "CommunicationRequest";
    id: string;
    occurrenceDateTime: string;
    payload: ICommunicationRequest_Payload[];
    recipient: IReference[];
    status: string;
    medium: ICodeableConcept[];

    get reference(): string {
        return `${this.resourceType}/${this.id}`;
    }


    constructor() {
        this.resourceType = "CommunicationRequest";
    }
}

export function makeCarePlanBundle(patient: IReference, planDefinition: CCPlanDefinition, messages: { text: string; scheduledDateTime: Date }[]): Bundle {
    let communicationRequests: CommunicationRequest[] = messages.map((message) => {
        let c = new CommunicationRequest();
        c.status = "active";
        c.payload = [{contentString: message.text}];
        c.occurrenceDateTime = message.scheduledDateTime.toISOString();
        c.recipient = [patient]; // TODO: Reference to RelatedPerson
        c.medium = [Coding.make("http://terminology.hl7.org/ValueSet/v3-ParticipationMode", "SMSWRIT")];
        return c;
    });

    let carePlan = new CarePlan("plan", "active", patient);
    carePlan.activity = communicationRequests.map((req) => CarePlanActivity.withReference(req.reference));

    let bundle: Bundle = {resourceType: "Bundle", type: BundleTypeKind._transaction, link: [], entry: [], meta: {lastUpdated: ""}};
    bundle.entry.push({resource: carePlan, fullUrl: ""});
    communicationRequests.forEach((req) => bundle.entry.push({resource: req, fullUrl: ""}));

    return bundle;
}