import * as React from "react";

import {FhirClientContext, FhirClientContextType} from "../FhirClientContext";

import Communication from "../model/Communication";
import {IBundle_Entry, ICodeableConcept, ICoding, IReference, IResource} from "@ahryman40k/ts-fhir-types/lib/R4";
import {
    Alert,
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
import LoadingButton from "@mui/lab/LoadingButton";
import InfoIcon from "@mui/icons-material/Info";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import moment from "moment";
import {DateTimePicker} from "@mui/x-date-pickers/DateTimePicker";
import {grey, lightBlue, pink, yellow} from "@mui/material/colors";
import {IsaccMessageCategory} from "../model/CodeSystem";
import {Error, Refresh, Warning} from "@mui/icons-material";
import {CommunicationRequest} from "../model/CommunicationRequest";
import Client from "fhirclient/lib/Client";
import {Bundle} from "../model/Bundle";
import {getEnv} from "../util/util";
import {getFhirData, getUserName } from "../util/isacc_util";

type MessageType = "sms" | "manual message" | "comment";
type MessageStatus = "sent" | "received";

interface Message {
    date: string,
    content: string,
    type: MessageType,
    status: MessageStatus
}

const defaultMessage: Message = {
    date: new Date().toISOString(),
    content: "",
    type: "sms",
    status: "sent"
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
    temporaryCommunications: Communication[];
    messagesLoading: boolean;
    saveLoading: boolean;
    showSaveFeedback: boolean;
    infoOpen: boolean;
    nextPageURL: string;
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
      temporaryCommunications: [],
      messagesLoading: false,
      saveLoading: false,
      showSaveFeedback: false,
      infoOpen: false,
      nextPageURL: null
    };
  }

  componentDidMount() {
    if (!this.state) return;
    if (!this.state.communications) {
      this.loadCommunications();
    }
    this.interval = setInterval(() => {
      console.log("Timer triggered");
      this.loadCommunications();
    }, 60000);

    window.addEventListener("DOMContentLoaded", () => {
      // ensure scrollTop property is set to end of scrolled content at startup
      // to have accurate calculation of scrolled position
      this.messagesPanelRef.current.scrollTop =
        this.messagesPanelRef.current.scrollHeight;
    });
  }
  componentWillUnmount() {
    clearInterval(this.interval);
    clearTimeout(this.getNextPageInterval);
    abortController.abort(); // abort any pending HTTP request
  }

  loadCommunications(url: string = null) {
    // @ts-ignore
    let context: FhirClientContextType = this.context;
    this.setState({ messagesLoading: true });

    const carePlanIds = context.allCarePlans?.map(item => item.id)

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

  async getCommunications(
    client: Client,
    carePlanIds: string[],
    url: string
  ): Promise<Communication[]> {
    if (!client) return;
    // Communication?part-of=CarePlan/${id1}[,CarePlan/${id2}]
    // get communications for all care plans for the patient
    let params = new URLSearchParams({
        "part-of": carePlanIds?.map(item =>`CarePlan/${item}`).join(","),
        _count: "200"
      }).toString();
    const requestURL = url ? url : `/Communication?${params}`
    return await getFhirData(client, requestURL, signal).then(
        (bundle: Bundle) => {
          if (bundle.type === "searchset") {
            if (!bundle.entry) return [];
            let nextPageURL:string = null;
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
                  console.log("Communication loaded:", e);
                  return Communication.from(e.resource);
                }
              }
            );
            if (nextPageURL !== this.state.nextPageURL) {
                this.setState({
                    nextPageURL: nextPageURL
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
    if (!this.state) return <CircularProgress />;

    // @ts-ignore
    let context: FhirClientContextType = this.context;

    if (context.error) {
      return <Alert severity="error">{context.error}</Alert>;
    }

    if (!context.currentCarePlan || !this.state.communications) {
      return <CircularProgress />;
    }

    let messageBoxProps = {
      maxHeight: 548,
      minHeight: 40,
      overflow: "auto",
      display: "flex",
      flexDirection: "column-reverse",
      border: "2px solid lightgrey",
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
        let d1 = a.sent ? a.sent : a.received ?? a.meta.lastUpdated;
        let d2 = b.sent ? b.sent : b.received ?? b.meta.lastUpdated;
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
          </Stack>

          {messages}

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

          {this.state.error && (
            <Alert severity="error" sx={{ marginTop: 2 }}>
              {typeof this.state.error === "string"
                ? this.state.error
                : "Error occurred.  See console for detail."}
            </Alert>
          )}
        </Grid>
        {this._buildInfoDialog()}
      </>
    );
  }

  private _buildMessageTypeSelector(): React.ReactNode {
    const tabRootStyleProps = {
      margin: {
        xs: "8px auto 0",
        sm: "8px 0 0"
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
            sm : (theme: any) => theme.spacing(1, 2.5)
        },
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
              activeMessage: { ...defaultMessage, type: value },
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
          <Tab value="sms" label="ISACC send" {...tabProps} />
          <Tab
            value="manual message"
            label="Enter manual message"
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
            disabled={!this._hasMessageContent()}
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
                    width: "100%"
                }}
                renderInput={(params: TextFieldProps) => (
                  <TextField
                    {...params}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                      if (MessagingView.isValidDate(event.target.value)) {
                        this.setState({
                          activeMessage: {
                            ...this.state.activeMessage,
                            date: event.target.value
                              ? new Date(event.target.value).toISOString()
                              : null,
                          },
                        });
                      }
                    }}
                    sx={{ width: "100%", flexGrow: 1 }}
                  />
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
            disabled={!this._hasMessageContent() || !this._hasMessageDate()}
          >
            Save
          </LoadingButton>
        </Box>
      </>
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
              <b>Manual messages</b> are manually entered records of
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
      info: "non-SMS manual message",
      pending: "pending message",
      system: "sent by system",
      smsByAuthor: "sent by user",
      comment: "comment",
    };
    const legendIconStyle = (key: string) => ({
      backgroundColor:
        key === "pending" ? "#FFF" : MessagingView.colorsByType[key],
      width: 16,
      height: 16,
      borderRadius: "100vmax",
      border:
        key === "pending"
          ? `1px dashed ${MessagingView.colorsByType[key]}`
          : "none",
    });
    const legendItem = (key: string) => (
      <Stack spacing={1} direction={"row"} alignItems={"center"}>
        <Box sx={legendIconStyle(key)} key={`legend_${key}`}></Box>
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

  private saveNonSMSMessage() {
    // @ts-ignore
    let context: FhirClientContextType = this.context;
    this.setState({ saveLoading: true });
    const sentDate =
      this.state.activeMessage?.status === "sent"
        ? this.state.activeMessage.date
        : null;
    const receivedDate =
      this.state.activeMessage?.status === "received"
        ? this.state.activeMessage.date
        : null;
    const userName = getUserName(context.client);
    const enteredByText = userName ? `entered by ${userName}` : "staff-entered";
    const noteAboutCommunication = `${this.state.activeMessage?.type}, ${enteredByText}`;
    // new communication
    // TODO implement sender, requires Practitioner resource set for the user
    const newCommunication = Communication.create(
      this.state.activeMessage.content,
      context.patient,
      context.currentCarePlan,
      sentDate,
      receivedDate,
      this.state.activeMessage?.type === "comment"
        ? IsaccMessageCategory.isaccComment
        : IsaccMessageCategory.isaccNonSMSMessage,
      noteAboutCommunication
    );
    this._save(newCommunication, (savedResult: IResource) => {
      console.log("Saved new communication:", savedResult);
      const currentMessageType = this.state.activeMessage.type;
      this.setState({
        activeMessage: {
          ...defaultMessage,
          type: currentMessageType,
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
    let newMessage: CommunicationRequest =
      CommunicationRequest.createNewManualOutgoingMessage(
        this.state.activeMessage.content,
        context.patient,
        context.currentCarePlan
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
    const isNonSmsMessage = !!message.category?.find((c: ICodeableConcept) =>
      c.coding.find(
        (coding: ICoding) =>
          IsaccMessageCategory.isaccNonSMSMessage.equals(coding) ||
          IsaccMessageCategory.isaccComment.equals(coding)
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

    if (!isNonSmsMessage && message.sent) {
      timestamp = MessagingView.displayDateTime(message.sent);
    } else {
      delivered = false;
    }
    let msg = message.displayText();
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
      isNonSmsMessage,
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
          note,
          `${
            incoming
              ? "reply (from recipient)"
              : message.sent
              ? (autoMessage ? "scheduled Caring Contact message" : "response (from author)")
              : ""
          }`,
        ]
          .join("\n")
          .trim();

    return this._alignedRow(
      incoming,
      msg,
      timestamp,
      bubbleStyle,
      priority,
      index,
      themes,
      itemLabel
    );
  }

  private _alignedRow(
    incoming: boolean,
    message: string,
    timestamp: string,
    bubbleStyle: object,
    priority: string,
    index: number,
    themes: string[],
    comment: string
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

    let box = message ? (
      <Box
        sx={{
          borderRadius: "12px",
          padding: 1,
          ...bubbleStyle,
        }}
      >
        <Typography variant={"body2"}>{message}</Typography>
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
          <Stack direction={"row"} alignItems={"center"} spacing={1}>
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
          {comment && (
            <Typography
              variant="caption"
              color="text.secondary"
              gutterBottom
              sx={{
                whiteSpace: "pre", // preserve line break character
                textAlign: incoming ? "left" : "right",
              }}
            >
              {comment}
            </Typography>
          )}
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
    incoming: grey[300],
    system: lightBlue[100],
    smsByAuthor: lightBlue[700],
    pending: grey[700],
    info: yellow[300],
    comment: pink[100],
  };

  private static getBubbleStyle(
    incoming: boolean,
    auto: boolean,
    delivered: boolean,
    info: boolean,
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
    if (info)
      return {
        backgroundColor: MessagingView.colorsByType["info"],
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
        color: "#000",
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
  private _hasMessageContent(): boolean {
    return !(
      !this.state.activeMessage ||
      !this.state.activeMessage.content ||
      !String(this.state.activeMessage.content).trim()
    );
  }

  private _hasMessageDate(): boolean {
    return (
      this.state.activeMessage &&
      MessagingView.isValidDate(this.state.activeMessage.date)
    );
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
  private static isValidDate(dateString: string): boolean {
    if (!dateString) return false;
    const dateVal = new Date(dateString);
    return dateVal instanceof Date && !isNaN(dateVal.getTime());
  }
}
