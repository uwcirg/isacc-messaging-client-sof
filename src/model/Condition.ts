import {ICodeableConcept, ICondition, IReference} from "@ahryman40k/ts-fhir-types/lib/R4";

export class Condition implements  ICondition {
    clinicalStatus: ICodeableConcept;
    code: ICodeableConcept;
    id: string;
    resourceType: "Condition";
    subject: IReference;
    onsetDateTime: string;



    static from(raw: any): Condition {
        if (!raw) return null;
        let c = Object.assign(new Condition(), raw);
        return c;
    }
}