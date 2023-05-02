import React from "react";
import Client from "fhirclient/lib/Client";
import Patient from "./model/Patient";
import CarePlan from "./model/CarePlan";

export type FhirClientContextType = {
    client: Client;
    patient: Patient;
    currentCarePlan: CarePlan;
    allCarePlans: CarePlan[],
    error: string;
}
const defaultValue: FhirClientContextType = {
    client: null,
    patient: null,
    currentCarePlan: null,
    allCarePlans: null,
    error: ''
}
export const FhirClientContext = React.createContext(defaultValue);
