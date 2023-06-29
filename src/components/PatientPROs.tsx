import React from "react";
import { FhirClientContext, FhirClientContextType } from "../FhirClientContext";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import { ICoding } from "@ahryman40k/ts-fhir-types/lib/R4";
import {
  amber,
  deepOrange,
  grey,
  lightBlue,
  orange,
  red,
} from "@mui/material/colors";
import { CSSAnswerCategories } from "../model/CodeSystem";
import { Observation } from "../model/Observation";

interface PatientPROsProps {
  editable?: boolean;
  fieldsOnly?: boolean;
  onChange?: Function;
  onSave?: Function;
}

type PatientPROsState = {
  error: string;
  editable: boolean;
  mostRecentPhq9: Observation;
  mostRecentCss: Observation;
  loaded: boolean;
  saveLoading: boolean;
  saveError: boolean;
};

function colorForPhq9Obs(observation: Observation) {
  if (
    !observation ||
    !observation.valueQuantity ||
    !observation.valueQuantity.value
  )
    return grey[100];
  if (observation.valueQuantity.value < 5) return lightBlue[100];
  if (observation.valueQuantity.value < 10) return amber[100];
  if (observation.valueQuantity.value < 15) return orange[100];
  if (observation.valueQuantity.value < 20) return deepOrange[100];
  return red[100];
}

function colorForCssObs(value: Observation) {
  let answerCoding = value?.valueCodeableConcept?.coding?.find(
    (value: ICoding) => {
      return (
        CSSAnswerCategories.low.equals(value) ||
        CSSAnswerCategories.medium.equals(value) ||
        CSSAnswerCategories.high.equals(value)
      );
    }
  );
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
      loaded: true,
      editable: false,
      saveLoading: false,
      saveError: false,
    };
  }

  componentDidMount() {
    // @ts-ignore
    let context: FhirClientContextType = this.context;

    if (!context || !context.client) {
      console.log("Context not available in componentDidMount!");
      return;
    }
  }
  renderFields() {
    // @ts-ignore
    let mostRecentPhq9 = this.context.mostRecentPhq9;
    // @ts-ignore
    let mostRecentCss = this.context.mostRecentCss;
    return (
      <Stack
        direction={"column"}
        spacing={2}
        alignItems={"flex-start"}
        sx={{ marginTop: (theme) => theme.spacing(1) }}
      >
        <TextField
          label="PHQ-9 score"
          size="small"
          type="number"
          InputLabelProps={{
            shrink: true,
          }}
          margin="dense"
          defaultValue={mostRecentPhq9?.valueDisplay ?? ""}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            if (this.props.onChange) this.props.onChange();
            // @ts-ignore
            const patient = this.context.patient;
            if (mostRecentPhq9) {
              // @ts-ignore
              this.context.mostRecentPhq9 = {
                ...mostRecentPhq9,
                valueQuantity: {
                  value: parseFloat(event.target.value),
                },
              };
              return;
            }
            if (!event.target.value) return;
            // @ts-ignore
            this.context.mostRecentPhq9 = Observation.createPHQ9Observation(
              event.target.value,
              patient?.id
            );
          }}
        ></TextField>
        <TextField
          label="C-SSRS score"
          size="small"
          type="number"
          InputLabelProps={{
            shrink: true,
          }}
          defaultValue={mostRecentCss?.valueDisplay ?? ""}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            // @ts-ignore
            const patient = this.context.patient;
            if (mostRecentCss) {
              // @ts-ignore
              this.context.mostRecentCss = {
                ...mostRecentCss,
                valueQuantity: {
                  value: parseFloat(event.target.value),
                },
              };
              return;
            }
            if (!event.target.value) return;
            // @ts-ignore
            this.context.mostRecentCss = Observation.createCSSObservation(
              event.target.value,
              patient?.id
            );
          }}
        ></TextField>
      </Stack>
    );
  }

  renderEditView() {
    return (
      <Stack
        direction={"column"}
        alignItems={"flex-start"}
        spacing={2}
        sx={{ padding: (theme) => theme.spacing(1), marginTop: 1 }}
      >
        {this.renderFields()}
        <Box sx={{ m: 1, position: "relative" }}>
          <Button
            variant="outlined"
            disabled={this.state.saveLoading}
            startIcon={<SaveIcon></SaveIcon>}
            size="small"
            fullWidth
            onClick={() => {
              // @ts-ignore
              const mostRecentPhq9 = this.context.mostRecentPhq9;
              // @ts-ignore
              const mostRecentCss = this.context.mostRecentCss;
              // @ts-ignore
              const client = this.context.client;
              const requests = [];
              if (mostRecentPhq9) {
                let phq9Request;
                if (mostRecentPhq9.id) {
                  phq9Request = client.update(mostRecentPhq9);
                } else {
                  phq9Request = client.create(mostRecentPhq9);
                }
                requests.push(phq9Request);
              }
              if (mostRecentCss) {
                let cssRequest;
                if (mostRecentCss.id) {
                  cssRequest = client.update(mostRecentCss);
                } else {
                  cssRequest = client.create(mostRecentCss);
                }
                requests.push(cssRequest);
              }

              if (!requests.length) {
                this.setState({
                  editable: false,
                });
                return;
              }

              this.setState({
                saveLoading: true,
              });

              Promise.all(requests)
                .then((results) => {
                  if (this.props.onSave) this.props.onSave();
                  this.setState({
                    saveLoading: false,
                    editable: false,
                  });
                  // @ts-ignore
                  this.context.mostRecentPhq9 = Observation.from(results[0]);
                  // @ts-ignore
                  this.context.mostRecentCss = Observation.from(results[1]);
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
      </Stack>
    );
  }

  renderDisplayView() {
    // @ts-ignore
    const mostRecentPhq9 = this.context.mostRecentPhq9;
    // @ts-ignore
    const mostRecentCss = this.context.mostRecentCss;
    return (
      <Stack
        direction={"column"}
        alignItems={"flex-start"}
        spacing={2}
        sx={{ padding: (theme) => theme.spacing(1) }}
      >
        {!this.state.editable && (
          <>
            <LabeledValueBubble
              title={"PHQ-9"}
              value={mostRecentPhq9?.valueDisplay ?? "-"}
              backgroundColor={colorForPhq9Obs(mostRecentPhq9)}
            />
            <LabeledValueBubble
              title={"C-SSRS"}
              value={mostRecentCss?.valueDisplay ?? "-"}
              backgroundColor={colorForCssObs(mostRecentCss)}
            />
            <Button
              startIcon={<EditIcon></EditIcon>}
              onClick={() => this.setState({ editable: true })}
              variant="outlined"
              size="small"
            >
              Update scores
            </Button>
          </>
        )}
      </Stack>
    );
  }

  renderTitle() {
    return <Typography variant={"h6"}>{"Suicide risk scores"}</Typography>;
  }

  render(): React.ReactNode {
    if (!this.state) return <CircularProgress />;

    if (this.state.error)
      return <Alert severity={"error"}>{this.state.error}</Alert>;

    if (!this.state.loaded) return <CircularProgress />;

    if (this.props.fieldsOnly) {
      return (
        <>
          {this.renderTitle()}
          {this.renderFields()}
        </>
      );
    }

    return (
      <>
        {this.renderTitle()}
        {this.state.editable && this.renderEditView()}
        {!this.state.editable && this.renderDisplayView()}
      </>
    );
  }
}

const LabeledValueBubble = (props: {
  title: string;
  value: string;
  backgroundColor: string;
}) => (
  <Stack alignItems={"center"}>
    <Typography
      variant={"body2"}
      color={"text.secondary"}
      sx={{ marginBottom: 0.5 }}
    >
      {props.title}
    </Typography>
    <Typography
      variant={"h6"}
      sx={{
        borderRadius: "50px",
        paddingTop: 1,
        marginTop: 0,
        paddingBottom: 2,
        paddingLeft: 2,
        paddingRight: 2,
        color: "#000",
        backgroundColor: props.backgroundColor,
      }}
    >
      {props.value}
    </Typography>
  </Stack>
);
