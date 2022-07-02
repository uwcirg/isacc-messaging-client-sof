import React from "react";
import {
  getCarePlan,
  getCommunications,
  getConsents,
  getPatient,
  getQuestionnaireResponses,
  getQuestionnaires,
  postQuestionnaireResponse
} from "./services/Repository";
import Patient from "./model/Patient";
import CarePlan from "./model/CarePlan";
import {Consent} from "./model/Consent";
import {Coding, ConsentContentClass} from "./model/CodeSystem";
import {Questionnaire, QuestionnaireItem} from "./model/Questionnaire";
import {QuestionnaireResponse} from "./model/QuestionnaireResponse";
import Communication from "./model/Communication";
import {
  Consent_ProvisionTypeKind,
  ICoding,
  IConsent,
  IDocumentReference,
  IProcedure,
  IReference
} from "@ahryman40k/ts-fhir-types/lib/R4";

class ConsentGroup extends Map<ICoding, Consent_ProvisionTypeKind> {
  get shareSymptoms(): boolean {
    return this.get(ConsentContentClass.symptomsTestingConditions) ===
           Consent_ProvisionTypeKind._permit;
  }

  set shareSymptoms(permit: boolean) {
    this.set(ConsentContentClass.symptomsTestingConditions,
        (permit ? Consent_ProvisionTypeKind._permit
                : Consent_ProvisionTypeKind._deny));
  }

  get shareLocation(): boolean {
    return this.get(ConsentContentClass.location) ===
           Consent_ProvisionTypeKind._permit;
  }

  set shareLocation(permit: boolean) {
    this.set(ConsentContentClass.location,
        permit ? Consent_ProvisionTypeKind._permit
               : Consent_ProvisionTypeKind._deny);
  }

  get shareContactInfo(): boolean {
    return this.get(ConsentContentClass.contactInformation) ===
           Consent_ProvisionTypeKind._permit;
  }

  set shareContactInfo(permit: boolean) {
    this.set(ConsentContentClass.contactInformation,
        permit ? Consent_ProvisionTypeKind._permit
               : Consent_ProvisionTypeKind._deny);
  }

  get shareAll(): boolean {
    return this.get(ConsentContentClass.all) ===
           Consent_ProvisionTypeKind._permit;
  }

  set shareAll(permit: boolean) {
    this.set(ConsentContentClass.all, permit ? Consent_ProvisionTypeKind._permit
                                             : Consent_ProvisionTypeKind._deny);
  }
}

class DataSharingConsents {
  _originalConsents: Array<Consent> = [];
  _consents: Map<IReference, ConsentGroup> = new Map();

  constructor(consents: Array<Consent>) {
    this._initFrom(consents);
  }

  reset() {
    this._initFrom(this._originalConsents);
  }

  private _initFrom(consents: Array<Consent>) {
    this._consents = new Map();
    this._originalConsents = consents.map(
        (c) => Consent.from(JSON.parse(JSON.stringify(c)) as IConsent));
    if (!consents) return;
    consents.sort((a, b) => {
      return a.provision.period.start.localeCompare(b.provision.period.start);
    });
    consents.forEach((consent) => {
      let contentCategories: Map<IReference, ConsentGroup> = putIfAbsent(
          this._consents, consent.organization[0], new ConsentGroup());
      let contentClass: ICoding = consent.provision?.class[0];
      putIfAbsent(contentCategories, contentClass, consent.provision.type);
    });
  }

  generateNewConsents(patient: Patient): Array<Consent> {
    let newConsents: Array<Consent> = [];
    this._consents.forEach((orgConsents: ConsentGroup, org: IReference) => {
      (orgConsents as Map<ICoding, Consent_ProvisionTypeKind>).forEach(
          (type: Consent_ProvisionTypeKind, contentClass: ICoding) => {
            let existingProvisionType: Consent_ProvisionTypeKind = this._originalConsents
                .find((consent: Consent) => {
                  return consent.organization.includes(org) &&
                         consent.provision.class.includes(
                             Coding.from(contentClass));
                })?.provision?.type;
            if (!existingProvisionType || existingProvisionType !== type) {
              newConsents.push(Consent.make(patient, org, contentClass, type));
            }
          });
    });
    return newConsents;
  }
}

function putIfAbsent(map: Map<any, any>, key: any, ifAbsent: any): any {
  let item: any = map.get(key);
  if (!item) {
    map.set(key, ifAbsent);
    item = map.get(key);
  }
  return item;
}

type TreatmentCalendar = {}

export class CarePlanModel {
  questionnaires: Array<Questionnaire> = [];
  procedures: Array<IProcedure> = [];
  questionnaireResponses: Array<QuestionnaireResponse> = [];
  carePlan?: CarePlan;
  error?: any;
  isLoading?: boolean;
  patient?: Patient;
  treatmentCalendar?: TreatmentCalendar;
  consents?: DataSharingConsents;
  // _auth?: KeycloakAuth;
  isFirstTimeUser?: boolean;
  // api?: OAuthApi get _api => _auth?.;
  _keycloakUserId: string = "";
  _keycloakSystem: string;
  _careplanTemplateRef: string;
  _questionsByLinkId: Map<String, QuestionnaireItem> = new Map<String, QuestionnaireItem>();
  infoLinks: Array<IDocumentReference> = [];
  communications: Array<Communication> = [];
  didLoad?: boolean = false;
  notifyListeners: () => void;

  constructor(keycloakSystem: string, careplanTemplateRef: string,
              notifyListeners: () => void) {
    this._keycloakSystem = keycloakSystem;
    this._careplanTemplateRef = `CarePlan/${careplanTemplateRef}`;
    this.notifyListeners = notifyListeners;
    // this._auth = new KeycloakAuth()
  }

  reset() {
    this.questionnaires = [];
    this.procedures = null;
    this.questionnaireResponses = [];
    this.carePlan = null;
    this.error = null;
    this.isLoading = null;
    this.patient = null;
    this.treatmentCalendar = null;
    this.consents = null;
    this.isFirstTimeUser = null;
    this._keycloakUserId = null;
    this._questionsByLinkId = new Map<String, QuestionnaireItem>();
    this.infoLinks = [];
    this.communications = [];
    this.didLoad = false;
  }

  get activeCommunications(): Array<Communication> {
    return this.communications != null
           ? this.communications.filter((c, index, array) => {
          return c.status === "in-progress";
        }) : [];
  }

  get nonActiveCommunications(): Array<Communication> {
    return this.communications != null
           ? this.communications.filter((c, index, array) => {
          return c.status !== "in-progress";
        }) : [];
  }

  get hasNoPatient(): boolean {
    return !this.patient;
  }

  get hasNoCarePlan(): boolean {
    return !this.carePlan;
  }

  get hasNoUser(): boolean {
    return !this._keycloakUserId;
  }

  load(): void {
    this.loadThenNotifyOrError(this._doLoad());
  }

  private loadThenNotifyOrError(promise: Promise<any>) {
    this.isLoading = true;
    this.error = undefined;
    this.notifyListeners();
    promise.then((value) => {
      this.error = undefined;
      this.isLoading = false;
      this.didLoad = true;
      this.notifyListeners();
    }, (error) => {
      console.log(error);
      this.error = error;
      this.isLoading = false;
      this.didLoad = true;
      this.notifyListeners();
    });
  }

  private async _doLoad(): Promise<any> {
    if (this.hasNoUser) {
      return Promise.reject("No user information. Please log in again.");
    }
    this.patient = await getPatient(this._keycloakSystem, this._keycloakUserId);
    if (this.patient) {
      this.isFirstTimeUser = false;
      return this._loadCarePlan();
    } else {
      try {
        this.patient = await this._addBlankPatient() as Patient;
      } catch (e) {
        return Promise.reject("Failed to create patient record.");
      }
      if (this.patient) {
        console.log(`Successfully created ${this.patient.reference}`);
        this.isFirstTimeUser = true;
        return this._loadCarePlan();
      } else {
        return Promise.reject("Returned patient was null");
      }
    }
  }

  private async _loadCarePlan(): Promise<any> {
    this.carePlan = await getCarePlan(this.patient, this._careplanTemplateRef);
    if (this.carePlan != null) {
      console.log(`Found careplan: ${this.carePlan.reference}`);
      await this._loadCommunications();
      return this._loadQuestionnaires();
    } else {
      console.log("No Careplan.")
      try {
        this.carePlan = await this._addDefaultCarePlan() as CarePlan;
      } catch (e) {
        this.error = e;
        return Promise.reject(
            `Failed to create careplan record: ${this.error}`);
      }
    }

    if (this.carePlan) {
      console.log(`Successfully created ${this.carePlan.reference}`);
      await this._createNewUserMessage();
      return this._loadQuestionnaires();
    } else {
      return Promise.reject("Returned careplan was null");
    }
  }

  setUser(keycloakUserId: string) {
    console.log("keycloakUserId set: " + keycloakUserId);
    this._keycloakUserId = keycloakUserId;
    this.load();
  }

  private async _addBlankPatient(): Promise<Patient> {
    // TODO: implement _addBlankPatient
    throw new Error("_addBlankPatient not implemented");
  }

  private async _loadCommunications(): Promise<void> {
    let responses = await getCommunications(this.patient);
    if (responses) {
      this.communications = responses;
      console.log(`Loaded ${this.communications.length} communcations`);
    } else {
      this.communications = [];
      console.log("No communications to load.");
    }
  }

  private _loadQuestionnaires() {
    let promises: Array<Promise<any>> = [
      getQuestionnaires(this.carePlan).then((questionnaires) => {
        this.questionnaires = questionnaires;
        this._createQuestionMap();
      }),
      // getProcedures(this.carePlan).then((procedures) => {
      //   this.procedures = procedures;
      // }),
      getQuestionnaireResponses(this.carePlan).then((responses) => {
        this.questionnaireResponses = responses;
      }),

      this._loadConsents()
    ];
    return Promise.all(promises).then((value) => {
      this.rebuildTreatmentPlan();
    });
  }

  private async _addDefaultCarePlan(): Promise<CarePlan> {
    // TODO: implement _addDefaultCarePlan
    throw new Error("_addDefaultCarePlan not implemented");
  }

  private async _createNewUserMessage() {
    // TODO: implement _createNewUserMessage
    throw new Error("_createNewUserMessage not implemented");
  }

  private _createQuestionMap() {
    this._questionsByLinkId = new Map();
    this.questionnaires.forEach((questionnaire: Questionnaire) => {
      if (questionnaire.item) {
        questionnaire.item.forEach((question: QuestionnaireItem) => {
          this._addQuestionnaireItemAndItsChildren(question);
        });
      }
    });
  }

  private _addQuestionnaireItemAndItsChildren(question: QuestionnaireItem): void {
    this._questionsByLinkId.set(question.linkId, question);
    if (question.item) {
      question.item.forEach((nestedQuestion: QuestionnaireItem) => {
        this._addQuestionnaireItemAndItsChildren(nestedQuestion);
      });
    }
  }

  private _loadConsents(): Promise<void> {
    return getConsents(this.patient).then((responses: Array<Consent>) => {
      this.consents = new DataSharingConsents(responses);
    });
  }

  private rebuildTreatmentPlan() {
    // TODO implement rebuildTreatmentPlan
    // need to find a calendar component that we can use, and build the
    // data object that it consumes here.
  }

  async postQuestionnaireResponse(response: QuestionnaireResponse) {
    return postQuestionnaireResponse(response)
        .then((value: any) => this.load());
  }

  questionForLinkId(linkId: string): QuestionnaireItem {
    return this._questionsByLinkId.get(linkId);
  }

  questionnaireForResponse(response: QuestionnaireResponse) : Questionnaire {
    return this.questionnaires?.find(
        (element: Questionnaire) => element.id ===
                                    response.questionnaire.split("/")[1]);
  }
}

export type MapAppContext = {
  model: CarePlanModel;
  changeLanguage?(language: string): void;
  currentLocale: string;
}

const defaultValue: MapAppContext = {
  model: new CarePlanModel("", "", null),
  changeLanguage: null,
  currentLocale: navigator.language
};
export const CarePlanModelContext = React.createContext(defaultValue);
