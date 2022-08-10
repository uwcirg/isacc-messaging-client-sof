import {ICodeableConcept, IObservation, IQuantity, IReference} from "@ahryman40k/ts-fhir-types/lib/R4";

export class Observation implements IObservation {
    code: ICodeableConcept;
    id: string;
    resourceType: "Observation";
    subject: IReference;
    valueCodeableConcept: ICodeableConcept;
    valueQuantity: IQuantity;

    get reference(): string {
        return `${this.resourceType}/${this.id}`;
    }

    static from(raw: any): Observation {
        if (!raw) return null;
        let a = Object.assign(new Observation(), raw);
        return a;
    }

    constructor() {
        this.resourceType = "Observation";
    }

    get valueDisplay(): string {
        if (this.valueCodeableConcept) {
            // just use the first one.
            let coding = this.valueCodeableConcept.coding[0];
            if (coding.display) {
                return coding.display;
            }
            return coding.code;
        }
        if (this.valueQuantity){
            return `${this.valueQuantity.value}`;
        }
        throw new Error(`Malformed Observation value: ${this}`);
    }

}