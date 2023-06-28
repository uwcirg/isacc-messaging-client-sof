import React from "react";
import FHIR from "fhirclient";
import { FhirClientContext, FhirClientContextType } from "./FhirClientContext";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Client from "fhirclient/lib/Client";
import { queryPatientIdKey } from "./util/util";
import { getFhirData, getUserEmail } from "./util/isacc_util";
import Patient from "./model/Patient";
import Practitioner from "./model/Practitioner";
import CarePlan from "./model/CarePlan";
import { Bundle } from "./model/Bundle";
import { ICarePlan } from "@ahryman40k/ts-fhir-types/lib/R4";
import { IsaccCarePlanCategory } from "./model/CodeSystem";
import ErrorComponent from "./components/ErrorComponent";

interface Props {
  children: React.ReactNode;
}

export default function FhirClientProvider(props: Props): JSX.Element {
  const [client, setClient] = React.useState(null);
  const [error, setError] = React.useState("");
  const [patient, setPatient] = React.useState(null);
  const [practitioner, setPractitioner] = React.useState(null);
  const [currentCarePlan, setCurrentCarePlan] = React.useState(null);
  const [allCarePlans, setAllCarePlans] = React.useState(null);
  const [loaded, setLoaded] = React.useState(false);

  async function getPatient(client: Client): Promise<Patient> {
    if (!client) return;
    //this is a workaround for when patient id is not embedded within the JWT token
    let queryPatientId = sessionStorage.getItem(queryPatientIdKey);
    if (queryPatientId) {
      console.log("Using stored patient id ", queryPatientId);
      return getFhirData(client, "/Patient/" + queryPatientId).then(
        (value: any) => {
          return Patient.from(value);
        }
      );
    }
    // Get the Patient resource
    return await client.patient.read().then((value: any) => {
      return Patient.from(value);
    });
  }

  async function getPractitioner(
    client: Client,
    email: string
  ): Promise<Practitioner> {
    if (!client || !email) return;
    return getFhirData(
      client,
      `/Practitioner?telecom=${encodeURIComponent(email)}`
    )
      .then((bundle: Bundle) => {
        if (!bundle.entry || !bundle.entry.length) {
          return null;
        }
        return Practitioner.from(bundle.entry[0].resource as Practitioner);
      })
      .catch((e) => {
        setError(e);
        return null;
      });
  }

  async function getCarePlans(client: Client, patientId: string) {
    if (!client) return;
    const searchParams = new URLSearchParams({
      category: IsaccCarePlanCategory.isaccMessagePlan.code,
      subject: `Patient/${patientId}`,
      _sort: "-_lastUpdated",
    }).toString();
    return getFhirData(client, `/CarePlan?${searchParams}`).then(
      (bundle: Bundle) => {
        if (bundle.type === "searchset") {
          if (!bundle.entry || !bundle.entry.length) {
            return null;
          }
          if (bundle.total > 1) {
            console.log("Multiple ISACC CarePlans found.", bundle);
          }
          return bundle.entry.map((item) =>
            CarePlan.from(item.resource as ICarePlan)
          );
        } else {
          setError("Unexpected bundle type returned");
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
        Promise.allSettled([
          getPractitioner(client, getUserEmail(client)),
          getPatient(client),
        ]).then((results: any[]) => {
          // check if patient resource is returned
          const hasResults = results.find(
            (result) => result.value && result.value.resourceType === "Patient"
          );
          if (!hasResults) {
            setError("No matching patient data returned.");
            setLoaded(true);
          }
          results.forEach((result) => {
            if (result.status === "rejected") {
              console.log("Promise error ", result.reason);
              return true;
            }
            const resourceResult = result.value;
            const resourceType = resourceResult?.resourceType;
            if (resourceType === "Practitioner") {
              console.log("Loaded practitioner ", resourceResult);
              setPractitioner(resourceResult);
            } else if (resourceType === "Patient") {
              setPatient(resourceResult);
              console.log(`Loaded ${resourceResult.reference}`);
              getCarePlans(client, resourceResult.id)
                .then(
                  (carePlanResults: CarePlan[]) => {
                    const activeCarePlans = carePlanResults?.filter(
                      (item) => item.status === "active"
                    );
                    const currentCarePlan =
                      activeCarePlans?.length > 0 ? activeCarePlans[0] : null;
                    if (currentCarePlan?.resourceType === "CarePlan") {
                      setCurrentCarePlan(activeCarePlans[0]);
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
            } // end if Patient
          });
        });
      },
      (reason: any) => {
        setError(reason);
        setLoaded(true);
      }
    );
  }, []);

  return (
    <FhirClientContext.Provider
      value={{
        client: client,
        patient: patient,
        practitioner: practitioner,
        currentCarePlan: currentCarePlan,
        allCarePlans: allCarePlans,
        error: error,
      }}
    >
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
          return (
            <Box>
              <CircularProgress /> Authorizing...
            </Box>
          );
        }}
      </FhirClientContext.Consumer>
    </FhirClientContext.Provider>
  );
}
