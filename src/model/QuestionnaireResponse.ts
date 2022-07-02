import {AnswerOption, Questionnaire} from "./Questionnaire";
import CarePlan from "./CarePlan";
import {Coding} from "./CodeSystem";
import {
  IAttachment,
  IElement,
  IExtension,
  IIdentifier,
  IMeta,
  INarrative,
  IQuantity,
  IQuestionnaireResponse,
  IQuestionnaireResponse_Answer,
  IQuestionnaireResponse_Item,
  IReference,
  IResourceList,
  QuestionnaireResponseStatusKind
} from "@ahryman40k/ts-fhir-types/lib/R4";
import {IntlShape} from "react-intl";


export class QuestionnaireResponse implements IQuestionnaireResponse {
  _authored?: IElement;
  _implicitRules?: IElement;
  _language?: IElement;
  _status?: IElement;
  author?: IReference;
  authored?: string;
  basedOn?: IReference[];
  contained?: IResourceList[];
  encounter?: IReference;
  extension?: IExtension[];
  id?: string;
  identifier?: IIdentifier;
  implicitRules?: string;
  language?: string;
  meta?: IMeta;
  modifierExtension?: IExtension[];
  partOf?: IReference[];
  questionnaire?: string;
  resourceType: "QuestionnaireResponse";
  source?: IReference;
  status?: QuestionnaireResponseStatusKind;
  subject?: IReference;
  text?: INarrative;

  item?: QuestionnaireResponseItem[];


  static from(raw: IQuestionnaireResponse): QuestionnaireResponse {
    if (!raw) return null;
    let r = Object.assign(new QuestionnaireResponse(), raw);
    if (r.item) {
      r.item = r.item.map(item => QuestionnaireResponseItem.from(item));
    }
    return r;
  }

  static make(questionnaire: Questionnaire, subject: IReference, carePlan: CarePlan): QuestionnaireResponse {
    if (!questionnaire) return undefined;
    let r: QuestionnaireResponse = new QuestionnaireResponse();
    r.resourceType = "QuestionnaireResponse";
    r.item = [];
    r.questionnaire = questionnaire.reference;
    r.basedOn = [{reference: carePlan.reference}];
    let today = new Date();
    r.authored = new Date(today.getFullYear(), today.getMonth(), today.getDate(),
        today.getHours(), today.getMinutes()).toISOString();
    return r;
  }

  get isEmpty(): boolean {
    return !this.item ||
        this.item.length === 0 ||
        this.item.every((element: QuestionnaireResponseItem) => element.isEmpty);
  }

  get reference(): string {
    return `${this.resourceType}/${this.id}`;
  }

  setAnswer(linkId: string, answerProps: IQuestionnaireResponse_Answer): void {
    let answer = Answer.from(answerProps);
    if (answer == null || answer.isEmpty) {
      this.removeResponseItem(linkId);
    } else {
      let responseItem = this.getResponseItem(linkId);
      if (responseItem != null) {
        responseItem.answer = [answer]; // single response
      } else {
        this.item.push(QuestionnaireResponseItem.from({
          linkId: linkId,
          answer: [answer]
        }));
      }
    }
  }

  getAnswer(linkId: string): Answer {
    let answers: Array<Answer> = this.getResponseItem(linkId)?.answer;
    if (answers != null && answers.length > 0) return answers[0];
    return null;
  }

  removeResponseItem(linkId: string): void {
    if (this.item != null) {
      this.item = this.item.filter(
          (element: QuestionnaireResponseItem) => element.linkId !== linkId
      );
    }
  }

  getResponseItem(linkId: string): QuestionnaireResponseItem {
    for (let responseItem of this.item) {
      if (responseItem.linkId === linkId) {
        return responseItem;
      }
    }
    return null;
  }
}

export class QuestionnaireResponseItem implements IQuestionnaireResponse_Item {
  _definition?: IElement;
  _linkId?: IElement;
  _text?: IElement;
  definition?: string;
  extension?: IExtension[];
  id?: string;
  linkId?: string;
  modifierExtension?: IExtension[];
  text?: string;

  answer?: Answer[];
  item?: QuestionnaireResponseItem[]; // nested questions

  static from(raw: IQuestionnaireResponse_Item): QuestionnaireResponseItem {
    if (!raw) return null;
    let questionnaireResponseItem = Object.assign(new QuestionnaireResponseItem(), raw);
    questionnaireResponseItem.answer = questionnaireResponseItem.answer?.map(item => Answer.from(item));
    questionnaireResponseItem.item = questionnaireResponseItem.item?.map(item => QuestionnaireResponseItem.from(item));
    return questionnaireResponseItem;
  }

  get isEmpty(): boolean {
    return (!this.answer || this.answer.length === 0 ||
        this.answer.every((a: Answer) => a.isEmpty));
  }

  answerDisplay(intl: IntlShape) {
    if (this.answer == null || this.answer.length===0) return "";
    return this.answer.map(e => e.displayString(intl)).join(", ");
  }
}

export class Answer implements IQuestionnaireResponse_Answer {
  _valueBoolean?: IElement;
  _valueDate?: IElement;
  _valueDateTime?: IElement;
  _valueDecimal?: IElement;
  _valueInteger?: IElement;
  _valueString?: IElement;
  _valueTime?: IElement;
  _valueUri?: IElement;
  extension?: IExtension[];
  id?: string;
  modifierExtension?: IExtension[];
  valueAttachment?: IAttachment;
  valueBoolean?: boolean;
  valueCoding?: Coding;
  valueDate?: string;
  valueDateTime?: string;
  valueDecimal?: number;
  valueInteger?: number;
  valueQuantity?: IQuantity;
  valueReference?: IReference;
  valueString?: string;
  valueTime?: string;
  valueUri?: string;

  item?: QuestionnaireResponseItem[];


  get isEmpty(): boolean {
    return this.valueInteger == null &&
        this.valueDecimal == null &&
        this.valueCoding == null &&
        (this.valueString == null || this.valueString.length === 0) &&
        this.valueDate == null &&
        this.valueDateTime == null;
  }

  displayString(intl:IntlShape): string {
    return this.toLocalizedString(intl);
  }

  toLocalizedString(intl:IntlShape): string {
    if (this.valueInteger != null) return intl.formatNumber(this.valueInteger);
    if (this.valueCoding != null) return this.valueCoding.displayLocalized();
    if (this.valueDecimal != null) return intl.formatNumber(this.valueDecimal);
    if (this.valueString != null) return this.valueString;
    if (this.valueDate != null) {
      return intl.formatDate(new Date(this.valueDate), {
        year: 'numeric', month: 'numeric', day: 'numeric'
      });
    }
    if (this.valueDateTime != null) {
      return intl.formatDate(new Date(this.valueDateTime), {
        hour: 'numeric', minute: 'numeric',
        year: 'numeric', month: 'numeric', day: 'numeric'
      });
    }
    return '';
  }

  static from(raw: IQuestionnaireResponse_Answer): Answer {
    if (!raw) return null;
    let questionnaireResponseItemAnswer = Object.assign(new Answer(), raw);
    questionnaireResponseItemAnswer.valueCoding = Coding.from(questionnaireResponseItemAnswer.valueCoding);
    questionnaireResponseItemAnswer.item = questionnaireResponseItemAnswer.item?.map(item => QuestionnaireResponseItem.from(item));
    return questionnaireResponseItemAnswer;
  }

  static fromAnswerOption(option: AnswerOption): Answer {
    return Answer.from(option);
  }

  matches(o: any): boolean {
    if (o instanceof Answer) {
      let other = o as Answer;
      return this.valueInteger === other.valueInteger &&
          this.valueCoding.equals(other.valueCoding) &&
          this.valueDecimal === other.valueDecimal &&
          this.valueString === other.valueString &&
          this.valueDate === other.valueDate &&
          this.valueDateTime === other.valueDateTime;
    } else if (o instanceof AnswerOption) {
      let other = o as AnswerOption;
      return this.valueInteger === other.valueInteger &&
          this.valueCoding?.equals(other.valueCoding);
    } else if (o instanceof  Coding) {
      let other = o as Coding;
      return this.valueInteger === null && other === this.valueCoding;
    }
    return false;
  }
}