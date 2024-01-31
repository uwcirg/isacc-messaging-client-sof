import {
  ContactPointSystemKind,
  HumanNameUseKind,
  IAddress,
  IAttachment,
  ICodeableConcept,
  ICoding,
  IContactPoint,
  IElement,
  IExtension,
  IHumanName,
  IIdentifier,
  IMeta,
  INarrative,
  IPatient,
  IPatient_Communication,
  IPatient_Contact,
  IPatient_Link,
  IPeriod,
  IReference,
  IResourceList,
  PatientGenderKind
} from "@ahryman40k/ts-fhir-types/lib/R4";
import {ExtensionUrl, RelationshipCategory, SystemURL} from "./CodeSystem";

export default class Patient implements IPatient {
  _active?: IElement;
  _birthDate?: IElement;
  _deceasedBoolean?: IElement;
  _deceasedDateTime?: IElement;
  _gender?: IElement;
  _implicitRules?: IElement;
  _language?: IElement;
  _multipleBirthBoolean?: IElement;
  _multipleBirthInteger?: IElement;
  active?: boolean;
  address?: IAddress[];
  birthDate?: string;
  communication?: IPatient_Communication[];
  contact?: IPatient_Contact[];
  contained?: IResourceList[];
  deceasedBoolean?: boolean;
  deceasedDateTime?: string;
  extension?: IExtension[];
  gender?: PatientGenderKind;
  generalPractitioner?: IReference[];
  id?: string;
  identifier?: IIdentifier[];
  implicitRules?: string;
  language?: string;
  link?: IPatient_Link[];
  managingOrganization?: IReference;
  maritalStatus?: ICodeableConcept;
  meta?: IMeta;
  modifierExtension?: IExtension[];
  multipleBirthBoolean?: boolean;
  multipleBirthInteger?: number;
  name?: IHumanName[];
  photo?: IAttachment[];
  resourceType: "Patient";
  telecom?: IContactPoint[];
  text?: INarrative;

  static from(raw: IPatient): Patient {
    if (!raw) return null;
    return Object.assign(new Patient(), raw);
  }

  static TEST_PATIENT_SECURITY_CODE = "HTEST";
  static UNSET_LAST_UNFOLLOWED_DATETIME = "2035-01-01T00:00:00Z";
  static DEEP_PAST_NEXT_MESSAGE_DATETIME = "1975-01-01T00:00:00Z";

  get smsContactPoint(): string {
    let p = this.telecom?.filter(
      (t: IContactPoint) => t.system === ContactPointSystemKind._sms
    )[0];
    return p ? p.value : null;
  }

  set smsContactPoint(phone: string) {
    if (!this.telecom) {
      this.telecom = [];
    }

    let smsContactPoint: IContactPoint = this.telecom.filter(
      (t: IContactPoint) => t.system === ContactPointSystemKind._sms
    )[0];

    if (!smsContactPoint) {
      smsContactPoint = {
        system: ContactPointSystemKind._sms
      };
      this.telecom.push(smsContactPoint);
    }
    const smsPeriod: IPeriod = {
      start: new Date().toISOString(),
    };
    smsContactPoint.period = smsPeriod;
    smsContactPoint.value = phone;
  }

  get userID(): string {
    let o = this.identifier?.filter(
      (i: IIdentifier) => i.system === SystemURL.userIdUrl
    )[0];
    return o ? o.value : null;
  }

  set userID(id: string) {
    if (!this.identifier) {
      this.identifier = [];
    }

    let existingIdentifier = this.identifier?.filter(
      (i: IIdentifier) => i.system === SystemURL.userIdUrl
    )[0];

    if (!existingIdentifier) {
      existingIdentifier = { system: SystemURL.userIdUrl };
      this.identifier.push(existingIdentifier);
    }

    existingIdentifier.value = id;
  }

  get preferredName(): string {
    let o = this.name?.filter((i: IHumanName) => i.use === "usual")[0];
    return o && o.given != null && o.given.length > 0 ? o.given[0] : null;
  }
  set preferredName(value: string) {
    if (this.name == null || this.name.length === 0) this.name = [{}];
    let existingPreferredName = this.name?.filter(
      (i: IHumanName) => i.use === HumanNameUseKind._usual
    )[0];

    if (!existingPreferredName) {
      existingPreferredName = { use: HumanNameUseKind._usual };
      this.name.push(existingPreferredName);
    }

    if (!existingPreferredName.given) existingPreferredName.given = [];

    existingPreferredName.given[0] = value;
  }

  get firstName(): string {
    return this.name != null &&
      this.name.length > 0 &&
      this.name[0].given != null &&
      this.name[0].given.length > 0
      ? this.name[0].given[0]
      : null;
  }

  get reference(): string {
    return `${this.resourceType}/${this.id}`;
  }

  set firstName(text: string) {
    if (this.name == null || this.name.length === 0) this.name = [{}];
    if (this.name[0].given == null || this.name[0].given.length === 0)
      this.name[0].given = [""];
    this.name[0].given[0] = text;
  }

  get lastName(): string {
    return this.name != null &&
      this.name.length > 0 &&
      this.name[0].family != null
      ? this.name[0].family
      : null;
  }

  set lastName(text: string) {
    if (this.name == null || this.name.length === 0) this.name = [{}];
    this.name[0].family = text;
  }

  get fullNameDisplay(): string {
    let names: Array<string> = [];
    if (this.firstName && this.firstName.length > 0) names.push(this.firstName);
    if (this.lastName != null && this.lastName.length > 0)
      names.push(this.lastName);
    return names.join(" ");
  }

  get addressText(): string {
    if (!this.address || !this.address.length) return "";
    return this.address.find((a) => a.use === "home")?.text;
  }

  set addressText(text: string) {
    if (this.address == null) this.address = [];
    let address: IAddress = this.address.find((a) => a.use === "home");
    if (address == null) {
      address = { use: "home" } as IAddress;
      this.address.push(address);
    }
    address.text = text;
  }

  get homeZip(): string {
    return this.address != null && this.address.length > 0
      ? this.address.find((a) => a.use === "home")?.postalCode
      : null;
  }

  set homeZip(text: string) {
    if (this.address == null) this.address = [];
    let address: IAddress = this.address.find((a) => a.use === "home");
    if (address == null) {
      address = { use: "home" } as IAddress;
      this.address.push(address);
    }
    address.postalCode = text;
  }

  get secondZip(): string {
    return this.address != null && this.address.length > 0
      ? this.address.find((a) => a.use !== "home")?.postalCode
      : null;
  }

  set secondZip(text: string) {
    if (this.address == null) this.address = [];
    let address: IAddress = this.address.find((a) => a.use !== "home");
    if (address == null) {
      address = {} as IAddress;
      this.address.push(address);
    }
    address.postalCode = text;
  }

  addEmergencyContact(
    name: string = null,
    phoneNumber: string = null,
    email: string = null
  ) {
    if (!(name || phoneNumber || email)) return;
    if (this.contact == null) this.contact = [];
    let contactToAdd: IPatient_Contact = {} as IPatient_Contact;
    if (name) {
      contactToAdd.name = {
        text: name,
      } as IHumanName;
    }
    if (phoneNumber) {
      contactToAdd.telecom = [];
      contactToAdd.telecom.push({
        system: ContactPointSystemKind._phone,
        value: phoneNumber,
      });
    }
    if (email) {
      if (!contactToAdd.telecom) contactToAdd.telecom = [];
      contactToAdd.telecom.push({
        system: ContactPointSystemKind._email,
        value: email,
      });
    }
    contactToAdd.relationship = [
      {
        coding: [RelationshipCategory.emergencyContact],
      },
    ];
    this.contact.push(contactToAdd);
  }

  removeEmergencyContact(index: number) {
    if (index != null) {
      let emergencyContact = this.getEmergencyContacts();
      if (emergencyContact) {
        emergencyContact?.splice(index, 1);
        if (!this.contact) this.contact = [];
        const nonEmergencyContacts = this.contact.filter(
          (contact: IPatient_Contact) =>
            !contact.relationship ||
            contact.relationship.find((relationship: ICodeableConcept) =>
              relationship.coding?.find(
                (coding: ICoding) =>
                  coding.code !== RelationshipCategory.emergencyContact.code
              )
            )
        );
        this.contact = [...nonEmergencyContacts, ...emergencyContact];
      }
    }
  }

  getEmergencyContacts(): IPatient_Contact[] {
    return this.contact?.filter((contact: IPatient_Contact) =>
      contact.relationship?.find((relationship: ICodeableConcept) =>
        relationship.coding?.find(
          (coding: ICoding) =>
            coding.code === RelationshipCategory.emergencyContact.code
        )
      )
    );
  }

  get studyStartDate(): string {
    let o = this.extension?.filter(
      (i: IExtension) => i.url === ExtensionUrl.studyStartDateUrl
    )[0];
    return o ? o.valueDate : null;
  }

  set studyStartDate(value: string | Date) {
    const valueToSet =
      value instanceof Date ? value.toISOString().slice(0, 10) : value;
    if (!this.extension) {
      this.extension = [];
    }

    let existingStudyDate = this.extension?.filter(
      (i: IExtension) => i.url === ExtensionUrl.studyStartDateUrl
    )[0];

    if (!existingStudyDate) {
      existingStudyDate = {
        url: ExtensionUrl.studyStartDateUrl,
        valueDate: valueToSet,
      };
      this.extension.push(existingStudyDate);
    }

    existingStudyDate.valueDate = valueToSet;
  }

  get studyStatus(): string {
    let o = this.extension?.filter(
      (i: IExtension) => i.url === ExtensionUrl.studyStatusUrl
    )[0];
    return o ? o.valueString : null;
  }

  set studyStatus(value: string) {
    if (!this.extension) {
      this.extension = [];
    }

    let existingStudyStatus = this.extension?.filter(
      (i: IExtension) => i.url === ExtensionUrl.studyStatusUrl
    )[0];

    if (!existingStudyStatus) {
      existingStudyStatus = {
        url: ExtensionUrl.studyStatusUrl,
      };
      this.extension.push(existingStudyStatus);
    }

    existingStudyStatus.valueString = value;
  }

  get pronouns(): string {
    let o = this.extension?.filter(
      (i: IExtension) => i.url === ExtensionUrl.pronounsUrl
    )[0];
    return o ? o.valueString : null;
  }

  set pronouns(value: string) {
    if (!this.extension) {
      this.extension = [];
    }

    let existingPronouns = this.extension?.filter(
      (i: IExtension) => i.url === ExtensionUrl.pronounsUrl
    )[0];

    if (!existingPronouns) {
      existingPronouns = {
        url: ExtensionUrl.pronounsUrl,
      };
      this.extension.push(existingPronouns);
    }

    existingPronouns.valueString = value;
  }

  get nextScheduledMessageDateTime(): string {
    const targetExtensions = this.extension?.filter(
      (i: IExtension) => i.url === ExtensionUrl.nextScheduledgMessageDateTimeUrl
    );
    if (!targetExtensions || !targetExtensions.length) return null;
    // in case there are multiple next scheduled message date/time extensions
    // sort extensions so latest date/time is the first and return that
    targetExtensions.sort(
      (a, b) =>
        new Date(b.valueDateTime).getTime() -
        new Date(a.valueDateTime).getTime()
    );
    return targetExtensions[0].valueDateTime;
  }

  set nextScheduledMessageDateTime(value: string) {
    if (!value) {
      return;
    }
    if (!this.extension) {
      this.extension = [];
    }
    const updatedExtensions: IExtension[] = this.extension.filter(
      (i: IExtension) => i.url !== ExtensionUrl.nextScheduledgMessageDateTimeUrl
    );
    this.extension = updatedExtensions;
    this.extension.push({
      url: ExtensionUrl.nextScheduledgMessageDateTimeUrl,
      valueDateTime: value,
    });
  }

  get lastUnfollowedMessageDateTime(): string {
    let targetExtensions = this.extension?.filter(
      (i: IExtension) => i.url === ExtensionUrl.lastUnfollowedMessageDateTimeUrl
    );
    if (!targetExtensions || !targetExtensions.length) return null;
    // in case there are multiple last unfollowed message date/time extensions
    // sort extensions so latest date/time is the first and return that
    targetExtensions.sort(
      (a, b) =>
        new Date(b.valueDateTime).getTime() -
        new Date(a.valueDateTime).getTime()
    );
    return targetExtensions[0].valueDateTime;
  }

  set lastUnfollowedMessageDateTime(value: string) {
    if (!value) {
      return;
    }
    if (!this.extension) {
      this.extension = [];
    }
    let updatedExtensions: IExtension[] = this.extension?.filter(
      (i: IExtension) => i.url !== ExtensionUrl.lastUnfollowedMessageDateTimeUrl
    );
    this.extension = updatedExtensions;
    this.extension.push({
      url: ExtensionUrl.lastUnfollowedMessageDateTimeUrl,
      valueDateTime: value,
    });
  }

  get isTest(): boolean {
    let o = this.meta?.security?.filter(
      (i: ICoding) =>
        i.system === SystemURL.testPatientUrl &&
        String(i.code).toUpperCase() === Patient.TEST_PATIENT_SECURITY_CODE
    )[0];
    return !!o;
  }

  set isTest(value: boolean) {
    if (!this.meta) this.meta = {} as IMeta;
    if (!value) {
      this.meta.security = null;
      return;
    }
    if (!this.meta.security) {
      this.meta.security = [];
    }
    let existingMetaSecurity = this.meta.security?.filter(
      (i: ICoding) =>
        i?.system === SystemURL.testPatientUrl &&
        i?.code === Patient.TEST_PATIENT_SECURITY_CODE
    )[0];

    if (!existingMetaSecurity) {
      existingMetaSecurity = {
        system: SystemURL.testPatientUrl,
        code: Patient.TEST_PATIENT_SECURITY_CODE,
      };
      this.meta.security.push(existingMetaSecurity);
    }
  }

  isActive () {
    if (typeof this.active === "undefined") return true;
    return this.active;
  }
}
