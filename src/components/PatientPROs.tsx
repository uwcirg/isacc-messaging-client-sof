import React from 'react';
import {FhirClientContext, FhirClientContextType} from '../FhirClientContext';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import Client from "fhirclient/lib/Client";
import {Bundle} from "../model/Bundle";
import Patient from "../model/Patient";
import {ICoding, IObservation} from "@ahryman40k/ts-fhir-types/lib/R4";
import {amber, deepOrange, grey, lightBlue, orange, red} from "@mui/material/colors";
import {CSSAnswerCategories} from "../model/CodeSystem";
import {Observation} from "../model/Observation";

interface PatientPROsProps {
   editable: boolean
}

type PatientPROsState = {
    error: string;
    mostRecentPhq9: Observation,
    mostRecentCss: Observation,
    loaded: boolean,
    saveLoading: boolean,
    saveError: boolean,
    saveFeedbackOpen: boolean
}

function colorForPhq9Obs(observation: Observation) {
    if (!observation || !observation.valueQuantity || !observation.valueQuantity.value) return grey[100];
    if (observation.valueQuantity.value < 5) return lightBlue[100];
    if (observation.valueQuantity.value < 10) return amber[100];
    if (observation.valueQuantity.value < 15) return orange[100];
    if (observation.valueQuantity.value < 20) return deepOrange[100];
    return red[100];
}

function colorForCssObs(value: Observation) {
    let answerCoding = value?.valueCodeableConcept?.coding?.find((value: ICoding) => {
        return CSSAnswerCategories.low.equals(value) || CSSAnswerCategories.medium.equals(value) || CSSAnswerCategories.high.equals(value);
    });
    if (!answerCoding) return grey[100];
    if (CSSAnswerCategories.low.equals(answerCoding)) return lightBlue[100];
    if (CSSAnswerCategories.medium.equals(answerCoding)) return amber[100];
    return red[100];
}

export default class PatientPROs extends React.Component<PatientPROsProps, PatientPROsState> {
  static contextType = FhirClientContext;

  constructor(props: Readonly<PatientPROsProps> | PatientPROsProps) {
    super(props);
    this.state = {
      error: "",
      mostRecentPhq9: null,
      mostRecentCss: null,
      loaded: false,
      saveLoading: false,
      saveError: false,
      saveFeedbackOpen: false,
    };
  }

  componentDidMount() {
    // @ts-ignore
    let context: FhirClientContextType = this.context;

    if (!context || !context.client) {
      console.log("Context not available in componentDidMount!");
      return;
    }

    this.getPROs(context.client, context.patient);
  }

  private PHQ_OBS_CODE = "44261-6";
  private CSS_OBS_CODE = "93373-9";

  private async getPROs(client: Client, patient: Patient) {
    let phqRequest = this.getObs(client, patient, this.PHQ_OBS_CODE);
    let cssRequest = this.getObs(client, patient, this.CSS_OBS_CODE);
    await Promise.all([phqRequest, cssRequest])
      .then(
        (results) => {
          console.log("Loaded Observations:", results);
          this.setState({
            mostRecentPhq9: Observation.from(results[0]),
            mostRecentCss: Observation.from(results[1]),
            loaded: true,
          });
        },
        (reason: any) => {
          console.log("Error", reason);
          this.setState({ error: reason });
        }
      )
      .catch((e) => {
        console.log("Error", e);
        this.setState({ error: e });
      });
  }

  private getObs(
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
    return client.request(`/Observation?${params}`).then(
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

  renderEditView() {
    return (
      <Stack direction={"column"} spacing={2} sx={{ marginTop: 1 }}>
        <TextField
          label="PHQ-9 score"
          size="small"
          type="number"
          defaultValue={this.state.mostRecentPhq9?.valueDisplay ?? ""}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            // @ts-ignore
            const patient = this.context.patient;
            if (this.state.mostRecentPhq9) {
              this.setState({
                mostRecentPhq9: {
                  ...this.state.mostRecentPhq9,
                  valueQuantity: {
                    value: parseFloat(event.target.value),
                  },
                } as Observation,
              });
              return;
            }
            this.setState({
              mostRecentPhq9: Observation.create(
                this.PHQ_OBS_CODE,
                "http://loinc.org",
                "PHQ9 score",
                event.target.value,
                patient?.id
              ),
            });
          }}
        ></TextField>
        <TextField
          label="C-SSRS score"
          size="small"
          type="number"
          defaultValue={this.state.mostRecentCss?.valueDisplay ?? ""}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            // @ts-ignore
            const patient = this.context.patient;
            if (this.state.mostRecentCss) {
              this.setState({
                mostRecentCss: {
                  ...this.state.mostRecentCss,
                  valueQuantity: {
                    value: parseFloat(event.target.value),
                  },
                } as Observation,
              });
              return;
            }
            this.setState({
              mostRecentCss: Observation.create(
                this.CSS_OBS_CODE,
                "http://loinc.org",
                "C-SSRS score",
                event.target.value,
                patient?.id
              ),
            });
          }}
        ></TextField>
        <Box sx={{ m: 1, position: "relative" }}>
          <Button
            variant="outlined"
            disabled={this.state.saveLoading}
            startIcon={<SaveIcon></SaveIcon>}
            fullWidth
            onClick={() => {
              if (!this.state.mostRecentPhq9 && !this.state.mostRecentCss) {
                return;
              }
              // @ts-ignore
              const client = this.context.client;
              const requests = [];
              if (this.state.mostRecentPhq9) {
                let phq9Request;
                if (this.state.mostRecentPhq9.id) {
                  phq9Request = client.update(this.state.mostRecentPhq9);
                } else {
                  phq9Request = client.create(this.state.mostRecentPhq9);
                }
                requests.push(phq9Request);
              }
              if (this.state.mostRecentCss) {
                let cssRequest;
                if (this.state.mostRecentCss.id) {
                  cssRequest = client.update(this.state.mostRecentCss);
                } else {
                  cssRequest = client.create(this.state.mostRecentCss);
                }
                requests.push(cssRequest);
              }

              if (!requests.length) return;

              this.setState({
                saveLoading: true,
              });

              Promise.all(requests)
                .then(() => {
                  this.setState({
                    saveLoading: false,
                    saveFeedbackOpen: true,
                  });
                })
                .catch((e) => {
                  console.log("Error saving observations ", e);
                  this.setState({
                    saveError: true,
                    saveLoading: false,
                  });
                });
            }}
          >
            Save scores
          </Button>
          {this.state.saveLoading && (
            <CircularProgress
              size={24}
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                marginTop: "-12px",
                marginLeft: "-12px",
              }}
            />
          )}
        </Box>
        {this.state.saveError && (
          <Alert severity="error">
            There was an error saving the scores. Please see console for detail.
          </Alert>
        )}
        <Snackbar
          open={this.state.saveFeedbackOpen}
          autoHideDuration={1000}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          onClose={(event: React.SyntheticEvent | Event, reason?: string) => {
            if (reason === "clickaway") {
              return;
            }
            this.setState({
              saveFeedbackOpen: false,
            });
          }}
        >
          <Alert severity="success">Scores are saved successfully.</Alert>
        </Snackbar>
      </Stack>
    );
  }

  render(): React.ReactNode {
    if (!this.state) return <CircularProgress />;

    if (this.state.error)
      return <Alert severity={"error"}>{this.state.error}</Alert>;

    if (!this.state.loaded) return <CircularProgress />;

    return (
      <>
        <Typography variant={"h6"}>{"Suicide risk scores"}</Typography>
        <Stack
          direction={"column"}
          alignItems={"flex-start"}
          spacing={2}
          sx={{ padding: (theme) => theme.spacing(1) }}
        >
          {this.props.editable && this.renderEditView()}
          {!this.props.editable && (
            <>
              <LabeledValueBubble
                title={"PHQ-9"}
                value={this.state.mostRecentPhq9?.valueDisplay ?? "-"}
                backgroundColor={colorForPhq9Obs(this.state.mostRecentPhq9)}
              />
              <LabeledValueBubble
                title={"C-SSRS"}
                value={this.state.mostRecentCss?.valueDisplay ?? "-"}
                backgroundColor={colorForCssObs(this.state.mostRecentCss)}
              />
            </>
          )}
        </Stack>
      </>
    );
  }
}

const LabeledValueBubble = (props: { title: string, value: string, backgroundColor: string }) => <Stack
    alignItems={"center"}>
        <Typography variant={"body2"} color={"text.secondary"} sx={{marginBottom: 0.5}}>
            {props.title}
        </Typography>
        <Typography variant={"h6"} sx={{
            borderRadius: "50px",
            paddingTop: 1,
            marginTop: 0,
            paddingBottom: 2,
            paddingLeft: 2,
            paddingRight: 2,
            color: "#000",
            backgroundColor: props.backgroundColor
        }}>
            {props.value}
        </Typography>
</Stack>;
