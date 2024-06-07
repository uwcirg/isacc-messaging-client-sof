import {AppPageScaffold} from "./AppPage";
import ScheduleSetup from "./ScheduleSetup";
import React from "react";
import {FhirClientContext, FhirClientContextType} from "../FhirClientContext";
import Client from "fhirclient/lib/Client";
import {CommunicationRequest} from "../model/CommunicationRequest";
import {makeCarePlan} from "../model/modelUtil";
import {
    Alert,
    AlertTitle,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Typography
} from "@mui/material";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import moment from "moment";
import {DateTimePicker} from "@mui/x-date-pickers/DateTimePicker";
import CarePlan from "../model/CarePlan";
import {IsaccMessageCategory} from "../model/CodeSystem";
import {IBundle_Entry, ICommunicationRequest} from "@ahryman40k/ts-fhir-types/lib/R4";
import {getFhirData} from "../util/isacc_util";
import Patient from "../model/Patient";
import {Bundle} from "../model/Bundle";

type EnrollmenAppState = {
    activeCarePlan: CarePlan;
    editMode: boolean;
    error: string;
    carePlanStartDate: Date | null;
    selectedCarePlanStartDate: Date | null;
    startDateModalOpen: boolean;
}

export default class EnrollmentApp extends React.Component<{}, EnrollmenAppState> {
  static contextType = FhirClientContext;

  constructor(props: {}) {
    super(props);
    this.state = {
      activeCarePlan: null,
      editMode: null,
      error: null,
      carePlanStartDate: null,
      selectedCarePlanStartDate: null,
      startDateModalOpen: true,
    };
  }

  createNewCarePlan(newDate: Date | null = null): CarePlan {
    //@ts-ignore
    let patient: Patient = this.context.patient;
    //@ts-ignore
    let ctxPlanDefinition = this.context.planDefinition;

    let replacements: { [key: string]: string } = {};

    const messages: CommunicationRequest[] =
      ctxPlanDefinition.createMessageList(patient, replacements, newDate);
    const carePlan = makeCarePlan(patient, messages, newDate);

    return carePlan;
  }

  discontinueExistingCarePlan() {
    // @ts-ignore
    let client: Client = this.context.client;
    //@ts-ignore
    let existingCarePlan: CarePlan = this.context.currentCarePlan;
    //@ts-ignore
    let patient: Patient = this.context.patient;

    let params = new URLSearchParams({
      recipient: `Patient/${patient.id}`,
      category: IsaccMessageCategory.isaccScheduledMessage.code,
      status: "active",
      "based-on": existingCarePlan.reference,
      _sort: "occurrence",
      _count: "1000",
    }).toString();

    getFhirData(client, `CommunicationRequest?${params}`)
      .then((bundle: Bundle) => {
        if (bundle.type !== "searchset") {
          this.setState({
            error: `Unexpected bundle type returned: ${bundle.type}`,
          });
          return null;
        }
        if (!bundle.entry) {
          return null;
        }
        let crsToRevoke: CommunicationRequest[] = bundle.entry.map(
          (e: IBundle_Entry) => {
            if (e.resource.resourceType === "CommunicationRequest") {
              return CommunicationRequest.from(
                e.resource as ICommunicationRequest
              );
            } else {
              this.setState({
                error: `Unexpected resource type returned: ${e.resource.resourceType}`,
              });
              return null;
            }
          }
        );
        crsToRevoke.forEach((cr) => {
          cr.status = "revoked";
          client
            .update(cr)
            .then(
              //onfulfilled
              (value) =>
                console.log(
                  `CommunicationRequest/${cr.id} successfully revoked:`,
                  value
                ),
              //onrejected
              (rejectionReason) =>
                console.log(
                  `CommunicationRequest/${cr.id} revocation rejected:`,
                  rejectionReason
                )
            )
            .catch((errorReason) =>
              console.log(
                `CommunicationRequest/${cr.id} revocation caused error:`,
                errorReason
              )
            );
        });
      })
      .then(() => {
        existingCarePlan.status = "revoked";
        client
          .update(existingCarePlan)
          .then(
            //onfulfilled
            (value) =>
              console.log(
                `CarePlan/${existingCarePlan.id} revocation successful:`,
                value
              ),
            //onrejected
            (rejectionReason) =>
              console.log(
                `CarePlan/${existingCarePlan.id} revocation rejected:`,
                rejectionReason
              )
          )
          .catch((errorReason) =>
            console.log(
              `CarePlan/${existingCarePlan.id} revocation caused error:`,
              errorReason
            )
          );
      });
  }

  componentDidMount() {
    if (!this.state || !this.context) return;

    //@ts-ignore
    let existingCarePlan: CarePlan = this.context.currentCarePlan;
    if (existingCarePlan) {
      const startDate = existingCarePlan.period?.start
        ? existingCarePlan.period?.start
        : existingCarePlan.created;
      this.setState({
        carePlanStartDate: new Date(startDate),
      });
    }
  }

  private handleSetEditModeFalse() {
    this.discontinueExistingCarePlan();
    this.setState({ carePlanStartDate: null, editMode: false });
  }

  private handleSetEditModeTrue() {
    //@ts-ignore
    let context: FhirClientContextType = this.context;

    let client: Client = context.client;
    let patient: Patient = context.patient;
    let existingCarePlan: CarePlan = context.currentCarePlan;

    //load associated communication requests
    let params = new URLSearchParams({
      recipient: `Patient/${patient.id}`,
      "based-on": `CarePlan/${existingCarePlan.id}`,
      category: IsaccMessageCategory.isaccScheduledMessage.code,
    }).toString();
    getFhirData(client, `CommunicationRequest?${params}`).then(
      (bundle: Bundle) => {
        if (bundle.type === "searchset") {
          if (!bundle?.entry) {
            if (existingCarePlan) {
              // set communication requests for current care plan to empty array
              existingCarePlan.setCommunicationRequests([]);
            }
            context.currentCarePlan = existingCarePlan;
            this.setState({ activeCarePlan: existingCarePlan, editMode: true });
            return [];
          }
          let crs: CommunicationRequest[] = bundle.entry.map(
            (e: IBundle_Entry) => {
              if (e.resource.resourceType !== "CommunicationRequest") {
                this.setState({ error: "Unexpected resource type returned" });
                return null;
              } else {
                console.log("CommunicationRequest loaded:", e);
                return CommunicationRequest.from(e.resource);
              }
            }
          );
          existingCarePlan.setCommunicationRequests(crs);
          context.currentCarePlan = existingCarePlan;
          this.setState({ activeCarePlan: existingCarePlan, editMode: true });
        } else {
          this.setState({ error: "Unexpected bundle type returned" });
          return null;
        }
      }
    );
  }

  getCarePlanStartDateModalView(): JSX.Element {
    const handleClose = (event: any = null, reason: String = null) => {
      if (reason && reason === "backdropClick") return;
      this.setState({
        startDateModalOpen: false,
      });
    };
    const handleSubmit = () => {
      let cp = this.createNewCarePlan(this.state.selectedCarePlanStartDate);
      //@ts-expect-error
      this.context.currentCarePlan = cp;
      this.setState({
        carePlanStartDate: this.state.selectedCarePlanStartDate ?? new Date(),
        startDateModalOpen: false,
        activeCarePlan: cp,
      });
    };
    const selectedValue = this.state.selectedCarePlanStartDate
      ? moment.isMoment(this.state.selectedCarePlanStartDate)
        ? this.state.selectedCarePlanStartDate
        : moment(this.state.selectedCarePlanStartDate)
      : moment();
    return (
      <Dialog
        open={this.state.startDateModalOpen}
        onClose={handleClose}
        aria-labelledby="careplan-date-dialog-title"
        aria-describedby="careplan-date-dialog-description"
      >
        <DialogTitle id="careplan-date-dialog-title">
          {"Please specify the CarePlan start date"}
        </DialogTitle>
        <DialogContent sx={{ padding: (theme) => theme.spacing(2.5, 3, 2) }}>
          <Box
            id="careplan-date-dialog-description"
            sx={{ padding: (theme) => theme.spacing(1, 0, 0) }}
          >
            <LocalizationProvider dateAdapter={AdapterMoment}>
              <DateTimePicker
                label="Start date & time"
                // @ts-ignore
                value={selectedValue ?? moment()}
                format="ddd, MM/DD/YYYY hh:mm A" // example output display: Thu, 03/09/2023 09:34 AM
                onChange={(newValue: moment.Moment | null) => {
                  this.setState({
                    selectedCarePlanStartDate: newValue.toDate(),
                  });
                }}
                slotProps={{
                  textField: {
                    //@ts-ignore
                    onChange: (value: moment.Moment, validationContext) => {
                      if (!value) return;
                      const validationError =
                        validationContext?.validationError;
                      if (!validationError) {
                        this.setState({
                          selectedCarePlanStartDate: value.toDate(),
                        });
                      }
                    },
                  },
                }}
                sx={{
                  width: "100%",
                  minWidth: "264px",
                  flexGrow: 1,
                }}
              />
            </LocalizationProvider>
          </Box>
        </DialogContent>
        <DialogActions
          sx={{
            justifyContent: "center",
            padding: (theme) => theme.spacing(1, 3, 3),
          }}
        >
          <Button
            onClick={handleSubmit}
            variant="contained"
            size="large"
            sx={{
              width: "100%"
            }}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  getCarePlanAlreadyExistsView(): JSX.Element {
    let edit = () => this.handleSetEditModeTrue();
    let createNew = () => this.handleSetEditModeFalse();

    // @ts-ignore
    const existingCarePlan: CarePlan = this.context.currentCarePlan;
    const creationDate = existingCarePlan?.created;
    const formattedCreatedDate = creationDate ? new Date(creationDate).toLocaleString() : "";
    const startDate = existingCarePlan?.period?.start;
    const formattedStartDate = startDate ? new Date(startDate).toLocaleString() : "";
    const alertTitle = `The recipient already has a CarePlan${
      formattedStartDate && formattedStartDate !== formattedCreatedDate
        ? " starting on " + formattedStartDate
        : ""
    }. ${
      formattedCreatedDate ? "( created on " + formattedCreatedDate + " )" : ""
    }`;
    let alertMessage = `Would you like to edit this CarePlan or revoke it and create a new one?`;

    return (
      <Stack direction={"column"} spacing={2}>
        <Alert severity="warning" sx={{ whiteSpace: "pre-line" }}>
          <AlertTitle>{alertTitle}</AlertTitle>
          <Typography variant="body1" component="div">
            {alertMessage}
          </Typography>
        </Alert>
        <Stack direction={"row"} spacing={1} justifyContent={"flex-end"}>
          <Button onClick={edit} variant="contained">
            Edit
          </Button>
          <Button onClick={createNew} variant="outlined">
            Revoke and create new
          </Button>
        </Stack>
        {this.state.error && <Alert severity="error">{this.state.error}</Alert>}
      </Stack>
    );
  }
  render(): React.ReactNode {
    if (!this.state || !this.context) return <CircularProgress />;

    let view = <CircularProgress />;
    if (!this.state.carePlanStartDate) {
      view = this.getCarePlanStartDateModalView();
    } else if (this.state.activeCarePlan != null) {
      view = <ScheduleSetup />;
    } else if (this.state.editMode == null) {
      view = this.getCarePlanAlreadyExistsView();
    }

    return (
      <AppPageScaffold title={"Recipient enrollment"}>{view}</AppPageScaffold>
    );
  }
}
