import * as React from "react";
import {
    AlertTitle,
    Button,
    Container,
    Chip,
    CircularProgress,
    Grid,
    IconButton,
    List,
    ListItem,
    Paper,
    Snackbar,
    Stack,
    TextField,
    Tooltip,
    Typography
} from "@mui/material";
import {styled} from "@mui/material/styles";
import ClearIcon from "@mui/icons-material/Clear";
import WarningIcon from "@mui/icons-material/WarningAmberOutlined";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import moment from "moment";
import {DateTimePicker} from "@mui/x-date-pickers/DateTimePicker";
import {FhirClientContext} from "../FhirClientContext";
import {IBundle_Entry, IResource} from "@ahryman40k/ts-fhir-types/lib/R4";
import {CommunicationRequest} from "../model/CommunicationRequest";
import Alert from "@mui/material/Alert";
import Patient from "../model/Patient";
import PatientPROs from "./PatientPROs";
import Summary from "./Summary";
import PlanDefinition from "../model/PlanDefinition";
import {getEnv} from "../util/util";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Dialog from "@mui/material/Dialog";
import Client from "fhirclient/lib/Client";
import PatientNotes from "./PatientNotes";
import CarePlan from "../model/CarePlan";
import { Observation } from "../model/Observation";
import {Bundle} from "../model/Bundle";
import { getFhirData } from "../util/isacc_util";
import { unmarkTestPatient} from "../model/modelUtil";
interface ScheduleSetupProps {
}

type UnsavedStates = {
  patient: boolean,
  careplan: boolean,
  communications: boolean,
  pro: boolean
}

type ScheduleSetupState = {
    carePlan: CarePlan;
    showCloseSchedulePlannerAlert: boolean;
    alertSeverity: "error" | "warning" | "info" | "success";
    alertText: string;
    savingInProgress: boolean;
    unsavedStates: UnsavedStates;
    showUnsaveChangesTooltip: boolean;
}

export type MessageDraft = {
    text: string,
    scheduledDateTime: Date
}

const defaultUnsavedStates = {
  patient: false,
  careplan: false,
  communications: false,
  pro: false
}

const styles = {
    patientNotesField: {
        marginTop: 1,
        marginLeft: 0,
        marginRight: 0,
        marginBottom: 0
    }
};


export default class ScheduleSetup extends React.Component<
  ScheduleSetupProps,
  ScheduleSetupState
> {
  static contextType = FhirClientContext;
  planDefinition: PlanDefinition;

  // declare context: React.ContextType<typeof FhirClientContext>

  constructor(props: ScheduleSetupProps) {
    super(props);
    this.state = {
      carePlan: null,
      showCloseSchedulePlannerAlert: false,
      alertText: null,
      alertSeverity: null,
      savingInProgress: false,
      unsavedStates: defaultUnsavedStates,
      showUnsaveChangesTooltip: false,
    };
    // This binding is necessary to make `this` work in the callback
    this.alertUser = this.alertUser.bind(this);
  }

  componentDidMount() {
    // @ts-ignore
    this.planDefinition = this.context.planDefinition;
    //@ts-ignore
    let carePlan: CarePlan = this.context.currentCarePlan;
    this.setState({ carePlan: carePlan });
    window.addEventListener("beforeunload", this.alertUser);
  }

  componentWillUnmount() {
    window.removeEventListener("beforeunload", this.alertUser);
  }

  hasUnsavedChanges() {
    return Object.entries(this.state.unsavedStates).find(item => item[1]);
  }

  handleUnsaveChanges(key: string, changed: boolean = true) {
    if (changed && !this.hasUnsavedChanges()) {
      // flash tooltip to warn user first time
      this.setState({
        showUnsaveChangesTooltip: true
      }, () => {
        setTimeout(() => {
          this.setState({
            showUnsaveChangesTooltip: false
          })
        }, 5000)
      })
    }
    this.setState({
      unsavedStates: {
        ...this.state.unsavedStates,
        [key]: changed,
      },
    });
  }

  alertUser(event: BeforeUnloadEvent) {
    if (!this.hasUnsavedChanges()) return;
    event.preventDefault();
    event.returnValue = "";
    return;
  }

  render(): React.ReactNode {
    if (!this.state || !this.state.carePlan || !this.context)
      return <CircularProgress />;

    //@ts-ignore
    let patient: Patient = this.context.patient;

    let editing = this.state.carePlan.id != null;

    return (
      <Container maxWidth={"lg"}>
        {editing ? (
          <Alert severity={"info"}>
            <AlertTitle>You are editing an existing CarePlan.</AlertTitle>
            {`CarePlan/${this.state.carePlan.id}, created on ${new Date(
              this.state.carePlan.created
            ).toLocaleString()}`}
          </Alert>
        ) : null}
        <Grid container spacing={2} className="main-grid-container">
          <Grid item xs={12} sm={12} md={6} alignSelf={"stretch"}>
            <Item>
              <Summary
                editable={true}
                onChange={() => this.handleUnsaveChanges("patient")}
              />
            </Item>
          </Grid>
          <Grid
            item
            xs={12}
            sm={12}
            md={6}
            alignSelf={"stretch"}
            sx={{ display: "flex", flexDirection: "column" }}
          >
            <Item>
              {editing ? (
                <PatientNotes
                  onChange={() => {
                    this.handleUnsaveChanges("careplan")
                  }}
                  onSave={() => {
                    this.handleUnsaveChanges("careplan", false)
                  }}
                />
              ) : (
                <>
                  <Typography variant={"h6"}>{"Recipient note"}</Typography>
                  <TextField
                    sx={{
                      maxHeight: 400,
                      overflow: "auto",
                      ...styles.patientNotesField,
                    }}
                    fullWidth
                    multiline
                    minRows={5}
                    value={this.state.carePlan.description ?? ""}
                    placeholder={"Recipient note"}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                      const cp = this.state.carePlan;
                      cp.description = event.target.value;
                      this.handleUnsaveChanges("careplan");
                    }}
                  />
                </>
              )}
            </Item>
            <Item>
              <PatientPROs
                fieldsOnly={!editing}
                editable={editing}
                onChange={() => {
                  this.handleUnsaveChanges("pro")
                }}
                onSave={() => {
                  this.handleUnsaveChanges("pro", false)
                }}
              ></PatientPROs>
            </Item>
          </Grid>
          <Grid item xs={12}>
            <Item>
              <MessageScheduleList
                messagePlan={this.state.carePlan}
                onMessagePlanChanged={(carePlan: CarePlan) => {
                  this.setState({
                    carePlan: carePlan,
                  });
                  this.handleUnsaveChanges("communication");
                }}
                saveSchedule={() => this.saveSchedule()}
                patient={patient}
              />
            </Item>
          </Grid>
        </Grid>
        {this.getCloseSchedulePlannerAlert()}
        {this.renderSaveFooter()}
      </Container>
    );
  }

  renderSaveFooter() {
    return (
      <Paper
        sx={{
          position: "fixed",
          bottom: 0,
          right: 0,
          left: 0,
          overflow: "hidden",
          backgroundColor: "#FFF",
          zIndex: 10,
          width: "100%",
          padding: (theme) => theme.spacing(2, 0),
          textAlign: "center",
        }}
        elevation={6}
      >
        <Stack
          spacing={2}
          direction="row"
          alignItems={"center"}
          justifyContent={"center"}
        >
          {this.hasUnsavedChanges() && (
            <Tooltip
              arrow
              color="warning"
              title="Hey, you have made changes. Make sure to click the DONE button if you want to save them."
              enterTouchDelay={0}
              open={this.state.showUnsaveChangesTooltip}
              slotProps={{
                tooltip: {
                    sx: {
                        backgroundColor: (theme) => theme.palette.warning.dark,
                        fontSize: "0.95rem",
                        padding: (theme) => theme.spacing(1)
                    }
                },
                arrow: {
                    sx: {
                        color: (theme) => theme.palette.warning.dark
                    }
                }
              }}
            >
              <WarningIcon fontSize="large" color="warning"></WarningIcon>
            </Tooltip>
          )}

          <Button
            variant="contained"
            onClick={() => this.saveSchedule()}
            size="large"
            sx={{ minWidth: 240 }}
          >
            Done
          </Button>
        </Stack>
      </Paper>
    );
  }

  private showSnackbar(
    alertSeverity: "error" | "warning" | "info" | "success",
    alertText: string
  ) {
    this.setState({
      showCloseSchedulePlannerAlert: true,
      alertSeverity: alertSeverity,
      alertText: alertText,
      savingInProgress: false,
    });
  }

  private getCloseSchedulePlannerAlert() {
    let clearSessionLink = getEnv("REACT_APP_DASHBOARD_URL") + "/clear_session";
    let onClose = () => this.setState({ showCloseSchedulePlannerAlert: false });

    if (this.state.savingInProgress) {
      return (
        <Dialog open={this.state.savingInProgress}>
          <DialogContent>
            <CircularProgress />
            <DialogContentText>{"Saving..."}</DialogContentText>
          </DialogContent>
        </Dialog>
      );
    }

    if (this.state.alertSeverity === "success") {
      return (
        <Dialog
          open={this.state.showCloseSchedulePlannerAlert}
          onClose={onClose}
        >
          <DialogContent>
            <DialogContentText>{this.state.alertText}</DialogContentText>
            <DialogActions>
              <Button
                onClick={onClose}
                href={clearSessionLink}
                variant="contained"
              >
                Close schedule planner
              </Button>
            </DialogActions>
          </DialogContent>
        </Dialog>
      );
    }
    return (
      <Snackbar
        open={this.state.showCloseSchedulePlannerAlert}
        autoHideDuration={6000}
        onClose={onClose}
      >
        <Alert
          onClose={onClose}
          action={
            <Button href={clearSessionLink}>Close schedule planner</Button>
          }
          severity={this.state.alertSeverity}
          sx={{ width: "100%" }}
        >
          {this.state.alertText}
        </Alert>
      </Snackbar>
    );
  }

  private checkPhoneNumber(): Promise<any> {
    // @ts-ignore
    let patient: Patient = this.context.patient;
    // @ts-ignore
    let client: Client = this.context.client;

    if (!patient.smsContactPoint) {
      return new Promise((resolve, reject) =>
        reject("No contact information entered.")
      );
    }

    let params = new URLSearchParams({
      telecom: `${patient.smsContactPoint}`,
      // FIXME
      // "_id:not: `${patient.id}`"  // this DOES NOT WORK, at least when tried against SMIT, R4 FHIR server
      // need to figure out the correct search paramter for excluding a patient id
    }).toString();
    return getFhirData(client, `/Patient?${params}`).then(
      (bundle: Bundle): Promise<void> => {
        return new Promise((resolve, reject) => {
          if (bundle.type === "searchset") {
            if (bundle.entry) {
              let patients: Patient[] = bundle.entry.map(
                (entry: IBundle_Entry) => {
                  if (entry.resource.resourceType !== "Patient") {
                    this.showSnackbar(
                      "error",
                      "Unexpected resource type returned"
                    );
                    return null;
                  } else {
                    console.log("Patient loaded:", entry);
                    return Patient.from(entry.resource);
                  }
                }
              );
              if (patients.find((o) => o.id !== patient.id)) {
                // exclude current patient, workaround for above FIXME
                reject(
                  `Phone number is already associated with: ${patients
                    .filter((p: Patient) => p.id !== patient.id)
                    .map(
                      (p: Patient) => `${p.fullNameDisplay} (${p.reference})`
                    )
                    .join("; ")}.`
                );
              } else {
                resolve();
              }
            } else {
              resolve();
            }
          } else {
            reject("Unexpected bundle type returned");
          }
        });
      }
    );
  }

  private saveSchedule() {
    // @ts-ignore
    let client: Client = this.context.client;
    // @ts-ignore
    let patient: Patient = this.context.patient;

    if (!client) {
      console.log("No client");
      return;
    }

    if (!patient) {
      console.log("no patient");
      return;
    }
    this.setState({ savingInProgress: true, showUnsaveChangesTooltip: false });

    if (
      this.state.carePlan.communicationRequests.find(
        (m: CommunicationRequest) => m.getText().length === 0
      )
    ) {
      this.showSnackbar("error", "Messages cannot be empty");
      return;
    }

    this.checkPhoneNumber().then(
      () => {
        // @ts-ignore
        let requests = [client.update(patient)];
        if (!patient.isTest) {
          requests.push(unmarkTestPatient(client, patient.id))
        }
        return Promise.allSettled(requests).then((results) => {
          console.log("Saving patient result: ", results);
          const errorEntry = (
            results.find(
              (res) => res.status === "rejected" || !res.value?.resourceType
            ) as PromiseRejectedResult | undefined
          )?.reason;
          if (errorEntry) {
            console.log("Error updating patient data ", errorEntry);
            this.showSnackbar(
              "warning",
              `Issue encountered updating patient data. See console for detail.`
            );
          }
          this.saveCareTeam()
            .then((result: IResource) => {
              console.log(`CareTeam ${result.id} resources updated.`);
              const currentCarePlan = this.state.carePlan;
              if (currentCarePlan) {
                currentCarePlan.careTeam = [
                  {
                    reference: `CareTeam/${result.id}`,
                  },
                ];
              }
              this.setState({
                carePlan: currentCarePlan,
              });
              // update PRO scores
              this.savePROs();
              this.saveCommunicationRequests();
            })
            .catch((e) => {
              this.showSnackbar(
                "error",
                "Error saving care team.  See console for detail."
              );
              console.log("Error saving care team ", e);
            });
        });
      },
      (reason: any) => {
        this.showSnackbar("error", reason);
      }
    );
  }

  private saveCareTeam() : Promise<any> {
     // @ts-ignore
     const client = this.context.client;
     // @ts-ignore
     const careTeam = this.context.careTeam;
     let ct;
     if (careTeam.id) {
       ct = client.update(careTeam);
     } else {
       ct = client.create(careTeam);
     }
     return ct;
  }

  private saveCommunicationRequests() {
    // @ts-ignore
    let client: Client = this.context.client;
    // @ts-ignore
    const patient: Patient = this.context.patient;

    let promises = this.state.carePlan.communicationRequests.map(
      (c: CommunicationRequest) => {
        let p;
        if (c.id) {
          p = client.update(c);
        } else {
          p = client.create(c);
        }
        return p.then((value: any) => CommunicationRequest.from(value));
      }
    );

    Promise.all(promises).then(
      (communicationRequests: CommunicationRequest[]) => {
        communicationRequests.forEach((v: CommunicationRequest) => {
          console.log("resource saved:", v);
        });
        // update CarePlan with the newly created CommunicationRequests
        this.state.carePlan.setCommunicationRequests(
          communicationRequests.filter(
            (cr) => cr.resourceType === "CommunicationRequest"
          )
        );

        // create resource on server
        let p;
        if (this.state.carePlan.id) {
          p = client.update(this.state.carePlan);
        } else {
          p = client.create(this.state.carePlan);
        }
        p.then(
          (savedCarePlan: IResource) => {
            let updatePromises = communicationRequests.map(
              (c: CommunicationRequest) => {
                c.basedOn = [{ reference: `CarePlan/${savedCarePlan.id}` }];
                return client
                  .update(c)
                  .then((value: any) => CommunicationRequest.from(value));
              }
            );
            Promise.all(updatePromises).then(
              (updatedCommunicationRequests: CommunicationRequest[]) => {
                updatedCommunicationRequests.forEach(
                  (v: CommunicationRequest) => {
                    console.log("CommunicationRequest updated:", v);
                  }
                );

                const activeScheduledCommunicationRequests = updatedCommunicationRequests
                  .filter(
                    (ucr : CommunicationRequest) =>
                      ucr.status === "active" &&
                      CommunicationRequest.isScheduledOutgoingMessage(ucr)
                  )
                  .sort((a, b) => {
                    let d1 = a.occurrenceDateTime;
                    let d2 = b.occurrenceDateTime;
                    const t1 = d1 ? new Date(d1).getTime() : 0;
                    const t2 = d2 ? new Date(d2).getTime() : 0;
                    return t1 - t2;
                  });

                // console.log("next ", activeCommunicationRequests[0].occurrenceDateTime)
                // add next scheduled message date/time extension
                patient.nextScheduledMessageDateTime =
                activeScheduledCommunicationRequests.length
                    ? activeScheduledCommunicationRequests[0]?.occurrenceDateTime
                    : null;
                if (patient.nextScheduledMessageDateTime) {
                  // @ts-ignore
                  client.update(patient).then(() => this.onSaved(savedCarePlan));
                } else this.onSaved(savedCarePlan);
              }
            );
          },
          (reason: any) => this.onRejected(reason)
        );
      },
      this.onRejected
    );
  }

  private savePROs() {
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
      return;
    }

    Promise.all(requests)
      .then((results) => {
        console.log("Save observations ", results)
        // @ts-ignore
        this.context.mostRecentPhq9 = Observation.from(results[0]);
        // @ts-ignore
        this.context.mostRecentCss = Observation.from(results[1]);
      })
      .catch((e) => {
        console.log("Error saving observations ", e);
      });
  }

  private onSaved(value: IResource) {
    console.log("resource saved:", value);
    this.setState({ unsavedStates: defaultUnsavedStates});
    this.showSnackbar("success", "Schedule created successfully");
  }

  private onRejected(reason: any) {
    console.log("resource rejected:", reason);
    this.showSnackbar("error", "Schedule could not be created");
  }
}

const Item = styled(Paper)(({ theme }) => ({
    backgroundColor: "#fff",
    ...theme.typography.body1,
    padding: theme.spacing(2, 3),
    margin: theme.spacing(1, 0),
    flexGrow: 1,
    minHeight: 240
}));


const MessageScheduleList = (props: {
    messagePlan: CarePlan,
    patient: Patient,
    onMessagePlanChanged: (carePlan: CarePlan) => void,
    saveSchedule: () => void,
}) => {

    const buildMessageItem = (message: CommunicationRequest, index: number) => {
        return (
            <ListItem key={`message_${index}`} sx={{
                width: '100%',
                "& .MuiListItemSecondaryAction-root": {
                    right: 0.5
                }
            }} secondaryAction={
                message.status === "completed" ? <></> :
                    <IconButton hidden={message.status === "completed"} onClick={() => {
                        removeMessage(index);
                    }}>
                        <ClearIcon/>
                    </IconButton>
            }>
                <Grid container direction={"row"} flexDirection={"row"} spacing={2}
                      sx={{paddingTop: 2}}>
                    <Grid item>
                        <LocalizationProvider dateAdapter={AdapterMoment}>
                            <DateTimePicker
                                label={message.status === "completed" ? "Delivered Date & Time" : "Scheduled Date & Time"}
                                // @ts-ignore
                                value={moment(message.occurrenceDateTime)}
                                format="ddd, MM/DD/YYYY hh:mm A" // example output display: Thu, 03/09/2023 09:34 AM
                                disabled={message.status === "completed"}
                                onChange={(newValue: Date | null) => {
                                    message.setOccurrenceDate(newValue);
                                    props.onMessagePlanChanged(props.messagePlan);
                                }}
                                sx={{
                                    width: "100%",
                                    minWidth: "264px",
                                    flexGrow: 1
                                }}
                            />
                        </LocalizationProvider>
                    </Grid>
                    <Grid item flexGrow={1}>
                        <TextField
                            error={message.getText().length === 0}
                            helperText={message.getText().length === 0 ? "Enter a message" : ""}
                            label={message.status === "completed" ? "Delivered Message" : "Scheduled Message"}
                            fullWidth
                            multiline
                            value={message.getText() ?? ""}
                            placeholder={"Enter message"}
                            disabled={message.status === "completed"}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                message.setText(event.target.value);
                                props.onMessagePlanChanged(props.messagePlan);
                            }}/>
                    </Grid>
                </Grid>
            </ListItem>
        );
    }

    const removeMessage = (index: number) => {
        let messagePlan = props.messagePlan;
        messagePlan.removeActiveCommunicationRequest(index);
        props.onMessagePlanChanged(messagePlan);
    };

    const activeCommunicationRequests = props.messagePlan.getActiveCommunicationRequests() ?? [];
    const completedCommunicationRequests = activeCommunicationRequests.filter(item => item.status === "completed");

    return (
      <>
        <Stack
          spacing={1}
          direction={"row"}
          alignItems={"center"}
          justifyContent={"space-between"}
        >
          <Typography variant={"h6"} gutterBottom>
            {"Message schedule"}
          </Typography>
          <Stack spacing={1} direction={"row"}>
            <Chip
              label={`${completedCommunicationRequests.length} sent`}
              variant="outlined"
              size="small"
              color={
                completedCommunicationRequests.length > 0
                  ? "success"
                  : "default"
              }
            />
            <Chip
              label={`${activeCommunicationRequests.length} scheduled`}
              variant="outlined"
              size="small"
            />
          </Stack>
        </Stack>
        <Alert
          severity={"info"}
        >
          <div dangerouslySetInnerHTML={{
            __html:
              "{name} will be substituted by the recipient's first name or preferred name if available.<br/>{userName} will be substituted by the author's first name.",
          }}></div>
        </Alert>

        <List>
          {props.messagePlan
            .getActiveCommunicationRequests()
            .map((message: CommunicationRequest, index: number) =>
              buildMessageItem(message, index)
            )}
        </List>

        <Stack
          direction={"row"}
          justifyContent={"flex-start"}
          alignItems={"flex-start"}
          sx={{ padding: (theme) => theme.spacing(2) }}
        >
          <Button
            variant="outlined"
            size="large"
            sx={{
              minWidth: (theme) => theme.spacing(33),
            }}
            onClick={() => {
              let newMessage = CommunicationRequest.createNewScheduledMessage(
                "",
                props.patient,
                props.messagePlan,
                new Date()
              );
              props.messagePlan.addCommunicationRequest(newMessage);
              props.onMessagePlanChanged(props.messagePlan);
            }}
          >
            Add new message
          </Button>
        </Stack>
      </>
    );

}
