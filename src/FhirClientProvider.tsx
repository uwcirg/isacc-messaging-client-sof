import React from 'react';
import FHIR from 'fhirclient';
import {FhirClientContext} from './FhirClientContext';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Error from './components/Error';
import Client from "fhirclient/lib/Client";
import {queryPatientIdKey} from "./util/util";
import Patient from "./model/Patient";

interface Props {
    children: React.ReactNode;
}

export default function FhirClientProvider(props: Props): JSX.Element {

    const [client, setClient] = React.useState(null);
    const [error, setError] = React.useState('');
    const [patient, setPatient] = React.useState(null);

    React.useEffect(() => {
        FHIR.oauth2.ready().then(
            (client: Client) => {
                setClient(client);
                getPatient(client).then(result => {
                    setPatient(result);
                }).catch(e => {
                    console.log("Error ", e)
                    setError(e);
                });
            },
            (reason: any) => setError(reason)
        );
    }, []);

    async function getPatient(client: Client) {
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

    return (
        <FhirClientContext.Provider value={{client: client, patient: patient, error: error}}>
            <FhirClientContext.Consumer>
                {({client, patient, error}) => {
                    // any auth error that may have been rejected with
                    if (error) {
                        return <Error message={error.message}></Error>;
                    }

                    // if client is already available render the subtree
                    if (client) {
                        return props.children;
                    }

                    // client is undefined until auth.ready() is fulfilled
                    return <Box><CircularProgress></CircularProgress> Authorizing...</Box>
                }}
            </FhirClientContext.Consumer>
        </FhirClientContext.Provider>
    );

}
