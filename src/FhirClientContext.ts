import React from "react";
import Client from "fhirclient/lib/Client";
import Patient from "./model/Patient";
import CarePlan from "./model/CarePlan";
import Communication from "./model/Communication";

export type FhirClientContextType = {
    client: Client;
    patient: Patient;
    carePlan: CarePlan;
    communications: Communication[];
    error: string;
}
const defaultValue: FhirClientContextType = {
    client: null,
    patient: null,
    carePlan: null,
    communications: null,
    error: ''
}
export const FhirClientContext = React.createContext(defaultValue);
