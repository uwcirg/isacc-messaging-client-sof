import React from "react";
import Client from "fhirclient/lib/Client";
import CareTeam from "./model/CareTeam";
import CarePlan from "./model/CarePlan";
import Practitioner from "./model/Practitioner";
import Patient from "./model/Patient";
import { Observation } from "./model/Observation";

export type FhirClientContextType = {
    client: Client;
    patient: Patient;
    practitioner: Practitioner;
    currentCarePlan: CarePlan;
    allCarePlans: CarePlan[],
    careTeam: CareTeam;
    mostRecentPhq9: Observation,
    mostRecentCss: Observation

    error: string;
}
const defaultValue: FhirClientContextType = {
    client: null,
    patient: null,
    practitioner: null,
    currentCarePlan: null,
    allCarePlans: null,
    careTeam: null,
    mostRecentPhq9: null,
    mostRecentCss: null,
    error: ''
}
export const FhirClientContext = React.createContext(defaultValue);
