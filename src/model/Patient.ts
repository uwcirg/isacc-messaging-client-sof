import {
  IAddress,
  IAttachment,
  ICodeableConcept,
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
  IReference,
  IResourceList,
  PatientGenderKind
} from "@ahryman40k/ts-fhir-types/lib/R4";

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
    if (this.name[0].given == null || this.name[0].given.length === 0) this.name[0].given = [""];
    this.name[0].given[0] = text;
  }

  get lastName(): string {
    return this.name != null && this.name.length > 0 && this.name[0].family != null
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
    if (this.lastName != null && this.lastName.length > 0) names.push(this.lastName);
    return names.join(" ");
  }

  get homeZip(): string {
    return this.address != null && this.address.length > 0
        ? this.address.find((a) =>
            a.use === "home")?.postalCode : null;
  }

  set homeZip(text: string) {
    if (this.address == null) this.address = [];
    let address: IAddress =
        this.address.find((a) => a.use === "home");
    if (address == null) {
      address = {use: "home"} as IAddress;
      this.address.push(address);
    }
    address.postalCode = text;
  }

  get secondZip(): string {
    return this.address != null && this.address.length > 0
        ? this.address.find((a) =>
            a.use !== "home")?.postalCode : null;
  }

  set secondZip(text: string) {
    if (this.address == null) this.address = [];
    let address: IAddress =
        this.address.find((a) => a.use !== "home");
    if (address == null) {
      address = {} as IAddress;
      this.address.push(address);
    }
    address.postalCode = text;
  }
}


