import * as React from "react";

import { FhirClientContext, FhirClientContextType } from "../FhirClientContext";

import Communication from "../model/Communication";
import Patient from "../model/Patient";
import { CommunicationRequest } from "../model/CommunicationRequest";
import {
  IBundle_Entry,
  ICodeableConcept,
  ICoding,
  IReference,
  IResource,
} from "@ahryman40k/ts-fhir-types/lib/R4";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  List,
  Radio,
  RadioGroup,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  TextFieldProps,
  Typography,
} from "@mui/material";
import { ArrowBackIos } from "@mui/icons-material";
import LoadingButton from "@mui/lab/LoadingButton";
import EditIcon from "@mui/icons-material/Edit";
import InfoIcon from "@mui/icons-material/Info";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import * as moment from "moment";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { DateTimeValidationError } from "@mui/x-date-pickers/models";
import { grey, lightBlue, teal, deepPurple, red } from "@mui/material/colors";
import { IsaccMessageCategory } from "../model/CodeSystem";
import { Error, Refresh, Warning } from "@mui/icons-material";
import Client from "fhirclient/lib/Client";
import { Bundle } from "../model/Bundle";
import { getEnv, getTimeAgoDisplay, isFutureDate } from "../util/util";
import { getClientAppURL, getFhirData, getUserName } from "../util/isacc_util";

type MessageType = "sms" | "outside communication" | "comment" | "marked as read";
type MessageStatus = "sent" | "received";

interface Message {
  date: string;
  content: string;
  type: MessageType;
  status: MessageStatus;
}

const defaultMessage: Message = {
  date: new Date().toISOString(),
  content: "",
  type: "sms",
  status: "sent",
};

const abortController = new AbortController();
const signal = abortController.signal;

export default class MessagingView extends React.Component<
  {},
  {
    // messages: MessageDraft[];
    activeMessage: Message;
    error: any;
    communications: Communication[];
    scheduledCommunicationRequests: CommunicationRequest[];
    temporaryCommunications: Communication[];
    messagesLoading: boolean;
    saveLoading: boolean;
    showSaveFeedback: boolean;
    infoOpen: boolean;
    nextPageURL: string;
    createDateTimeValidationError: DateTimeValidationError;
    editDateTimeValidationError: DateTimeValidationError;
    editEntry: Communication;
    isEditing: boolean;
    // showAlert: boolean;
    // alertSeverity: "error" | "warning" | "info" | "success";
    // alertText: string;
  }
> {
  static contextType = FhirClientContext;
  interval: any;
  getNextPageInterval: any;
  private messagesPanelRef = React.createRef<HTMLUListElement>();

  constructor(props: {}) {
    super(props);
    this.state = {
      activeMessage: defaultMessage,
      error: null,
      communications: null,
      scheduledCommunicationRequests: null,
      temporaryCommunications: [],
      messagesLoading: false,
      saveLoading: false,
      showSaveFeedback: false,
      infoOpen: false,
      nextPageURL: null,
      createDateTimeValidationError: null,
      editDateTimeValidationError: null,
      editEntry: null,
      isEditing: false,
    };
  }

  handleUnmount() {
    clearInterval(this.interval);
    clearTimeout(this.getNextPageInterval);
    abortController.abort(); // abort any pending HTTP request
  }

  componentDidMount() {
    // @ts-ignore
    let context: FhirClientContextType = this.context;

    if (context.error || !context.client || !this.state) {
      this.handleUnmount();
      return;
    }

    if (!this.state.communications) {
      this.loadCommunications();
    }
    if (!this.state.scheduledCommunicationRequests) {
      this.loadNextScheduledCommunicationRequests();
    }
    this.interval = setInterval(() => {
      console.log("Timer triggered");
      this.loadCommunications();
      this.loadNextScheduledCommunicationRequests();
    }, 60000);

    window.addEventListener("DOMContentLoaded", () => {
      // ensure scrollTop property is set to end of scrolled content at startup
      // to have accurate calculation of scrolled position
      this.messagesPanelRef.current.scrollTop =
        this.messagesPanelRef.current.scrollHeight;
    });
  }
  componentWillUnmount() {
    this.handleUnmount();
  }

  loadCommunications(url: string = null) {
  // @ts-ignore
  let context: FhirClientContextType = this.context;
  this.setState({ messagesLoading: true });

  const carePlanIds = context.allCarePlans?.map((item) => item.id);

  this.getCommunications(context.client, carePlanIds, url)
    .then(
      (result: Communication[]) => {
        const uniqueResults = (result ?? []).filter((item) => {
          const currentSet = this.state.communications ?? [];
          return !currentSet.find((o) => o.id === item.id);
        });
        const allResults = [
          ...(this.state.communications ?? []),
          ...uniqueResults,
        ];
        let temporaryCommunications =
          this.state.temporaryCommunications.filter((tc: Communication) => {
            return !allResults?.find((c: Communication) => {
              return c.basedOn?.find((b: IReference) => {
                return b.reference?.split("/")[1] === tc.id;
              });
            });
          });
        this.setState({
          communications: allResults,
          messagesLoading: false,
          temporaryCommunications: temporaryCommunications,
        });
      },
      (reason: any) =>
        this.setState({ error: reason, messagesLoading: false })
    )
    .catch((e) => {
      console.log("Error fetching Communications", e);
      this.setState({ error: e, messagesLoading: false });
    });
  }

  loadNextScheduledCommunicationRequests() {
    // @ts-ignore
    let client: Client = this.context.client;
    if (!client) return;
    //@ts-ignore
    let existingCarePlan: CarePlan = this.context.currentCarePlan;
    //@ts-ignore
    let patient: Patient = this.context.patient;

    const today = new Date();
    const todayDateString = [
      today.toLocaleString("default", { year: "numeric" }),
      today.toLocaleString("default", { month: "2-digit" }),
      today.toLocaleString("default", { day: "2-digit" }),
    ].join("-");

    let params = new URLSearchParams({
      recipient: `Patient/${patient.id}`,
      category: IsaccMessageCategory.isaccScheduledMessage.code,
      status: "active",
      "based-on": existingCarePlan.reference,
      _sort: "occurrence",
      occurrence: `ge${todayDateString}`,
      _count: "100",
    }).toString();
    const requestURL = `/CommunicationRequest?${params}`;
    let communicationRequests: CommunicationRequest[] = [];
    getFhirData(client, requestURL).then(
      (bundle: Bundle) => {
        if (bundle.type === "searchset") {
          if (bundle.entry) {
            communicationRequests = bundle.entry.map((e: IBundle_Entry) => {
              if (e.resource.resourceType !== "CommunicationRequest") {
                return null;
              } else {
                console.log("CommunicationRequests loaded:", e);
                return CommunicationRequest.from(e.resource);
              }
            });
            this.setState({
              scheduledCommunicationRequests: communicationRequests,
            });
          }
        }
      },
      (reason: any) => {
        console.log(
          "Unable to load CommunicationRequest resources for the patient. ",
          reason
        );
      }
    );
  }

  async getCommunications(
    client: Client,
    carePlanIds: string[],
    url: string
  ): Promise<Communication[]> {
    if (!client) {
      this.setState({
        error: "No valid client specified."
      });
      return null;
    }
    // Communication?part-of=CarePlan/${id1}[,CarePlan/${id2}]
    // get communications for all care plans for the patient
    let params = new URLSearchParams({
      "part-of": carePlanIds?.map((item) => `CarePlan/${item}`).join(","),
      _count: "200",
    }).toString();
    const requestURL = url ? url : `/Communication?${params}`;
    return await getFhirData(client, requestURL, signal).then(
      (bundle: Bundle) => {
        if (bundle.type === "searchset") {
          if (!bundle.entry) return [];
          let nextPageURL: string = null;
          if (bundle.link && bundle.link.length > 0) {
            const arrNextURL = bundle.link.filter(
              (item) => item.relation === "next"
            );
            nextPageURL = arrNextURL.length > 0 ? arrNextURL[0].url : null;
          }
          let communications: Communication[] = bundle.entry.map(
            (e: IBundle_Entry) => {
                if (e.resource.resourceType !== "Communication") {
                    this.setState({ error: "Unexpected resource type returned" });
                    return null;
                } else {
                    if (e.resource.status !== "in-progress") {
                        console.log("Communication loaded:", e);
                        return Communication.from(e.resource);
                    }
                    return null;
                }
            }
        ).filter((communication: Communication | null) => communication !== null);
        if (nextPageURL !== this.state.nextPageURL) {
            this.setState({
              nextPageURL: nextPageURL,
            });
          }
          return communications;
        } else {
          this.setState({ error: "Unexpected bundle type returned" });
          return null;
        }
      },
      (reason: any) => {
        this.setState({ error: reason.toString() });
        return null;
      }
    );
  }

  render(): React.ReactNode {

    // @ts-ignore
    let context: FhirClientContextType = this.context;

    if (context.error) {
      return <Alert severity="error">{context.error}</Alert>;
    }

    if (!this.state) return <CircularProgress />;

    if (!context.currentCarePlan || !this.state.communications) {
      return <CircularProgress />;
    }

    let messageBoxProps = {
      maxHeight: 548,
      minHeight: 40,
      overflow: "auto",
      display: "flex",
      flexDirection: "column-reverse",
      border: `2px solid ${grey[400]}`,
      borderRadius: 1,
      paddingLeft: 0.5,
      paddingRight: 0.5,
      boxShadow: `inset 0 2px 2px 0 ${grey[100]}`,
    };

    let messages = (
      <Stack direction={"row"} justifyContent={"flex-end"} sx={messageBoxProps}>
        <Typography
          variant={"body1"}
          color="text.secondary"
          sx={{ padding: 2 }}
        >
          {"No messages"}
        </Typography>
      </Stack>
    );

    if (
      (this.state.communications && this.state.communications.length > 0) ||
      this.state.temporaryCommunications.length
    ) {
      let communications = [];
      communications.push(...this.state.communications);
      communications.push(...this.state.temporaryCommunications);
      communications.sort((a, b) => {
        let d1 = a.sent ? a.sent : a.received ?? a.meta?.lastUpdated;
        let d2 = b.sent ? b.sent : b.received ?? b.meta?.lastUpdated;
        const t1 = d1 ? new Date(d1).getTime() : 0;
        const t2 = d2 ? new Date(d2).getTime() : 0;
        return t1 < t2 ? 1 : -1;
      });
      messages = (
        <List
          sx={messageBoxProps}
          ref={this.messagesPanelRef}
          onScroll={(event) => {
            clearTimeout(this.getNextPageInterval);
            if (!this.state.nextPageURL) {
              return;
            }
            const { scrollHeight, clientHeight, scrollTop } =
              event.currentTarget;
            const adjustedScrollTop = Math.floor(
              Math.abs(scrollTop) + Math.abs(clientHeight)
            );
            // not at the top
            if (!(adjustedScrollTop >= scrollHeight - 4)) {
              return;
            }
            this.getNextPageInterval = setTimeout(() => {
              this.loadCommunications(this.state.nextPageURL);
            }, 250);
          }}
        >
          {communications.map((message: Communication, index) =>
            this._buildMessageRow(message, index)
          )}
        </List>
      );
    }

    return (
      <>
        <Grid container direction={"column"}>
          <Stack
            direction={"row"}
            justifyContent={"space-between"}
            alignItems={"center"}
            spacing={1}
          >
            <Stack direction={"row"} alignItems={"center"}>
              <Typography variant={"h6"}>{"Messages"}</Typography>
              <IconButton
                color="info"
                onClick={() => this.setState({ infoOpen: true })}
              >
                <InfoIcon></InfoIcon>
              </IconButton>
            </Stack>
            <Stack spacing={1} direction="row">
              {this.state.messagesLoading ? (
                <CircularProgress />
              ) : (
                <IconButton
                  color="primary"
                  onClick={() => this.loadCommunications()}
                  title={"refresh"}
                >
                  <Refresh />
                </IconButton>
              )}
            </Stack>
            {this._buildEditDialog()}
          </Stack>

          {messages}

          {this.state.error && (
            <Alert severity="error" sx={{ marginTop: 2 }}>
              {typeof this.state.error === "string"
                ? this.state.error
                : "Error occurred.  See console for detail."}
            </Alert>
          )}

          {this._buildMessageTypeSelector()}

          <Box
            sx={{
              padding: (theme) => theme.spacing(1.5, 1, 1),
              borderWidth: "2px",
              borderStyle: "solid",
              borderColor: grey[200],
            }}
          >
            {this.state.activeMessage.type === "sms" &&
              this._buildSMSEntryComponent()}
            {this.state.activeMessage.type !== "sms" &&
              this._buildNonSMSEntryComponent()}
            <Snackbar
              open={this.state.showSaveFeedback}
              autoHideDuration={2000}
              anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
              <Alert severity="success">
                Message saved. Please see messages list above.
              </Alert>
            </Snackbar>
          </Box>
          {this._buildUnrespondedMessageDisplay()}
          {this._buildNextScheduledMessageDisplay()}
        </Grid>
        {this._buildInfoDialog()}
      </>
    );
  }

  private _buildNextScheduledMessageDisplay(): React.ReactNode {
    // @ts-ignore
    const context: FhirClientContextType = this.context;
    // @ts-ignore
    const patient: Patient = context.patient;
    const matchedCR = patient?.nextScheduledMessageDateTime
      ? this.state.scheduledCommunicationRequests?.find(
          (cr: CommunicationRequest) => {
            const crDate = new Date(cr.occurrenceDateTime);
            const patientExtensionDate = new Date(
              patient?.nextScheduledMessageDateTime
            );
            if (
              isNaN(crDate.getTime()) ||
              isNaN(patientExtensionDate.getTime())
            )
              return false;
            return (
              CommunicationRequest.isScheduledOutgoingMessage(cr) &&
              cr.status === "active" &&
              crDate.getFullYear() === patientExtensionDate.getFullYear() &&
              crDate.getMonth() === patientExtensionDate.getMonth() &&
              crDate.getDate() === patientExtensionDate.getDate() &&
              crDate.getHours() === patientExtensionDate.getHours() &&
              crDate.getSeconds() === patientExtensionDate.getSeconds() &&
              crDate.getTime() >= new Date().getTime()
            );
          }
        )
      : null;
    if (!matchedCR) return null;
    return (
      <Box sx={{ marginTop: (theme) => theme.spacing(1.5) }}>
        <Alert severity="info">
          <AlertTitle>Next scheduled outgoing message</AlertTitle>
          <Stack
            spacing={1}
            direction={"column"}
            alignItems={"flex-start"}
            sx={{ gap: 0.5 }}
          >
            <Box>
              <Typography variant="subtitle2" component="div">
                {MessagingView.displayDateTime(
                  patient.nextScheduledMessageDateTime
                )}
              </Typography>
              <Typography variant="body2" component="div">
                {matchedCR.getText()}
              </Typography>
            </Box>
            <Button
              size="small"
              href={getClientAppURL("ENROLLMENT", patient?.id)}
              variant="outlined"
            >
              <ArrowBackIos fontSize="small"></ArrowBackIos>Edit in enrollment
            </Button>
          </Stack>
        </Alert>
      </Box>
    );
  }

  handleMarkedAsResolve() {
    this.setState({
      activeMessage: {
        ...this.state.activeMessage,
        date: new Date().toISOString(),
        content: "Prior message(s) marked as read",
        status: "sent",
        type: "marked as read"
      },
    }, () => {
      this.unsetLastUnfollowedDateTime();
      this.saveNonSMSMessage();
    });
    
  }

  private _buildUnrespondedMessageDisplay(): React.ReactNode {
    // @ts-ignore
    const context: FhirClientContextType = this.context;
    // @ts-ignore
    const patient: Patient = context.patient;
    if (
      !patient.lastUnfollowedMessageDateTime ||
      isFutureDate(new Date(patient.lastUnfollowedMessageDateTime))
    ) {
      return null;
    }
    return (
      <Box sx={{ marginTop: (theme) => theme.spacing(1.5) }}>
        <Alert
          severity="info"
          sx={{
            backgroundColor: "#F2EEFE",
            color: deepPurple[900],
            "& .MuiAlert-icon": {
              color: deepPurple[900],
            },
          }}
        >
          <AlertTitle>Un-responded message(s)</AlertTitle>
          <Stack
            spacing={1}
            direction={"column"}
            alignItems={"flex-start"}
            sx={{ gap: 0.5 }}
          >
            <Box>
              <Typography variant="subtitle2" component="div">
                Time since last reply:{" "}
                {getTimeAgoDisplay(
                  new Date(patient.lastUnfollowedMessageDateTime)
                )}
              </Typography>
              <Typography variant="body2" component="div">
                <strong>To clear this alert</strong>: respond with a{" "}
                <strong>manual message</strong>, record an{" "}
                <strong>outside communication</strong>, or use the{" "}
                <strong>button</strong> below for messages that don't need a
                response.
              </Typography>
            </Box>
            <Button
              size="small"
              onClick={() => this.handleMarkedAsResolve()}
              variant="outlined"
            >
              Mark message(s) as read/resolved
            </Button>
          </Stack>
        </Alert>
      </Box>
    );
  }

  private _buildMessageTypeSelector(): React.ReactNode {
    const tabRootStyleProps = {
      margin: {
        xs: "8px auto 0",
        sm: "8px 0 0",
      },
      marginTop: 1,
      minHeight: "40px",
      maxWidth: {
        xs: "280px",
        sm: "100%",
      },
      "& .MuiTab-root": {
        borderBottom: `2px solid ${grey[200]}`,
      },
      "& .Mui-selected": {
        borderWidth: "2px 2px 0",
        borderStyle: "solid solid none",
        borderColor: `${grey[200]} ${grey[200]} transparent`,
        borderRadius: "8px 8px 0 0",
      },
      position: "relative",
      top: "2px",
      backgroundColor: "#FFF",
    };
    const tabProps = {
      sx: {
        padding: {
          sm: (theme: any) => theme.spacing(1, 2.5),
        },
        color: grey[500],
      },
    };
    return (
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-end", sm: "center" }}
      >
        <Tabs
          value={this.state.activeMessage?.type}
          onChange={(event: React.SyntheticEvent, value: MessageType) => {
            this.setState({
              activeMessage: {
                ...defaultMessage,
                type: value,
                date: new Date().toISOString(),
              },
            });
          }}
          textColor="primary"
          aria-label="message type tabs"
          selectionFollowsFocus
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          TabIndicatorProps={{
            sx: {
              backgroundColor: "#FFF",
            },
          }}
          TabScrollButtonProps={{
            sx: {
              borderBottom: `2px solid ${grey[200]}`,
              "&.Mui-disabled": {
                width: 0,
              },
            },
          }}
          sx={tabRootStyleProps}
        >
          <Tab value="sms" label="ISACC manual" {...tabProps} />
          <Tab
            value="outside communication"
            label="Outside communication"
            {...tabProps}
          />
          <Tab value="comment" label="Enter comment" {...tabProps} />
        </Tabs>
      </Stack>
    );
  }

  private _buildSMSEntryComponent(): React.ReactNode {
    return (
      <>
        <TextField
          multiline
          value={this.state.activeMessage?.content ?? ""}
          placeholder={"Type message for ISACC to send"}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            this.setState({
              activeMessage: {
                ...this.state.activeMessage,
                content: event.target.value,
              },
            });
          }}
          fullWidth
        />
        <Stack
          direction={"row"}
          justifyContent={"flex-end"}
          sx={{ marginTop: 1 }}
        >
          <Button
            variant="contained"
            onClick={() => this.saveSMSMessage()}
            disabled={
              !this._hasMessageContent(this.state.activeMessage?.content)
            }
          >
            Send
          </Button>
        </Stack>
      </>
    );
  }

  private _buildNoteEntryComponent(): React.ReactNode {
    return (
      <TextField
        multiline
        fullWidth
        placeholder="Enter contact/note on recipient"
        value={this.state.activeMessage?.content ?? ""}
        minRows={6}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          this.setState({
            activeMessage: {
              ...this.state.activeMessage,
              date: new Date().toISOString(),
              content: event.target.value,
              status: "sent",
            },
          });
        }}
        autoFocus
      ></TextField>
    );
  }

  private _buildManualMessageEntryComponent(): React.ReactNode {
    const radioProps = {
      control: <Radio size="small" />,
      sx: {
        paddingLeft: 2,
      },
    };
    return (
      <>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          alignItems={{
            xs: "flex-start",
            sm: "center",
          }}
          sx={{
            marginTop: 0.5,
            marginBottom: 1,
          }}
        >
          <Stack direction={"row"} spacing={1} alignItems={"center"}>
            <Typography variant="body2" color="text.secondary">
              Email / Phone / Letter
            </Typography>
            <RadioGroup
              aria-labelledby="message type radio group"
              name="messageStatuses"
              value={this.state.activeMessage?.status}
              //@ts-ignore
              onChange={(event: React.ChangeEvent, value: MessageStatus) => {
                this.setState({
                  activeMessage: { ...this.state.activeMessage, status: value },
                });
              }}
            >
              <FormControlLabel value={"sent"} label={"sent"} {...radioProps} />
              <FormControlLabel
                value="received"
                label="received"
                {...radioProps}
              />
            </RadioGroup>
          </Stack>
          <Stack
            direction={"row"}
            spacing={1}
            alignItems={"center"}
            sx={{ flexGrow: 1, alignSelf: "stretch" }}
          >
            <Typography variant="body2" color="text.secondary">
              at
            </Typography>
            <LocalizationProvider dateAdapter={AdapterMoment}>
              <DateTimePicker
                label="Date & time"
                format="ddd, MM/DD/YYYY hh:mm A"
                // @ts-ignore
                value={moment(this.state.activeMessage?.date)}
                sx={{
                  flexGrow: 1,
                  width: "100%",
                }}
                onError={(newError) => {
                  this.setState({
                    createDateTimeValidationError: newError,
                  });
                }}
                slotProps={{
                  textField: {
                    helperText: this._getDateTiemValidationErrorMessage(
                      this.state.createDateTimeValidationError
                    ),
                    //@ts-ignore
                    onChange: (value: moment.Moment, validationContext) => {
                      const inputValue = value ? value.toDate() : null;
                      if (!inputValue) return;
                      const validationError =
                        validationContext?.validationError;
                      if (!validationError) {
                        this.setState({
                          activeMessage: {
                            ...this.state.activeMessage,
                            date: new Date(inputValue).toISOString(),
                          },
                          createDateTimeValidationError: null,
                        });
                      } else {
                        this.setState({
                          createDateTimeValidationError: validationError,
                        });
                      }
                    },
                  },
                }}
                renderInput={(params: TextFieldProps) => (
                  <TextField {...params} sx={{ width: "100%", flexGrow: 1 }} />
                )}
                onChange={(newValue: Date | null) => {
                  this.setState({
                    activeMessage: {
                      ...this.state.activeMessage,
                      date: newValue?.toISOString(),
                    },
                  });
                }}
                disableFuture
              ></DateTimePicker>
            </LocalizationProvider>
          </Stack>
        </Stack>
        <TextField
          multiline
          rows={4}
          fullWidth
          placeholder="Enter info on email/phone/letter contact"
          value={this.state.activeMessage?.content ?? ""}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            this.setState({
              activeMessage: {
                ...this.state.activeMessage,
                content: event.target.value,
              },
            });
          }}
        ></TextField>
      </>
    );
  }

  private _buildNonSMSEntryComponent(): React.ReactNode {
    const activeType = this.state.activeMessage.type;
    return (
      <>
        <Stack direction={"column"} spacing={1}>
          {activeType === "comment" && this._buildNoteEntryComponent()}
          {activeType !== "comment" && this._buildManualMessageEntryComponent()}
        </Stack>
        <Box sx={{ marginTop: 1, textAlign: "right" }}>
          <LoadingButton
            variant="contained"
            onClick={() => {
              this.saveNonSMSMessage();
            }}
            loading={this.state.saveLoading}
            disabled={
              !this._hasMessageContent(this.state.activeMessage?.content) ||
              !this._hasMessageDate(
                this.state.activeMessage?.date,
                !!this.state.createDateTimeValidationError
              )
            }
          >
            Save
          </LoadingButton>
        </Box>
      </>
    );
  }

  private _buildEditDialog(): React.ReactNode {
    let targetEntry = this.state.editEntry;
    const dateFieldName = targetEntry?.sent ? "sent" : "received";
    const editDate = targetEntry ? targetEntry[dateFieldName] : null;
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 360 * 100);
    const handleClose = (event: React.ChangeEvent, reason: string = null) => {
      if (reason && reason === "backdropClick") return;
      this.setState(
        {
          isEditing: false,
          editDateTimeValidationError: null,
        },
        () =>
          this.setState({
            editEntry: null,
          })
      );
    };
    return (
      <Dialog
        open={this.state.isEditing}
        onClose={handleClose}
        arial-label="Edit dialog"
      >
        <DialogTitle
          sx={{
            color: "#FFF",
            backgroundColor: (theme) => theme.palette.primary.main,
          }}
        >{`Edit entry from ${MessagingView.displayDateTime(
          editDate
        )}`}</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ padding: (theme) => theme.spacing(4, 1, 0) }}
          >
            <LocalizationProvider dateAdapter={AdapterMoment}>
              <DateTimePicker
                label="Edit Date & time"
                format="ddd, MM/DD/YYYY hh:mm A"
                // @ts-ignore
                value={editDate ? moment(editDate) : null}
                onError={(newError) => {
                  this.setState({
                    editDateTimeValidationError: newError,
                  });
                }}
                // @ts-ignore
                maxDate={moment(maxDate.toISOString())}
                slotProps={{
                  textField: {
                    error: !!this.state.editDateTimeValidationError,
                    helperText: this._getDateTiemValidationErrorMessage(
                      this.state.editDateTimeValidationError
                    ),
                    //@ts-ignore
                    onChange: (
                      newValue: moment.Moment | null,
                      validationContext: any
                    ) => {
                      const validationError =
                        validationContext?.validationError;
                      if (!validationError) {
                        const inputValue = newValue?.toDate().toISOString();
                        targetEntry[dateFieldName] = inputValue;
                      }
                      this.setState({
                        editEntry: targetEntry,
                        editDateTimeValidationError: validationError,
                      });
                    },
                  },
                }}
                //@ts-ignore
                onChange={(
                  newValue: moment.Moment | null,
                  validationContext
                ) => {
                  const validationError = validationContext?.validationError;
                  if (!validationError) {
                    const inputValue = newValue?.toDate().toISOString();
                    targetEntry[dateFieldName] = inputValue;
                  }
                  this.setState({
                    editEntry: targetEntry,
                    editDateTimeValidationError: validationError,
                  });
                }}
                disableFuture
              ></DateTimePicker>
            </LocalizationProvider>
            <TextField
              defaultValue={targetEntry?.displayText()}
              multiline
              rows={6}
              fullWidth
              label="Edit Content"
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                targetEntry?.setText(event.target.value);
                this.setState({
                  editEntry: targetEntry,
                });
              }}
            ></TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            disabled={
              !this._hasMessageContent(targetEntry?.displayText()) ||
              !this._hasMessageDate(
                targetEntry[dateFieldName],
                !!this.state.editDateTimeValidationError
              )
            }
            onClick={() => {
              // @ts-ignore
              const client = this.context.client;
              if (!client) return;
              client
                .update(targetEntry)
                .then(() => {
                  this.handleLastUnfollowedDateTimeByCommunication(targetEntry);
                  const existingEntryIndex =
                    this.state.communications?.findIndex(
                      (item) => item.id === targetEntry.id
                    );
                  let existingCommunications = this.state.communications;
                  existingCommunications.splice(existingEntryIndex, 1);
                  this.setState({
                    communications: existingCommunications,
                  });
                  this.loadCommunications();
                })
                .catch((e: any) => {
                  this.setState({
                    error:
                      "Unable to update communication.  See console for detail.",
                  });
                  console.log("Fail to update communication ", e);
                });
              setTimeout(handleClose, 0);
            }}
          >
            Save
          </Button>
          {/* @ts-ignore */}
          <Button variant="outlined" onClick={handleClose}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  private _buildInfoDialog(): React.ReactNode {
    const handleInfoClose = () =>
      this.setState({
        infoOpen: false,
      });
    return (
      <Dialog
        open={this.state.infoOpen}
        onClose={handleInfoClose}
        aria-labelledby="non-sms-dialog"
        aria-describedby="non-sms-dialog-description"
      >
        <DialogTitle
          sx={{
            backgroundColor: (theme) => theme.palette.primary.main,
            color: "#FFF",
          }}
        >
          Information about message types
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            <p>
              <b>ISACC messages</b> are messages sent or received directly by
              ISACC, including text messages (SMS), iMessages, etc.
            </p>
            <p>
              <b>Outside communications</b> are manually entered records of
              communications that took place outside of ISACC, such as emails,
              phone calls, postal mail, or other non-automated communication.
            </p>
          </Typography>
          <Alert severity="info">
            Please note that messages external to ISACC and contact/note on the
            recipient will not be sent/communicated to the recipient.
          </Alert>
          <Box
            sx={{
              marginTop: 2,
              border: `1px solid ${grey[200]}`,
              padding: 1,
              borderRadius: 1,
            }}
          >
            <Typography variant="subtitle2" gutterBottom>
              Legend
            </Typography>
            {this._buildLegend()}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={handleInfoClose}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  private _buildLegend(): React.ReactNode {
    const keys = Object.keys(MessagingView.colorsByType);
    const halfwayIndex = Math.ceil(keys.length / 2 - 1);
    const group1 = keys.filter((item, index) => index <= halfwayIndex);
    const group2 = keys.filter((item, index) => index > halfwayIndex);
    const labels: any = {
      incoming: "reply from recipient",
      nonSMSReceived: "non-SMS received outside communication",
      nonSMSSent: "non-SMS sent outside communication",
      pending: "pending message",
      system: "sent by system",
      error: "not delievered because of an error",
      smsByAuthor: "sent by user",
      comment: "comment",
    };
    const legendIconStyle = (key: string) => ({
      backgroundColor:
        (key === "pending" || key === "error") ? "#FFF" : MessagingView.colorsByType[key],
      width: 16,
      height: 16,
      borderRadius: "100vmax",
      border:
        key === "pending" || key === "error"
          ? `1px dashed ${MessagingView.colorsByType[key]}`
          : "none",
    });
    const legendItem = (key: string) => (
      <Stack
        spacing={1}
        direction={"row"}
        alignItems={"center"}
        key={`legend_${key}`}
      >
        <Box sx={legendIconStyle(key)}></Box>
        <Typography variant="body2">{labels[key]}</Typography>
      </Stack>
    );
    return (
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 1, sm: 2 }}
        alignItems={"flex-start"}
        justifyContent={"flex-start"}
      >
        {[group1, group2].map((item, index) => {
          return (
            <Stack
              key={`legend_group_${index}`}
              direction={"column"}
              spacing={1}
            >
              {item.map((key) => {
                return legendItem(key);
              })}
            </Stack>
          );
        })}
      </Stack>
    );
  }

  private handleLastUnfollowedDateTimeByCommunication(
    communication: Communication
  ) {
    // @ts-ignore
    const context: FhirClientContextType = this.context;
    const patient: Patient = context.patient;
    const isOutsideCommunication = !!communication.category?.find(
      (c: ICodeableConcept) =>
        c.coding.find((coding: ICoding) =>
          IsaccMessageCategory.isaccNonSMSMessage.equals(coding)
        )
    );
    // if an outside communication is sent to the recipient
    if (isOutsideCommunication && communication.sent) {
      const existingLastUnfollowedMessageDateTime =
        patient.lastUnfollowedMessageDateTime;
      // if date/time of outside communication > existing last unfollowed message date/time
      // means the provider has responded to the recipient's last message
      if (
        existingLastUnfollowedMessageDateTime &&
        new Date(communication.sent) >
          new Date(existingLastUnfollowedMessageDateTime)
      ) {
        this.unsetLastUnfollowedDateTime();
      }
    }
  }

  private unsetLastUnfollowedDateTime() {
    // @ts-ignore
    const context: FhirClientContextType = this.context;
    const patient: Patient = context.patient;
    // set to a future date, this is so that `Time Since Reply` can be sorted
    patient.lastUnfollowedMessageDateTime =
      Patient.UNSET_LAST_UNFOLLOWED_DATETIME;
    const client = context.client;
    if (client) {
      client
        // @ts-ignore
        .update(patient)
        .then(() => this.setState({}))
        .catch((e) => {
          console.log(
            "Error occurred unsetting unresponded message date/time ",
            e
          );
          this.setState({
            error:
              "Unable to unset unresponded message date/time.  See console for detail.",
          });
        });
    }
  }

  private saveNonSMSMessage() {
    // @ts-ignore
    let context: FhirClientContextType = this.context;
    this.setState({ saveLoading: true });
    const messageType = this.state.activeMessage?.type;
    const messageStatus = this.state.activeMessage?.status;
    const sentDate =
      messageStatus === "sent" ? this.state.activeMessage.date : null;
    const receivedDate =
      messageStatus === "received" ? this.state.activeMessage.date : null;
    const currentPractitioner = context.practitioner;
    const userName = getUserName(context.client);
    const practitionerName = currentPractitioner
      ? [
          currentPractitioner.firstName,
          currentPractitioner.lastName?.charAt(0) || "",
        ].join(" ")
      : "";
    const enteredByText = practitionerName
      ? `entered by ${practitionerName}`
      : userName
      ? `entered by ${userName}`
      : "staff-entered";
    const noteAboutCommunication = `${messageType}, ${enteredByText}`;
    const isMarkedAsResolved = messageType === "marked as read";
    // new communication
    // TODO implement sender, requires Practitioner resource set for the user
    let newCommunication = Communication.create(
      this.state.activeMessage.content,
      context.patient,
      context.currentCarePlan,
      sentDate,
      receivedDate,
      isMarkedAsResolved ? IsaccMessageCategory.isaccMarkedAsResolved : (
        messageType === "comment"
        ? IsaccMessageCategory.isaccComment
        : IsaccMessageCategory.isaccNonSMSMessage
      ),
      noteAboutCommunication,
      currentPractitioner
    );
    if (isMarkedAsResolved) {
      newCommunication.status = "completed";
    }
    this._save(newCommunication, (savedResult: IResource) => {
      console.log("Saved new communication:", savedResult);
      this.handleLastUnfollowedDateTimeByCommunication(newCommunication);
      this.setState({
        activeMessage: {
          ...defaultMessage,
          // this will allow the ISACC manual tab to be selected after marking a message as resolved
          // otherwise no tab will be selected, which is confusing on the UI
          type: isMarkedAsResolved ? "sms" : messageType,
        },
        error: null,
      });
      this.loadCommunications();
      this.setState({
        showSaveFeedback: true,
      });
      setTimeout(() => this.setState({ saveLoading: false }), 250);
      setTimeout(() => this.setState({ showSaveFeedback: false }), 2000);
    });
  }

  private saveSMSMessage() {
    // @ts-ignore
    let context: FhirClientContextType = this.context;
    const currentPractitioner = context.practitioner;
    let newMessage: CommunicationRequest =
      CommunicationRequest.createNewManualOutgoingMessage(
        this.state.activeMessage.content,
        context.patient,
        context.currentCarePlan,
        context.practitioner,
        currentPractitioner
          ? [
              "response from",
              currentPractitioner.firstName,
              currentPractitioner.lastName?.charAt(0) || "",
            ].join(" ")
          : ""
      );
    this._save(newMessage, (savedCommunicationRequest: IResource) => {
      console.log("Saved new CommunicationRequest:", savedCommunicationRequest);
      this.state.temporaryCommunications.unshift(
        Communication.tempCommunicationFrom(savedCommunicationRequest)
      );
      this.setState({
        activeMessage: defaultMessage,
        temporaryCommunications: this.state.temporaryCommunications,
        error: null,
      });
    });
  }

  private _save(
    newMessage: Communication | CommunicationRequest,
    successCallback: Function,
    errorCallback: Function = null
  ) {
    // @ts-ignore
    let context: FhirClientContextType = this.context;
    console.log("Attempting to save new message:", newMessage);
    this.setState({ showSaveFeedback: false });
    if (!context || !context.client) return;
    context.client
      .create(newMessage)
      .then(
        (savedResult: IResource) => {
          console.log("Saved resource:", savedResult);
          if (successCallback) successCallback(savedResult);
        },
        (reason: any) => {
          console.log("Failed to create new CommunicationRequest:", reason);
          this.setState({ error: reason, saveLoading: false });
          if (errorCallback) errorCallback(reason);
        }
      )
      .catch((reason: any) => {
        console.log("Failed to create new CommunicationRequest:", reason);
        this.setState({ error: reason, saveLoading: false });
        if (errorCallback) errorCallback(reason);
      });
  }

  private _buildMessageRow(
    message: Communication,
    index: number
  ): React.ReactNode {
    let incoming = true;
    // @ts-ignore
    const client = this.context.client;
    if (!client) return null;
    const isNonSmsMessage = !!message.category?.find((c: ICodeableConcept) =>
      c.coding.find(
        (coding: ICoding) =>
          IsaccMessageCategory.isaccNonSMSMessage.equals(coding) ||
          IsaccMessageCategory.isaccComment.equals(coding) ||
          IsaccMessageCategory.isaccMarkedAsResolved.equals(coding)
      )
    );
    const isComment = !!message.category?.find((c: ICodeableConcept) =>
      c.coding.find((coding: ICoding) =>
        IsaccMessageCategory.isaccComment.equals(coding)
      )
    );

    if (isNonSmsMessage || isComment) {
      incoming = !!message.received;
    } else if (
      message.recipient &&
      message.recipient.find((r: IReference) => r.reference.includes("Patient"))
    ) {
      incoming = false;
    }

    let timestamp = null;
    let delivered = true;
    let unsubscribed = false;
    let error = false;
    if (!isNonSmsMessage && message.status === "stopped")
    {
      // Message failed due to being unsubscribed
      unsubscribed = true;
    } else if (!isNonSmsMessage && message.status === "unknown"){
      // Message failed due to unaccounted for error
      error = true;
    }
    if (!isNonSmsMessage && message.sent) {
      timestamp = MessagingView.displayDateTime(message.sent);
    } else {
      delivered = false;
    }
    let messageText = message?.displayText();
    let autoMessage = true;
    if (!message.category) {
      console.log("Communication is missing category");
    } else if (
      message.category?.find((c: ICodeableConcept) =>
        c.coding.find((coding: ICoding) =>
          IsaccMessageCategory.isaccManuallySentMessage.equals(coding)
        )
      )
    ) {
      autoMessage = false;
    }
    let bubbleStyle = MessagingView.getBubbleStyle(
      incoming,
      autoMessage,
      delivered,
      isNonSmsMessage && incoming,
      isNonSmsMessage && !incoming,
      unsubscribed,
      error,
      isComment
    );
    let priority = message.priority;
    let themes: string[] = message.getThemes();
    const note = message.displayNote();
    const itemLabel: string = isNonSmsMessage
      ? [
          note,
          `${
            message.sent ? "sent" : "received"
          } on ${MessagingView.displayDateTime(
            message.sent ? message.sent : message.received
          )}`,
        ]
          .join("\n")
          .trim()
      : [
          `${
            incoming
              ? "reply (from recipient)"
              : message.sent
              ? autoMessage
                ? "scheduled Caring Contact message"
                : note
                ? note
                : "response (from author)"
              : ""
          }`,
          `${
            error
              ? "message failed to deliver"
              : (unsubscribed ? "messaged failed to deliver because recipient unsubscribed": "")
          }`,
        ]
          .join("\n")
          .trim();

    let isEditable = isNonSmsMessage || isComment;
    // @ts-ignore
    const userName = getUserName(this.context.client);

    // @ts-ignore
    const currentPractitioner = this.context.practitioner;
    const referenceId = message?.sender?.reference.split("/")[1];
    // practitioner info is available, user can only edit a outside communication or comment authored by him/herself
    if (
      currentPractitioner &&
      message.sender &&
      message.sender.reference &&
      message.sender.reference.toLowerCase().includes("practitioner") &&
      referenceId
    ) {
      isEditable = isEditable && referenceId === currentPractitioner.id;
    }
    // username is available, user can only edit a outside communication or comment authored by him/herself
    else if (userName) isEditable = isEditable && note.includes(userName);

    return this._alignedRow(
      incoming,
      messageText,
      timestamp,
      bubbleStyle,
      priority,
      index,
      themes,
      itemLabel,
      isEditable,
      message,
      !!(error || unsubscribed)
    );
  }

  private _alignedRow(
    incoming: boolean,
    messageText: string,
    timestamp: string,
    bubbleStyle: object,
    priority: string,
    index: number,
    themes: string[],
    comment: string,
    editable: boolean,
    message: Communication,
    error: boolean
  ) {
    let priorityIndicator = null;
    if (getEnv("REACT_APP_SHOW_PRIORITY_INDICATOR")?.toLowerCase() === "true") {
      if (priority === "urgent") {
        priorityIndicator = <Warning color={"warning"} />;
      } else if (priority === "stat") {
        priorityIndicator = <Error color={"error"} />;
      }
    }
    let align = incoming ? "flex-start" : "flex-end";

    let box = messageText ? (
      <Box
        sx={{
          borderRadius: "12px",
          padding: 1,
          ...bubbleStyle,
        }}
      >
        <Typography variant={"body2"}>{messageText}</Typography>
      </Box>
    ) : (
      <Alert severity="warning">No message content</Alert>
    );

    let bubbleAndPriorityRow;
    if (incoming) {
      // different order based on message direction
      bubbleAndPriorityRow = (
        <>
          {box}
          {priorityIndicator}
        </>
      );
    } else {
      bubbleAndPriorityRow = (
        <>
          {priorityIndicator}
          {box}
        </>
      );
    }

    let messageGroup = (
      <Grid item xs={11} md={10} lg={8}>
        <Stack direction={"column"} alignItems={align} paddingBottom={0.5}>
          <Stack
            direction={"row"}
            alignItems={"center"}
            spacing={1}
            sx={{
              whiteSpace: "normal",
              wordBreak: "break-word",
            }}
          >
            {bubbleAndPriorityRow}
          </Stack>
          {themes.length > 0 && (
            <Stack direction={"row"} spacing={0.5} paddingTop={0.5}>
              {themes.map((theme: string, index: number) => (
                <Chip
                  size={"small"}
                  variant="outlined"
                  label={theme}
                  onClick={(event) => console.log(event)}
                  key={`theme_chip_${index}`}
                />
              ))}
            </Stack>
          )}
          {timestamp && (
            <Typography variant={"caption"}>{timestamp}</Typography>
          )}
          <Stack direction="row" alignItems={"center"}>
            {comment && (
              <Typography
                variant="caption"
                color="text.secondary"
                gutterBottom
                sx={{
                  whiteSpace: "pre", // preserve line break character
                  textAlign: incoming ? "left" : "right",
                  color: error ? red[900] : "#0009",
                }}
              >
                {comment}
              </Typography>
            )}
            {editable && (
              <IconButton
                size="small"
                title="Edit"
                onClick={() => {
                  this.setState({
                    editEntry: Communication.from(message),
                    isEditing: true,
                  });
                }}
              >
                <EditIcon fontSize="small" arial-label="Edit"></EditIcon>
              </IconButton>
            )}
          </Stack>
        </Stack>
      </Grid>
    );

    let spacer = <Grid item xs={1} md={2} lg={4} />;

    let messageAndSpacerRow;
    if (incoming) {
      // different order based on message direction
      messageAndSpacerRow = (
        <>
          {messageGroup}
          {spacer}
        </>
      );
    } else {
      messageAndSpacerRow = (
        <>
          {spacer}
          {messageGroup}
        </>
      );
    }

    return (
      <Grid
        container
        key={index}
        direction={"row"}
        justifyContent={align}
        alignItems={"center"}
        spacing={0.5}
      >
        {messageAndSpacerRow}
      </Grid>
    );
  }

  private static colorsByType: any = {
    incoming: teal[600],
    system: "#9fceee",
    smsByAuthor: lightBlue[800],
    pending: grey[700],
    nonSMSReceived: teal[50],
    nonSMSSent: "#c9e4f7",
    error: red[900],
    comment: grey[300],
  };

  private static getBubbleStyle(
    incoming: boolean,
    auto: boolean,
    delivered: boolean,
    nonSMSReceived: boolean,
    nonSMSSent: boolean,
    unsubscribed: boolean,
    error: boolean,
    comment: boolean
  ): object {
    if (comment)
      return {
        backgroundColor: MessagingView.colorsByType["comment"],
        borderRadius: 0,
        color: "#000",
        boxShadow: `1px 1px 2px ${grey[700]}`,
        borderBottomRightRadius: "72px 4px",
      };
    if (error || unsubscribed)
      return {
        borderStyle: "dashed",
        backgroundColor: "#FFF",
        borderWidth: "1px",
        color: "#000",
        borderColor: red[900]
      };
    if (nonSMSReceived)
      return {
        backgroundColor: MessagingView.colorsByType["nonSMSReceived"],
        borderRadius: 0,
        color: "#000",
        boxShadow: `1px 1px 2px ${grey[700]}`,
        borderBottomRightRadius: "72px 4px",
      };
    if (nonSMSSent)
      return {
        backgroundColor: MessagingView.colorsByType["nonSMSSent"],
        borderRadius: 0,
        color: "#000",
        boxShadow: `1px 1px 2px ${grey[700]}`,
        borderBottomRightRadius: "72px 4px",
      };
    if (!delivered)
      return {
        borderStyle: "dashed",
        borderColor: MessagingView.colorsByType["pending"],
        borderWidth: "1px",
        color: "#000",
      };
    if (incoming)
      return {
        backgroundColor: MessagingView.colorsByType["incoming"],
        color: "#fff",
      };
    if (auto)
      return {
        backgroundColor: MessagingView.colorsByType["system"],
        color: "#000",
      };
    return {
      backgroundColor: MessagingView.colorsByType["smsByAuthor"],
      color: "#fff",
    };
  }
  private _hasMessageContent(content: string): boolean {
    if (!content) return false;
    return !!String(content).trim();
  }

  private _hasMessageDate(date: Date | string, error: boolean): boolean {
    if (error) return false;
    return MessagingView.isValidDate(date);
  }

  private _getDateTiemValidationErrorMessage(error: string): string {
    if (!error) return "";
    switch (error) {
      case "disableFuture": {
        return "Date/time is in the future.";
      }
      case "maxDate":
      case "minDate": {
        return "Please select a date in the correct range.";
      }
      case "invalidDate": {
        return "Date/time is not valid.";
      }

      default: {
        return "";
      }
    }
  }

  private static displayDateTime(dateString: string): string {
    if (!dateString) return "";
    const dateObj = new Date(dateString);
    const dateDisplay = dateObj.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
    const timeDisplay = dateObj.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${dateDisplay} ${timeDisplay}`;
  }
  private static isValidDate(dateString: string | Date): boolean {
    if (!dateString) return false;
    const dateVal =
      dateString instanceof Date ? dateString : new Date(dateString);
    return dateVal instanceof Date && !isNaN(dateVal.getTime());
  }
}
