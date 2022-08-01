import React from "react";
import Client from "fhirclient/lib/Client";
import Patient from "./model/Patient";

export type FhirClientContextType = {
    client: Client;
    patient: Patient;
    error: any;
}
const defaultValue: FhirClientContextType = {
    client: null,
    patient: null,
    error: ''
}
export const FhirClientContext = React.createContext(defaultValue);
