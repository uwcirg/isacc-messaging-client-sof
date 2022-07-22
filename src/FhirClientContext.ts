import React from "react";
import Client from "fhirclient/lib/Client";

export type FhirClientContextType = {
    client: Client;
    error: any;
}
const defaultValue: FhirClientContextType = {
    client: null,
    error: ''
}
export const FhirClientContext = React.createContext(defaultValue);
