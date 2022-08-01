import FhirTranslations from "../FhirTranslations";
import {ICoding, IElement, IExtension} from "@ahryman40k/ts-fhir-types/lib/R4";

export class Coding implements ICoding {
  _code?: IElement;
  _display?: IElement;
  _system?: IElement;
  _userSelected?: IElement;
  _version?: IElement;
  code?: string;
  display?: string;
  extension?: IExtension[];
  id?: string;
  system?: string;
  userSelected?: boolean;
  version?: string;


  static make(system: string, code: string) {
    let coding = new Coding();
    coding.system = system;
    coding.code = code;
    return coding;
  }

  displayLocalized() {
    return FhirTranslations.extractTranslation(this.display, this._display);
  }

  static from(raw: ICoding): Coding {
    if (!raw) return null;
    return Object.assign(new Coding(), raw);
  }

  get identifierString() {
    return `${this.system}|${this.code}`;
  }

  equals(other: any): boolean {
    if (!other) return false;
    if (!(other instanceof Coding)) return false;
    let o = other as Coding;
    return o.system === this.system && o.code === this.code;
  }
}

export const CommunicationCategory = {
  systemAnnouncement: Coding.make(
      "https://stayhome.app/CodeSystem/communication-category",
      "system-announcement")
}

export const ConsentContentClass = {
  location: Coding.make("https://stayhome.app/CodeSystem/consent-content-class",
      "location"),
  symptomsTestingConditions: Coding.make(
      "https://stayhome.app/CodeSystem/consent-content-class",
      "symptoms-testing-conditions"),
  contactInformation: Coding.make(
      "https://stayhome.app/CodeSystem/consent-content-class",
      "contact-information"),
  all: Coding.make("https://stayhome.app/CodeSystem/consent-content-class",
      "location_contact-information_symptoms-testing-conditions"),
}

export const ConsentScope = {
  patientPrivacy: Coding.make(
      "http://terminology.hl7.org/CodeSystem/consentscope", "patient-privacy")
}

export const ConsentCategory = {
  patientConsent: Coding.make("http://loinc.org", "59284-0")
}

type OrganizationReferenceType = {
}

export const OrganizationReference: OrganizationReferenceType = {
}



export const IsaccCarePlanCategory = {
  isaccMessagePlan: Coding.make("https://isacc.app/CodeSystem/careplan-type", "isacc-message-plan")
}
export const IsaccMessageCategory = {
  isaccScheduledMessage: Coding.make("https://isacc.app/CodeSystem/communication-request-type", "isacc-scheduled-message")
}
export const RelationshipCategory = {
  emergencyContact: Coding.make("http://hl7.org/fhir/ValueSet/patient-contactrelationship", "C")
}