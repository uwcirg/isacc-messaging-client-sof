import {
    BundleTypeKind,
    CarePlan_DetailStatusKind,
    IAnnotation,
    IBundle,
    IBundle_Entry, IBundle_Link,
    ICarePlan,
    ICarePlan_Activity,
    ICarePlan_Detail,
    ICodeableConcept,
    IElement,
    IExtension,
    IIdentifier,
    INarrative,
    IPeriod,
    IQuantity,
    IReference,
    IResourceList,
    ITiming
} from "@ahryman40k/ts-fhir-types/lib/R4";
// import {fhirclient} from "fhirclient/lib/types";
// import Meta = fhirclient.FHIR.Meta;



export default class CarePlan implements ICarePlan {

    _created?: IElement;
    _description?: IElement;
    _implicitRules?: IElement;
    _instantiatesUri?: IElement[];
    _intent?: IElement;
    _language?: IElement;
    _status?: IElement;
    _title?: IElement;
    activity?: CarePlanActivity[];
    addresses?: IReference[];
    author?: IReference;
    basedOn?: IReference[];
    careTeam?: IReference[];
    category?: ICodeableConcept[];
    contained?: IResourceList[];
    contributor?: IReference[];
    created?: string;
    description?: string;
    encounter?: IReference;
    extension?: IExtension[];
    goal?: IReference[];
    id?: string;
    identifier?: IIdentifier[];
    implicitRules?: string;
    instantiatesCanonical?: string[];
    instantiatesUri?: string[];
    intent?: string;
    language?: string;
    meta?: any;
    modifierExtension?: IExtension[];
    note?: IAnnotation[];
    partOf?: IReference[];
    period?: IPeriod;
    replaces?: IReference[];
    resourceType: "CarePlan";
    status?: string;
    subject: IReference;
    supportingInfo?: IReference[];
    text?: INarrative;
    title?: string;

    static from(raw: ICarePlan): CarePlan {
        if (!raw) return null;
        let c = Object.assign(new CarePlan(), raw);
        c.activity = c.activity.map((a: any) => CarePlanActivity.from(a));
        return c;
    }

    constructor(intent?: string, status?: string, subject?: IReference) {
        this.intent = intent;
        this.status = status;
        this.subject = subject;
    }


    get reference(): string {
        return `${this.resourceType}/${this.id}`;
    }
}

type Meta = {
    lastUpdated: string;
}

export class Bundle implements IBundle {
    link: IBundle_Link[];
    entry: IBundle_Entry[];
    resourceType: "Bundle";
    meta: Meta;
    type: BundleTypeKind;

}

export class CarePlanActivity implements ICarePlan_Activity {
    _fhir_comments?: IElement[];
    _id?: IElement;
    detail?: CarePlanActivityDetail;
    extension?: IExtension[];
    fhir_comments?: string[];
    id?: string;
    modifierExtension?: IExtension[];
    outcomeCodeableConcept?: ICodeableConcept[];
    outcomeReference?: IReference[];
    progress?: IAnnotation[];
    reference?: IReference;

    static from(raw: ICarePlan_Activity): CarePlanActivity {
        if (!raw) return null;
        let a = Object.assign(new CarePlanActivity(), raw);
        a.detail = CarePlanActivityDetail.from(a.detail);
        return a;
    }

    static withReference(ref: string) {
        return CarePlanActivity.from({reference: {reference: ref}});
    }
}

export class CarePlanActivityDetail implements ICarePlan_Detail {
    _description: IElement;
    _doNotPerform: IElement;
    _instantiatesUri: IElement[];
    _kind: IElement;
    _scheduledString: IElement;
    _status: IElement;
    code: ICodeableConcept;
    dailyAmount: IQuantity;
    description: string;
    doNotPerform: boolean;
    extension: IExtension[];
    goal: IReference[];
    id: string;
    instantiatesCanonical: string[];
    instantiatesUri: string[];
    kind: string;
    location: IReference;
    modifierExtension: IExtension[];
    performer: IReference[];
    productCodeableConcept: ICodeableConcept;
    productReference: IReference;
    quantity: IQuantity;
    reasonCode: ICodeableConcept[];
    reasonReference: IReference[];
    scheduledPeriod: IPeriod;
    scheduledString: string;
    scheduledTiming: ITiming;
    status: CarePlan_DetailStatusKind;
    statusReason: ICodeableConcept;

    // _description: IElement;
    // _doNotPerform: IElement;
    // _instantiatesUri: IElement[];
    // _kind: IElement;
    // _scheduledString: IElement;
    // _status: IElement;
    // code: ICodeableConcept;
    // dailyAmount: IQuantity;
    // description: string;
    // doNotPerform: boolean;
    // extension: IExtension[];
    // goal: IReference[];
    // id: string;
    // instantiatesCanonical: string[];
    // instantiatesUri: string[];
    // kind: string;
    // location: IReference;
    // modifierExtension: IExtension[];
    // performer: IReference[];
    // productCodeableConcept: ICodeableConcept;
    // productReference: IReference;
    // quantity: IQuantity;
    // reasonCode: ICodeableConcept[];
    // reasonReference: IReference[];
    // scheduledPeriod: IPeriod;
    // scheduledString: string;
    // scheduledTiming: ITiming;
    // status: CarePlan_DetailStatusKind;
    // statusReason: ICodeableConcept;


    static from(raw: ICarePlan_Detail): CarePlanActivityDetail {
        if (!raw) return null;
        return Object.assign(new CarePlanActivityDetail(), raw);
    }
}