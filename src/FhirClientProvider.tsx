import React from 'react';
import FHIR from 'fhirclient';
import {FhirClientContext, FhirClientContextType} from './FhirClientContext';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Client from "fhirclient/lib/Client";
import {queryPatientIdKey} from "./util/util";
import Patient from "./model/Patient";
import CarePlan from "./model/CarePlan";
import {Bundle} from "./model/Bundle";
import {ICarePlan} from "@ahryman40k/ts-fhir-types/lib/R4";
import {IsaccCarePlanCategory} from "./model/CodeSystem";
import ErrorComponent from "./components/ErrorComponent";

interface Props {
    children: React.ReactNode;
}

export default function FhirClientProvider(props: Props): JSX.Element {

    const [client, setClient] = React.useState(null);
    const [error, setError] = React.useState('');
    const [patient, setPatient] = React.useState(null);
    const [carePlan, setCarePlan] = React.useState(null);
    const [allCarePlans, setAllCarePlans] = React.useState(null);
    const [loaded, setLoaded] = React.useState(false);

    async function getPatient(client: Client): Promise<Patient> {
        if (!client) return;
        //this is a workaround for when patient id is not embedded within the JWT token
        let queryPatientId = sessionStorage.getItem(queryPatientIdKey);
        if (queryPatientId) {
            console.log('Using stored patient id ', queryPatientId);
            return client.request('/Patient/' + queryPatientId).then((value: any) => {
                return Patient.from(value);
            });
        }
        // Get the Patient resource
        return await client.patient.read().then((value: any) => {
            return Patient.from(value);
        });
    }

    async function getCarePlans(
      client: Client,
      patientId: string,
      params: object = null
    ) {
      if (!client) return;
      const defaultParams = {
        category: IsaccCarePlanCategory.isaccMessagePlan.code,
        subject: `Patient/${patientId}`,
        _sort: "-_lastUpdated",
      };
      const searchParams = new URLSearchParams({
        ...defaultParams,
        ...(params ?? {}),
      }).toString();
      return client.request(`/CarePlan?${searchParams}`).then(
        (bundle: Bundle) => {
          if (bundle.type === "searchset") {
            if (!bundle.entry || !bundle.entry.length) {
              return null;
            }
            if (bundle.total > 1) {
              console.log(
                "Multiple ISACC CarePlans found.",
                bundle
              );
            }
            return bundle.entry.map((item) =>
              CarePlan.from(item.resource as ICarePlan)
            );
          } else {
            //setError("Unexpected bundle type returned");
            return null;
          }
        },
        (reason: any) => {
          setError(reason.toString());
          return null;
        }
      );
    }

    React.useEffect(() => {
        FHIR.oauth2.ready().then(
            (client: Client) => {
                setClient(client);
                getPatient(client)
                  .then((patientResult: Patient) => {
                    setPatient(patientResult);
                    console.log(`Loaded ${patientResult.reference}`);
                    getCarePlans(client, patientResult.id)
                      .then(
                        (carePlanResults: CarePlan[]) => {
                          const activeCarePlans = carePlanResults?.filter(
                            (item) => item.status === "active"
                          );
                          const currentCarePlan =
                            activeCarePlans?.length > 0
                              ? activeCarePlans[0]
                              : null;
                          if (currentCarePlan?.resourceType === "CarePlan") {
                            setCarePlan(activeCarePlans[0]);
                          } else {
                            setError("Unexpected resource type returned");
                          }
                          setAllCarePlans(carePlanResults);
                          if (currentCarePlan) {
                            console.log(`Loaded ${currentCarePlan.reference}`);
                          }
                          setLoaded(true);
                        },
                        (reason: any) => setError(reason)
                      )
                      .catch((e) => {
                        console.log("Error fetching CarePlan", e);
                        setError(e);
                        setLoaded(true);
                      });
                  })
                  .catch((e) => {
                    console.log("Error fetching Patient", e);
                    setError(e);
                    setLoaded(true);
                  });

            }, (reason: any) => {
                setError(reason);
                setLoaded(true);
            }
        );
    }, []);

    return (
        <FhirClientContext.Provider value={{
            client: client,
            patient: patient,
            carePlan: carePlan,
            allCarePlans: allCarePlans,
            error: error
        }}>
            <FhirClientContext.Consumer>
                {(context: FhirClientContextType) => {
                    // any auth error that may have been rejected with
                    if (context.error) {
                        return <ErrorComponent message={context.error}></ErrorComponent>;
                    }

                    // if client is already available render the subtree
                    if (loaded) {
                        return props.children;
                    }

                    // client is undefined until auth.ready() is fulfilled
                    return <Box><CircularProgress/> Authorizing...</Box>
                }}
            </FhirClientContext.Consumer>
        </FhirClientContext.Provider>
    );

}
