import axios, {AxiosResponse} from "axios";
import AppConfig from "../AppConfig"
import Patient from "../model/Patient";
import CarePlan from "../model/CarePlan";
import {
  CommunicationCategory,
  ConsentContentClass,
  OrganizationReference
} from "../model/CodeSystem";
import {Consent} from "../model/Consent";
import Communication from "../model/Communication";
import {Questionnaire} from "../model/Questionnaire";
import {QuestionnaireResponse} from "../model/QuestionnaireResponse";
import {
  Consent_ProvisionTypeKind,
  IBundle,
  ICarePlan,
  ICommunication,
  IConsent,
  IPatient,
  IProcedure,
  IQuestionnaireResponse
} from "@ahryman40k/ts-fhir-types/lib/R4";
import {Resource} from "../model/Resource";

function _defaultHeaders() {
  return {
    "cache-control": "no-cache",
    "accept": "application/json",
    "content-type": "application/json"
  };
}

export async function getPatient(system: string, identifier: string): Promise<Patient> {
  console.log(`Attempting to load patient with id: ${system}|${identifier}`);
  let patientSearchUrl = `${AppConfig.fhirBaseUrl}/Patient`;
  let response = await axios.get(patientSearchUrl,
      {
        params: {
          "identifier": `${system}|${identifier}`
        },
        headers: _defaultHeaders()
      });
  if (response.status === 200) {
    let searchResultBundle: IBundle = response.data;
    // no patients
    if (searchResultBundle == null || searchResultBundle.total === 0) {
      console.log("no patient");
      return null;
    }
    // multiple patients
    if (searchResultBundle.total > 1) {
      let patientIds = searchResultBundle.entry.map((entry, index, array) => {
        return entry.resource.resourceType + "/" + entry.resource.id;
      }).join("\n");
      console.log(`Multiple patients match:\n${patientIds}`);
      return Promise.reject(
          "The user ID does not uniquely match a patient resource. Please contact an administrator.");
    }

    // found exactly one patient!
    let entry = searchResultBundle.entry[0];
    console.log(`Found patient: ${entry.resource.resourceType}/${entry.resource.id}`);
    return Patient.from(entry.resource as IPatient);
  } else {
    console.log(`Status code: ${response.status} ${response.statusText}`);
    return Promise.reject(`Could not load patient`);
  }
}

export async function getCarePlan(patient: Patient, templateRef: string): Promise<CarePlan> {
  let url = `${AppConfig.fhirBaseUrl}/CarePlan`;
  let response = await axios.get(url,
      {
        params: {
          "subject": `${patient.reference}`
        },
        headers: _defaultHeaders()
      });

  if (response.status === 200) {
    let searchResultBundle: IBundle = response.data;
    if (!searchResultBundle || searchResultBundle.total === 0) {
      console.log("no careplan");
      return null;
    }
    let carePlansForPatient: Array<CarePlan> = searchResultBundle.entry.map((c) => CarePlan.from(c.resource as ICarePlan));
    return carePlansForPatient.find((plan) => {
      if (plan.basedOn &&
          plan.basedOn.filter((reference) => {
            return reference.reference === templateRef;
          }).length > 0 &&
          plan.status === "active" &&
          plan.period.start < new Date().toISOString() &&
          plan.period.end > new Date().toISOString()) return plan;
      return null;
    });
  } else {
    console.log(`Could not load careplan: ${response.status} ${response.statusText}`);
    return Promise.reject(`Could not load careplan`);
  }
}

export async function getQuestionnaire(questionnaireReference: string): Promise<Questionnaire> {
  let url = `${AppConfig.fhirBaseUrl}/${questionnaireReference}`;
  let response = await axios.get(url, {
    headers: _defaultHeaders()
  });
  if (response.status === 200) {
    return Questionnaire.from(response.data as Questionnaire);
  } else {
    console.log(`Could not load questionnaire: ${response.status} ${response.statusText}`);
    return Promise.reject("Could not load questionnaire");
  }
}

/// get all questionnaires instantiated by activities in this CarePlan
export async function getQuestionnaires(carePlan: CarePlan): Promise<Array<Questionnaire>> {
  let promises: Array<Promise<Questionnaire>> = [];

  for (const activity of carePlan.activity) {
    if (activity.detail.instantiatesCanonical) {
      for (const instantiatesReference of activity.detail.instantiatesCanonical) {
        if (instantiatesReference.startsWith("Questionnaire")) {
          promises.push(getQuestionnaire(instantiatesReference));
        }
      }
    }
  }
  return await Promise.all(promises);
}

export async function getCommunications(patient: Patient): Promise<Array<Communication>> {
  let maxToReturn = 200;
  let url = `${AppConfig.fhirBaseUrl}/Communication`;
  let response = await axios.get(url, {
    params: {
      "recipient": `${patient.reference}`,
      "_count": `${maxToReturn}`,
      "_sort": "sent"
    },
    headers: _defaultHeaders()
  });
  if (response.status === 200) {
    let searchResultBundle: IBundle = response.data;
    if (searchResultBundle.total > 0) {
      return searchResultBundle.entry.map((c) => Communication.from(c.resource as ICommunication));
    } else {
      return [];
    }
  } else {
    console.log(`Could not load communications: ${response.status} ${response.statusText}`);
    return Promise.reject("Could not load communications");
  }
}

export async function getSystemAnnouncement(): Promise<Communication> {
  let url = `${AppConfig.fhirBaseUrl}/Communication`;
  let response = await axios.get(url,
      {
        params: {
          "status": "in-progress",
          "category": CommunicationCategory.systemAnnouncement.identifierString,
          "_sort": "-sent",
          "_count": 1,
        },
        headers: _defaultHeaders(),
      }
      //authenticated: false
  );

  if (response.status !== 200) {
    console.log(`Could not load system announcement: ${response.status} ${response.statusText}`);
    return Promise.reject("Could not load system announcement");
  }

  let searchResultBundle: IBundle = response.data;
  if (searchResultBundle.total === 0) {
    return null;
  }
  let announcement: Communication = Communication.from(searchResultBundle.entry[0].resource as ICommunication);
  console.log(`Loaded system announcement ${announcement.resourceType}/${announcement.id}`);
  return announcement;
}

export function getProcedures(carePlan: CarePlan): Promise<Array<IProcedure>> {
  //TODO
  return undefined;
}

export async function getQuestionnaireResponses(carePlan: CarePlan): Promise<Array<QuestionnaireResponse>> {
  let maxToReturn = 200;
  let url = `${AppConfig.fhirBaseUrl}/QuestionnaireResponse`;
  let response = await axios.get(url, {
    params: {
      "based-on": carePlan.reference,
      "_count": maxToReturn,
      "_sort": "-authored"
    },
    headers: _defaultHeaders()
  });
  let searchResultBundle: IBundle = response.data;
  let responses: Array<QuestionnaireResponse> = [];
  if (searchResultBundle.total > 0) {
    responses = searchResultBundle.entry.map((q) => QuestionnaireResponse.from(q.resource as IQuestionnaireResponse));
  }
  return responses;
}

export async function getConsents(patient: Patient): Promise<Array<Consent>> {
  /// get all consent records which are active and pertinent
  let url = `${AppConfig.fhirBaseUrl}/Consent`;
  let organizationSearchString = [
    OrganizationReference.scan,
    OrganizationReference.fiuNeighborhoodHelp,
    OrganizationReference.fiu,
    OrganizationReference.researchers,
    OrganizationReference.publicHealthAgencies
  ].map((c) => c.reference).join(',');
  let response = await axios.get(url, {
    params: {
      "patient": patient.reference,
      "status": "active",
      "organization": organizationSearchString, // has any of these codes ("OR" clause)
      "_sort": "-period",
      "_count": 10000
    },
    headers: _defaultHeaders()
  });
  let responses: Array<Consent> = [];
  let searchResultBundle: IBundle = response.data;
  if (searchResultBundle.total > 0) {
    responses = searchResultBundle.entry.map((c) => Consent.from(c.resource as IConsent));
  }
  let relevantResponses: Array<Consent> = [];
  [
    ConsentContentClass.location,
    ConsentContentClass.symptomsTestingConditions,
    ConsentContentClass.contactInformation
  ].forEach((contentClass) => {
    [
      OrganizationReference.publicHealthAgencies,
      OrganizationReference.researchers,
    ].forEach((org) => {

          let consent: Consent = responses.find(
              (c: Consent) =>
                  c.organization?.includes(org) &&
                  c.provision.class?.includes(contentClass));
          if (consent) {
            relevantResponses.push(consent);
          } else {
            // add a blank (default) consent for this entry
            relevantResponses.push(Consent.make(patient, org, contentClass, Consent_ProvisionTypeKind._deny));
          }
        }
    );
  });

  [
    ConsentContentClass.all,
  ].forEach((contentClass) => {
    [
      OrganizationReference.scan,
      OrganizationReference.fiu,
      OrganizationReference.fiuNeighborhoodHelp,
      OrganizationReference.socialDistancingStudy
    ].forEach((org) => {
      let consent: Consent = responses.find(
          (c) =>
              c.organization?.includes(org) &&
              c.provision.class?.includes(contentClass));
      if (consent != null) {
        relevantResponses.push(consent);
      } else {
        // add a blank (default) consent for this entry
        relevantResponses.push(Consent.make(patient, org, contentClass, Consent_ProvisionTypeKind._deny));
      }
    });
  });
  return relevantResponses;
}

export async function postQuestionnaireResponse(
    questionnaireResponse: QuestionnaireResponse): Promise<QuestionnaireResponse> {
  let result: any;
  try {
    result = await postResource(questionnaireResponse);
  } catch (e) {
    console.log(e);
    return Promise.reject(
        "An error occurred when trying to save your responses. Please try logging in again.");
  }
  let postedResponse: QuestionnaireResponse = QuestionnaireResponse.from(result as IQuestionnaireResponse);
  console.log(`Created ${postedResponse.reference}`);
  return postedResponse;
}

async function postResource(resource: Resource): Promise<any> {
  let url = `${AppConfig.fhirBaseUrl}/${resource.resourceType}`;
  let response = await axios.post(url, resource, {headers: _defaultHeaders()});

  return resultFromResponse(response, `Creating ${resource.resourceType} failed`);
}

function resultFromResponse(response: AxiosResponse, defaultErrorMessage: string): Promise<any> {
  if (response.status === 200 || response.status === 201) {
    if (response.statusText === "Created") {
      let resource: Resource = response.data;
      console.log(`Created record: ${resource.resourceType}/${resource.id}`);
    }
    return response.data;
  } else {
    console.log(`Status code: ${response.status} ${response.statusText}`);
    let message;
    try {
      message = response.data.issue[0].diagnostics;
    } catch (e) {
      message = defaultErrorMessage;
    }
    console.log(message);
    return Promise.reject(message);
  }
}