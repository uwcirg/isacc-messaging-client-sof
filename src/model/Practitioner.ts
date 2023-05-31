import {
  IAddress,
  IAttachment,
  ICodeableConcept,
  IContactPoint,
  IElement,
  IExtension,
  IHumanName,
  IIdentifier,
  INarrative,
  IPractitioner,
  IPractitioner_Qualification,
  IResourceList,
  PractitionerGenderKind,
} from "@ahryman40k/ts-fhir-types/lib/R4";

export default class Practitioner implements IPractitioner {
  _active?: IElement;
  _birthDate?: IElement;
  _gender?: IElement;
  _implicitRules?: IElement;
  _language?: IElement;
  active?: boolean;
  address?: IAddress[];
  birthDate?: string;
  contained?: IResourceList[];
  extension?: IExtension[];
  gender?: PractitionerGenderKind;
  id?: string;
  identifier?: IIdentifier[];
  implicitRules?: string;
  language?: string;
  modifierExtension?: IExtension[];
  name?: IHumanName[];
  photo?: IAttachment[];
  qualification?: IPractitioner_Qualification[] | undefined;
  communication?: ICodeableConcept[];
  resourceType: "Practitioner";
  telecom?: IContactPoint[];
  text?: INarrative;

  static from(raw: IPractitioner): Practitioner {
    return Object.assign(new Practitioner(), raw);
  }

  get firstName(): string {
    return this.name != null &&
      this.name.length > 0 &&
      this.name[0].given != null &&
      this.name[0].given.length > 0
      ? this.name[0].given[0]
      : "";
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
      : "";
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

  get homeZip(): string {
    return this.address != null && this.address.length > 0
      ? this.address.find((a) => a.use === "home")?.postalCode || ""
      : "";
  }

  set homeZip(text: string) {
    if (this.address == null) this.address = [];
    let address: IAddress | undefined = this.address.find(
      (a) => a.use === "home"
    );
    if (address == null) {
      address = { use: "home" } as IAddress;
      this.address.push(address);
    }
    address.postalCode = text;
  }

  get secondZip(): string {
    return this.address != null && this.address.length > 0
      ? this.address.find((a) => a.use !== "home")?.postalCode || ""
      : "";
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
}
