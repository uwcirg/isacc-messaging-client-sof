import React from "react";
import { FhirClientContext, FhirClientContextType } from "../FhirClientContext";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  FormControl,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import { ICoding } from "@ahryman40k/ts-fhir-types/lib/R4";
import {
  grey,
  lightBlue,
  orange,
  red,
} from "@mui/material/colors";
import { CSSAnswerCategories, PHQ9SeverityCategories } from "../model/CodeSystem";
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
  mostRecentPHQ9: Observation;
  mostRecentCSS: Observation;
  selectedPHQ9Code: string;
  selectedCSSCode: string;
  loaded: boolean;
  saveLoading: boolean;
  saveError: boolean;
};

function colorForPhq9Obs(value: Observation) {
  let answerCoding = value?.valueCodeableConcept?.coding?.find(
    (value: ICoding) => {
      return (
        PHQ9SeverityCategories.low.equals(value) ||
        PHQ9SeverityCategories.medium.equals(value) ||
        PHQ9SeverityCategories.high.equals(value)
      );
    }
  );
  if (!answerCoding) return grey[100];
  if (PHQ9SeverityCategories.low.equals(answerCoding)) return lightBlue[100];
  if (PHQ9SeverityCategories.medium.equals(answerCoding)) return orange[100];
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
  if (CSSAnswerCategories.medium.equals(answerCoding)) return orange[100];
  return red[100];
}

export default class PatientPROs extends React.Component<PatientPROsProps, PatientPROsState> {
  static contextType = FhirClientContext;

  constructor(props: Readonly<PatientPROsProps> | PatientPROsProps) {
    super(props);
    this.state = {
      error: "",
      mostRecentPHQ9: null,
      mostRecentCSS: null,
      selectedPHQ9Code: null,
      selectedCSSCode: null,
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
    // @ts-ignore
    let mostRecentPhq9 = this.context.mostRecentPhq9;
    // @ts-ignore
    let mostRecentCss = this.context.mostRecentCss;
    this.setState({
      mostRecentCSS: mostRecentCss,
      mostRecentPHQ9: mostRecentPhq9,
      selectedPHQ9Code: mostRecentPhq9?.valueCodeableConcept?.coding[0]?.code,
      selectedCSSCode: mostRecentCss?.valueCodeableConcept?.coding[0]?.code,
    });
  }
  renderFields() {
    return (
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={6}
        alignItems={"flex-start"}
        sx={{ margin: (theme) => theme.spacing(0, 0, 2) }}
      >
        <FormControl>
          <FormLabel id="phq9-radio-buttons-group-label">Acute suicide risk</FormLabel>
          <RadioGroup
            aria-labelledby="phq9-radio-buttons-group-label"
            name="phq9-radio-buttons-group"
            value={this.state.selectedPHQ9Code}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              // @ts-ignore
              let mostRecentPhq9 = this.context.mostRecentPhq9;
              if (this.props.onChange) this.props.onChange();
              // @ts-ignore
              const patient = this.context.patient;
              // TODO find appropriate coding for this
              const targetCategory = Object.values(
                PHQ9SeverityCategories
              ).filter((o: ICoding) => o.code === event.target.value)[0];
              let newAnswer = Observation.createPHQ9Observation(
                targetCategory,
                patient?.id
              );
              if (mostRecentPhq9) {
                newAnswer.id = mostRecentPhq9.id;
              }
              // @ts-ignore
              this.context.mostRecentPhq9 = newAnswer;
              this.setState({
                selectedPHQ9Code: event.target.value,
                mostRecentPHQ9: newAnswer,
              });
            }}
          >
            {Object.keys(PHQ9SeverityCategories).map(
              (category: string, index: number) => (
                <FormControlLabel
                  value={
                    ((PHQ9SeverityCategories as any)[category] as ICoding).code
                  }
                  slotProps={{
                    typography: {
                      sx: {
                        textTransform: "capitalize",
                      },
                    },
                  }}
                  control={<Radio />}
                  label={category}
                  key={`phq9_label_${category}_${index}`}
                />
              )
            )}
          </RadioGroup>
        </FormControl>
        <FormControl>
          <FormLabel id="css-radio-buttons-group-label">Chronic suicide risk</FormLabel>
          <RadioGroup
            aria-labelledby="css-radio-buttons-group-label"
            name="css-radio-buttons-group"
            value={this.state.selectedCSSCode}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              // @ts-ignore
              let mostRecentCss = this.context.mostRecentCss;
              // @ts-ignore
              const patient = this.context.patient;
              // TODO find appropriate coding for this
              const targetCategory = Object.values(CSSAnswerCategories).filter(
                (o: ICoding) => o.code === event.target.value
              )[0];

              let newAnswer = Observation.createCSSObservation(
                targetCategory,
                patient?.id
              );

              if (mostRecentCss) {
                newAnswer.id = mostRecentCss.id;
              }
            
              // @ts-ignore
              this.context.mostRecentCss = newAnswer;

              this.setState({
                selectedCSSCode: event.target.value,
                mostRecentCSS: newAnswer,
              });
            }}
          >
            {Object.keys(CSSAnswerCategories).map(
              (category: string, index: number) => (
                <FormControlLabel
                  value={
                    ((CSSAnswerCategories as any)[category] as ICoding).code
                  }
                  control={<Radio />}
                  label={category}
                  key={`css_label_${category}_${index}`}
                  slotProps={{
                    typography: {
                      sx: {
                        textTransform: "capitalize",
                      },
                    },
                  }}
                />
              )
            )}
          </RadioGroup>
        </FormControl>
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
            sx={{minWidth: "120px"}}
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
            Save
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
            There was an error saving the data. Please see console for detail.
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
            <Stack alignItems={"center"} spacing={2.5} sx={{ marginBottom: 1 }}>
              <LabeledValueBubble
                title={"Acute suicide risk"}
                value={mostRecentPhq9?.valueDisplay ?? "-"}
                backgroundColor={colorForPhq9Obs(mostRecentPhq9)}
              />
              <LabeledValueBubble
                title={"Chronic suicide risk"}
                value={mostRecentCss?.valueDisplay ?? "-"}
                backgroundColor={colorForCssObs(mostRecentCss)}
              />
            </Stack>
            <Button
              startIcon={<EditIcon></EditIcon>}
              onClick={() => this.setState({ editable: true })}
              variant="outlined"
              size="small"
              sx={{minWidth: "120px"}}
            >
              Update
            </Button>
          </>
        )}
      </Stack>
    );
  }

  renderTitle() {
    return <Typography variant={"h6"}>{"Suicide risk level"}</Typography>;
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
        borderRadius: "100vmax",
        paddingTop: 2,
        marginTop: 0,
        paddingBottom: 2,
        paddingLeft: 2,
        paddingRight: 2,
        color: "#000",
        backgroundColor: props.backgroundColor,
        textTransform: "capitalize"
      }}
    >
      {props.value}
    </Typography>
  </Stack>
);
