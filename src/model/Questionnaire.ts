import FhirTranslations from "../FhirTranslations";
import {
  ICodeableConcept,
  ICoding,
  IContactDetail,
  IElement,
  IExtension,
  IIdentifier,
  IMeta,
  INarrative,
  IPeriod,
  IQuestionnaire,
  IQuestionnaire_AnswerOption,
  IQuestionnaire_EnableWhen,
  IQuestionnaire_Initial,
  IQuestionnaire_Item,
  IResourceList,
  IUsageContext,
  Questionnaire_ItemEnableBehaviorKind,
  Questionnaire_ItemTypeKind,
  QuestionnaireStatusKind
} from "@ahryman40k/ts-fhir-types/lib/R4";
import {Coding} from "./CodeSystem";
import {Answer} from "./QuestionnaireResponse";
import {IntlShape} from "react-intl";

export class Questionnaire implements IQuestionnaire {
  _approvalDate?: IElement;
  _copyright?: IElement;
  _date?: IElement;
  _description?: IElement;
  _experimental?: IElement;
  _implicitRules?: IElement;
  _language?: IElement;
  _lastReviewDate?: IElement;
  _name?: IElement;
  _publisher?: IElement;
  _purpose?: IElement;
  _status?: IElement;
  _subjectType?: IElement[];
  _title?: IElement;
  _url?: IElement;
  _version?: IElement;
  approvalDate?: string;
  code?: ICoding[];
  contact?: IContactDetail[];
  contained?: IResourceList[];
  copyright?: string;
  date?: string;
  derivedFrom?: string[];
  description?: string;
  effectivePeriod?: IPeriod;
  experimental?: boolean;
  extension?: IExtension[];
  id?: string;
  identifier?: IIdentifier[];
  implicitRules?: string;
  item?: QuestionnaireItem[];
  jurisdiction?: ICodeableConcept[];
  language?: string;
  lastReviewDate?: string;
  meta?: IMeta;
  modifierExtension?: IExtension[];
  name?: string;
  publisher?: string;
  purpose?: string;
  resourceType: "Questionnaire";
  status?: QuestionnaireStatusKind;
  subjectType?: string[];
  text?: INarrative;
  title?: string;
  url?: string;
  useContext?: IUsageContext[];
  version?: string;


  static from(raw: IQuestionnaire): Questionnaire {
    if (!raw) return null;
    let questionnaire = Object.assign(new Questionnaire(), raw);
    if (questionnaire.item) {
      questionnaire.item =
          questionnaire.item.map(item => QuestionnaireItem.from(item));
    }
    return questionnaire;
  }

  get reference(): string {
    return `${this.resourceType}/${this.id}`;
  }
}

export class QuestionnaireItem implements IQuestionnaire_Item {
  _definition?: IElement;
  _enableBehavior?: IElement;
  _linkId?: IElement;
  _maxLength?: IElement;
  _prefix?: IElement;
  _readOnly?: IElement;
  _repeats?: IElement;
  _required?: IElement;
  _text?: IElement;
  _type?: IElement;
  answerOption?: AnswerOption[];
  answerValueSet?: string;
  code?: Coding[];
  definition?: string;
  enableBehavior?: Questionnaire_ItemEnableBehaviorKind;
  enableWhen?: IQuestionnaire_EnableWhen[];
  extension?: IExtension[];
  id?: string;
  initial?: IQuestionnaire_Initial[];
  item?: QuestionnaireItem[];
  linkId?: string;
  maxLength?: number;
  modifierExtension?: IExtension[];
  prefix?: string;
  readOnly?: boolean;
  repeats?: boolean;
  required?: boolean;
  text?: string;
  type?: Questionnaire_ItemTypeKind;

  textLocalized(): string {
    return FhirTranslations.extractTranslation(this.text, this._text);
  }

  helpTextLocalized(): string {
    let helpTextSubItem: QuestionnaireItem = this.item?.find(
        (subItem: QuestionnaireItem) =>
            subItem.extension != null &&
            subItem.extension.find((extension) =>
            extension.valueCodeableConcept != null &&
            extension.valueCodeableConcept.coding != null &&
            extension.valueCodeableConcept.coding.find((coding) =>
            coding.code === "help" &&
            coding.system ===
            "http://hl7.org/fhir/questionnaire-item-control")));
    return helpTextSubItem?.textLocalized();
  }

  static from(raw: IQuestionnaire_Item): QuestionnaireItem {
    if (!raw) return null;
    let obj = Object.assign(new QuestionnaireItem(), raw);
    if (obj.item) obj.item = obj.item.map(item => QuestionnaireItem.from(item));
    if (obj.answerOption) {
      obj.answerOption =
          obj.answerOption.map(item => AnswerOption.from(item));
    }
    return obj;
  }

  isSupported(): boolean {
    return this.type === Questionnaire_ItemTypeKind._choice ||
           this.type === Questionnaire_ItemTypeKind._decimal ||
           this.type === Questionnaire_ItemTypeKind._string ||
           this.type === Questionnaire_ItemTypeKind._display ||
           this.type === Questionnaire_ItemTypeKind._date;
  }

  isGroup(): boolean {
    return this.type === Questionnaire_ItemTypeKind._group;
  }

  isTemperature(): boolean {
    return this.code != null &&
           this.code.find((c: ICoding) => {
             return c.system != null && c.system.includes("loinc");
           })?.code === "8310-5";
  }
}

export class AnswerOption implements IQuestionnaire_AnswerOption {
  extension: IExtension[];
  valueCoding: Coding;
  valueInteger: number;

  static from(raw: IQuestionnaire_AnswerOption): AnswerOption {
    if (!raw) return null;
    let obj: AnswerOption = Object.assign(new AnswerOption(), raw);
    if (obj.valueCoding) obj.valueCoding = Coding.from(obj.valueCoding);
    return obj;
  }

  get ifSelected(): Answer {
    return Answer.fromAnswerOption(this);
  }

  display(intl: IntlShape): string {
    if (this.valueInteger != null) return intl.formatNumber(this.valueInteger);
    if (this.valueCoding != null) return this.valueCoding.displayLocalized();
    return this.toString();
  }

  ordinalValue(): number {
    if (this.extension == null) return -1;
    let ordinalValueExtension: IExtension = this.extension.find(
        (e) => e.url ===
               'http://hl7.org/fhir/StructureDefinition/ordinalValue');
    if (ordinalValueExtension != null) {
      return ordinalValueExtension.valueDecimal;
    }
    return -1;
  }

}
