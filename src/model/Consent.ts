import {Coding, ConsentCategory, ConsentScope} from "./CodeSystem";
import {
  Consent_ProvisionTypeKind,
  ConsentStatusKind,
  IAttachment,
  ICodeableConcept,
  ICoding,
  IConsent, IConsent_Actor, IConsent_Data,
  IConsent_Policy,
  IConsent_Verification,
  IElement,
  IExtension,
  IIdentifier,
  IMeta,
  INarrative,
  IPatient,
  IPeriod,
  IReference,
  IResourceList
} from "@ahryman40k/ts-fhir-types/lib/R4";
import {IConsent_Provision} from "@ahryman40k/ts-fhir-types/lib/R4/Resource/RTTI_Consent_Provision";

export class Consent implements IConsent {
  _dateTime?: IElement;
  _implicitRules?: IElement;
  _language?: IElement;
  _status?: IElement;
  category: ICodeableConcept[];
  contained?: IResourceList[];
  dateTime?: string;
  extension?: IExtension[];
  id?: string;
  identifier?: IIdentifier[];
  implicitRules?: string;
  language?: string;
  meta?: IMeta;
  modifierExtension?: IExtension[];
  organization?: IReference[];
  patient?: IReference;
  performer?: IReference[];
  policy?: IConsent_Policy[];
  policyRule?: ICodeableConcept;
  resourceType: "Consent";
  scope: ICodeableConcept;
  sourceAttachment?: IAttachment;
  sourceReference?: IReference;
  status?: ConsentStatusKind;
  text?: INarrative;
  verification?: IConsent_Verification[];

  provision: Provision;

  static make(patient: IPatient, organization: IReference, contentClass: ICoding,
              type: Consent_ProvisionTypeKind): Consent {
    let consent = new Consent();
    consent.status = ConsentStatusKind._active;
    consent.scope = {coding: [ConsentScope.patientPrivacy]};
    consent.category = [{coding: [ConsentCategory.patientConsent]}];
    consent.patient = {reference: `${patient.resourceType}/${patient.id}`};
    consent.organization = [organization];
    consent.provision = {
      class: [Coding.from(contentClass)],
      type: type,
      period: {start: new Date().toISOString()}
    };
    return consent;
  }
  // STU3 did not have provision
  static from(raw: any): Consent {
    if (!raw) return null;
    let c = Object.assign(new Consent(), raw);
    c.provision = Provision.from(c.provision);
    return c;
  }
}

class Provision implements IConsent_Provision {
  _type?: IElement;
  action?: ICodeableConcept[];
  actor?: IConsent_Actor[];
  class?: Coding[];
  code?: ICodeableConcept[];
  data?: IConsent_Data[];
  dataPeriod?: IPeriod;
  extension?: IExtension[];
  id?: string;
  modifierExtension?: IExtension[];
  period?: IPeriod;
  provision?: IConsent_Provision[];
  purpose?: ICoding[];
  securityLabel?: ICoding[];
  type?: Consent_ProvisionTypeKind;


  static from(raw: IConsent): Consent {
    if (!raw) return null;
    return Object.assign(new Consent(), raw);
  }

  static make(type: Consent_ProvisionTypeKind, provisionClass: Coding[], period: IPeriod): Provision {
    let provision = new Provision();
    provision.type = type;
    provision.class = provisionClass;
    provision.period = period;
    return provision;
  }
}