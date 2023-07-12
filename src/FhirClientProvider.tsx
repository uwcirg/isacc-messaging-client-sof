import React from "react";
import FHIR from "fhirclient";
import { FhirClientContext, FhirClientContextType } from "./FhirClientContext";
import { Box, Stack } from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
import Client from "fhirclient/lib/Client";
import { queryPatientIdKey } from "./util/util";
import { getFhirData, getUserEmail } from "./util/isacc_util";
import { Observation } from "./model/Observation";
import Patient from "./model/Patient";
import Practitioner from "./model/Practitioner";
import CareTeam from "./model/CareTeam";
import CarePlan from "./model/CarePlan";
import { Bundle } from "./model/Bundle";
import {
  ICarePlan,
  IReference,
  IObservation,
} from "@ahryman40k/ts-fhir-types/lib/R4";
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
  const [careTeam, setCareTeam] = React.useState(null);
  const [mostRecentPhq9, setMostRecentPhq9] = React.useState(null);
  const [mostRecentCss, setMostRecentCss] = React.useState(null);
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

  async function getCareTeam(
    client: Client,
    careTeamReference: IReference
  ): Promise<CareTeam> {
    if (!careTeamReference || !careTeamReference.reference) return;
    const id = careTeamReference.reference.split("/")[1];
    if (!id) return;
    return getFhirData(client, `/CareTeam/${id}`)
      .then((result: any) => {
        if (!result) {
          return null;
        }
        return CareTeam.from(result);
      })
      .catch((e) => {
        console.log("Error getting CareTeam resource ", e);
        setError(
          "Unable to retrieve CareTeam resource.  See console for detail"
        );
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

  function getObs(
    client: Client,
    patient: Patient,
    code: string
  ): Promise<IObservation> {
    let params = new URLSearchParams({
      subject: `${patient.reference}`,
      code: code,
      _sort: "-date",
      _count: "1",
    }).toString();
    return getFhirData(client, `/Observation?${params}`).then(
      (bundle: Bundle) => {
        if (bundle.type === "searchset") {
          if (!bundle.entry) return null;

          let obs: IObservation[] = bundle.entry.map((entry) => {
            if (entry.resource.resourceType !== "Observation") {
              throw new Error("Unexpected resource type returned");
            } else {
              console.log("IObservation loaded:", entry.resource);
              let obs: IObservation = entry.resource as IObservation;
              return obs;
            }
          });
          if (obs.length > 1)
            throw new Error("More than 1 Observation.ts returned");
          return obs[0];
        } else {
          throw new Error("Unexpected bundle type returned");
        }
      },
      (reason: any) => {
        throw new Error(reason.toString());
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
          const hasPatientResult = results.find(
            (result) => result.value && result.value.resourceType === "Patient"
          );
          if (!hasPatientResult) {
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
              Promise.allSettled([
                getCarePlans(client, resourceResult.id),
                getObs(client, resourceResult, Observation.PHQ9_OBS_CODE),
                getObs(client, resourceResult, Observation.CSS_OBS_CODE),
              ]).then((results: any[]) => {
                if (results[0].status === "rejected") {
                  setError(
                    "Unable to load patient's care plan. See console for detail."
                  );
                  console.log("Error loading carePlan ", results[0].reason);
                } else {
                  const carePlanResults: CarePlan[] = results[0].value;
                  const activeCarePlans = carePlanResults?.filter(
                    (item) => item.status === "active"
                  );
                  const mostRecentCarePlan =
                    activeCarePlans?.length > 0 ? activeCarePlans[0] : null;
                  if (mostRecentCarePlan?.resourceType === "CarePlan") {
                    setCurrentCarePlan(mostRecentCarePlan);
                  }
                  if (mostRecentCarePlan) {
                    console.log(`Loaded ${mostRecentCarePlan.reference}`);
                  }
                  setAllCarePlans(carePlanResults);
                  if (
                    mostRecentCarePlan &&
                    mostRecentCarePlan.careTeam &&
                    mostRecentCarePlan.careTeam.length
                  ) {
                    getCareTeam(client, mostRecentCarePlan.careTeam[0]).then(
                      (result: CareTeam) => {
                        if (result) {
                          setCareTeam(result);
                        } else {
                          setCareTeam(CareTeam.create([], resourceResult.id));
                        }
                        setLoaded(true);
                      }
                    );
                  } else {
                    setCareTeam(CareTeam.create([], resourceResult.id));
                    setLoaded(true);
                  }
                }

                if (results[1]?.value) {
                  setMostRecentPhq9(Observation.from(results[1].value));
                  console.log(`Loading PHQ9 result `, results[1].value);
                }
                if (results[2]?.value) {
                  setMostRecentCss(Observation.from(results[2].value));
                  console.log(`Loading CSS result `, results[2].value);
                }

                if (results[1]?.status === "rejected") {
                  console.log("Error loading PHQ9 result ", results[1].reason);
                }

                if (results[2]?.status === "rejected") {
                  console.log("Error loading CSS result ", results[2].reason);
                }
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
        careTeam: careTeam,
        mostRecentPhq9: mostRecentPhq9,
        mostRecentCss: mostRecentCss,
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
            <Stack
              direction={"row"}
              spacing={2}
              alignItems={"center"}
              sx={{ padding: (theme) => theme.spacing(2) }}
            >
              <CircularProgress />
              <Box>Authorizing...</Box>
            </Stack>
          );
        }}
      </FhirClientContext.Consumer>
    </FhirClientContext.Provider>
  );
}
