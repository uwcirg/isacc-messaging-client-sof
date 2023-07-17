import {ICodeableConcept, ICoding, IObservation, IQuantity, IReference} from "@ahryman40k/ts-fhir-types/lib/R4";

export class Observation implements IObservation {
    code: ICodeableConcept;
    id: string;
    resourceType: "Observation";
    subject: IReference;
    valueCodeableConcept: ICodeableConcept;
    valueQuantity: IQuantity;
    effectiveDateTime?: string;

    get reference(): string {
        return `${this.resourceType}/${this.id}`;
    }

    static from(raw: any): Observation {
        if (!raw) return null;
        let a = Object.assign(new Observation(), raw);
        return a;
    }

    static PHQ9_OBS_CODE = "44261-6";
    static CSS_OBS_CODE = "93373-9";

    static createPHQ9Observation(value: ICoding, patientId: string) {
        return Observation.create(
            this.PHQ9_OBS_CODE,
            "http://loinc.org",
            "PHQ9 severity",
            value,
            patientId
        );
    }

    static createCSSObservation(value: ICoding, patientId: string) {
        return Observation.create(
            this.CSS_OBS_CODE,
            "http://loinc.org",
            "C-SSRS severity",
            value,
            patientId
        );
    }

    static create(code: string, system: string, display: string, value: ICoding, patientId: string) : Observation {
        const o = new Observation();
        if (code) {
            o.code = {
                coding: [
                    {
                        system : system,
                        code: code,
                        display: display
                    }
                ]
            }
        }
        if (value) {
            o.valueCodeableConcept = {
                coding: [
                    value
                ]
            }
        }
        o.subject = {
            reference : "Patient/"+patientId
        };
        o.effectiveDateTime = (new Date()).toISOString();
        return o;
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
        // if (this.valueQuantity){
        //     return `${this.valueQuantity.value}`;
        // }
        console.log(`Malformed Observation value `, this);
        return null;
    }

}