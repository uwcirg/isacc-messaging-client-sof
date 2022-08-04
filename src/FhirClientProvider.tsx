import React from 'react';
import FHIR from 'fhirclient';
import {FhirClientContext} from './FhirClientContext';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Client from "fhirclient/lib/Client";
import {queryPatientIdKey} from "./util/util";
import Patient from "./model/Patient";
import CarePlan from "./model/CarePlan";
import {Bundle} from "./model/Bundle";
import {ICarePlan} from "@ahryman40k/ts-fhir-types/lib/R4";
import {IsaccCarePlanCategory} from "./model/CodeSystem";
import Communication from "./model/Communication";
import LaunchError from "./components/LaunchError";

interface Props {
    children: React.ReactNode;
}

export default function FhirClientProvider(props: Props): JSX.Element {

    const [client, setClient] = React.useState(null);
    const [error, setError] = React.useState('');
    const [patient, setPatient] = React.useState(null);
    const [carePlan, setCarePlan] = React.useState(null);
    const [communications, setCommunications] = React.useState(null);

    async function getPatient(client: Client): Promise<Patient> {
        if (!client) return;
        //this is a workaround for when patient id is not embedded within the JWT token
        let queryPatientId = sessionStorage.getItem(queryPatientIdKey);
        if (queryPatientId) {
            console.log('Using stored patient id ', queryPatientId);
            return client.request('/Patient/' + queryPatientId);
        }
        // Get the Patient resource
        return await client.patient.read().then((value: any) => {
            return Patient.from(value);
        });
    }

    async function getCarePlan(client: Client, patientId: string): Promise<CarePlan> {
        if (!client) return;
        let params = new URLSearchParams({
            "subject": `Patient/${patientId}`,
            "category": IsaccCarePlanCategory.isaccMessagePlan.code,
            "_sort": "-_lastUpdated"
        }).toString();
        return await client.request(`/CarePlan?${params}`).then((bundle: Bundle) => {
            if (bundle.type === "searchset") {
                if (!bundle.entry) {
                    setError("Patient has no ISACC CarePlan. Ensure the patient is enrolled and has a message schedule CarePlan.");
                    return null;
                }
                if (bundle.total > 1) {
                    console.log("Multiple ISACC CarePlans found. Using the most recently updated.", bundle);
                }
                let firstResult = bundle.entry[0].resource;
                if (firstResult.resourceType === "CarePlan") {
                    return CarePlan.from(bundle.entry[0].resource as ICarePlan);
                } else {
                    setError("Unexpected resource type returned");
                    return null;
                }
            } else {
                setError("Unexpected bundle type returned");
                return null;
            }
        }, (reason: any) => {
            setError(reason.toString());
            return null;
        });
    }

    async function getCommunications(client: Client, carePlanId: string): Promise<Communication[]> {
        if (!client) return;
        // Communication?part-of=CarePlan/${carePlanId}
        let params = new URLSearchParams({
            "part-of": `CarePlan/${carePlanId}`,
            "_sort": "-sent"
        }).toString();
        return await client.request(`/Communication?${params}`).then((bundle: Bundle) => {
            if (bundle.type === "searchset") {
                if (!bundle.entry) return [];

                let communications: Communication[] = bundle.entry.map((e) => {
                    if (e.resource.resourceType !== "Communication") {
                        setError("Unexpected resource type returned");
                        return null;
                    } else {
                        console.log("Communication loaded:", e);
                        return Communication.from(e.resource);
                    }
                })
                return communications;

            } else {
                setError("Unexpected bundle type returned");
                return null;
            }
        }, (reason: any) => {
            setError(reason.toString());
            return null;
        });
    }

    React.useEffect(() => {
        FHIR.oauth2.ready().then(
            (client: Client) => {
                setClient(client);
                getPatient(client).then((patientResult: Patient) => {
                    setPatient(patientResult);
                    console.log(`Loaded ${patientResult.reference}`);
                    getCarePlan(client, patientResult.id).then((carePlanResult: CarePlan) => {
                        setCarePlan(carePlanResult);
                        if (carePlanResult) {
                            console.log(`Loaded ${carePlanResult.reference}`);
                            getCommunications(client, carePlanResult.id).then((result: Communication[]) => {
                                setCommunications(result);
                            }, (reason: any) => setError(reason)).catch(e => {
                                console.log("Error fetching Communications", e);
                                setError(e);
                            })
                        }
                    }, (reason: any) => setError(reason)).catch(e => {
                        console.log("Error fetching CarePlan", e)
                        setError(e);
                    });
                }).catch(e => {
                    console.log("Error fetching Patient", e)
                    setError(e);
                });

            }, (reason: any) => setError(reason)
        );
    }, []);

    return (
        <FhirClientContext.Provider value={{
            client: client,
            patient: patient,
            carePlan: carePlan,
            communications: communications,
            error: error
        }}>
            <FhirClientContext.Consumer>
                {({client, patient, carePlan, communications, error}) => {
                    // any auth error that may have been rejected with
                    if (error) {
                        return <LaunchError message={error}></LaunchError>;
                    }

                    // if client is already available render the subtree
                    if (client) {
                        return props.children;
                    }

                    // client is undefined until auth.ready() is fulfilled
                    return <Box><CircularProgress/> Authorizing...</Box>
                }}
            </FhirClientContext.Consumer>
        </FhirClientContext.Provider>
    );

}
