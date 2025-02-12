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


    static make(system: string, code: string, display: string =  null) {
        let coding = new Coding();
        coding.system = system;
        coding.code = code;
        if (display) coding.display = display;
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
        if (!(this.instanceOfCoding(other))) return false;
        let o = other as Coding;
        return o.system === this.system && o.code === this.code;
    }

    instanceOfCoding(object: any): object is Coding {
        return 'system' in object && 'code' in object;
    }
}

export const IsaccCarePlanCategory = {
    isaccMessagePlan: Coding.make("https://isacc.app/CodeSystem/careplan-type", "isacc-message-plan")
}
export const IsaccMessageCategory = {
  isaccScheduledMessage: Coding.make(
    "https://isacc.app/CodeSystem/communication-request-type",
    "isacc-scheduled-message"
  ),
  isaccAutoSentMessage: Coding.make(
    "https://isacc.app/CodeSystem/communication-type",
    "isacc-auto-sent-message"
  ),
  isaccManuallySentMessage: Coding.make(
    "https://isacc.app/CodeSystem/communication-type",
    "isacc-manually-sent-message"
  ),
  isaccReceivedMessage: Coding.make(
    "https://isacc.app/CodeSystem/communication-type",
    "isacc-received-message"
  ),
  isaccNonSMSMessage: Coding.make(
    "https://isacc.app/CodeSystem/communication-type",
    "isacc-non-sms-message"
  ),
  isaccComment: Coding.make(
    "https://isacc.app/CodeSystem/communication-type",
    "isacc-comment"
  ),
  isaccMarkedAsResolved: Coding.make(
    "https://isacc.app/CodeSystem/communication-type",
    "isacc-message-resolved-no-send"
  )
};

export const RelationshipCategory = {
    emergencyContact: Coding.make("http://hl7.org/fhir/ValueSet/patient-contactrelationship", "C", "Emergency Contact")
}

export const Medium = {
  sms: Coding.make(
    "http://terminology.hl7.org/ValueSet/v3-ParticipationMode",
    "SMSWRIT"
  )
};

export const PHQ9SeverityCategories : any = {
  low: Coding.make("http://loinc.org", "LA9194-7", "low"),
  medium: Coding.make("http://loinc.org", "LA6751-7", "medium"),
  high: Coding.make("http://loinc.org", "LA9193-9", "high"),
  unknown: Coding.make("http://loinc.org", "LA4489-6", "unknown"),
}

export const CSSAnswerCategories : any = {
  low: Coding.make("http://loinc.org", "LA9194-7", "low"),
  medium: Coding.make("http://loinc.org", "LA6751-7", "medium"),
  high: Coding.make("http://loinc.org", "LA9193-9", "high"),
  unknown: Coding.make("http://loinc.org", "LA4489-6", "unknown"),
}

export const ExtensionUrl = {
    messageThemeUrl: "isacc.app/message-theme",
    studyStartDateUrl: "isacc.app/study-start-date",
    studyStatusUrl: "isacc.app/study-status",
    pronounsUrl: "http://hl7.org/fhir/StructureDefinition/individual-genderIdentity",
    nextScheduledgMessageDateTimeUrl: "http://isacc.app/date-time-of-next-outgoing-message",
    lastUnfollowedMessageDateTimeUrl: "http://isacc.app/time-of-last-unfollowedup-message"
}

export const SystemURL = {
  userIdUrl : "http://isacc.app/user-id",
  testPatientUrl: "http://terminology.hl7.org/CodeSystem/v3-ActReason"
}
