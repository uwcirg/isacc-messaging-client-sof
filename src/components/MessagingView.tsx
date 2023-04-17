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
    Divider,
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
import {DateTimePicker} from "@mui/x-date-pickers/DateTimePicker";
import {amber, grey, lightBlue} from "@mui/material/colors";
import {IsaccMessageCategory} from "../model/CodeSystem";
import {Error, Refresh, Warning} from "@mui/icons-material";
import {CommunicationRequest} from "../model/CommunicationRequest";
import Client from "fhirclient/lib/Client";
import {Bundle} from "../model/Bundle";
import {getEnv} from "../util/util";

type MessageType = "sms" | "manual" | "comment";
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
    // showAlert: boolean;
    // alertSeverity: "error" | "warning" | "info" | "success";
    // alertText: string;
  }
> {
  static contextType = FhirClientContext;
  interval: any;

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
  }
  componentWillUnmount() {
    clearInterval(this.interval);
  }

  loadCommunications() {
    // @ts-ignore
    let context: FhirClientContextType = this.context;
    this.setState({ messagesLoading: true });

    this.getCommunications(context.client, context.carePlan.id)
      .then(
        (result: Communication[]) => {
          let temporaryCommunications =
            this.state.temporaryCommunications.filter((tc: Communication) => {
              return !result?.find((c: Communication) => {
                return c.basedOn?.find((b: IReference) => {
                  return b.reference?.split("/")[1] === tc.id;
                });
              });
            });

          this.setState({
            communications: result,
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

  async getCommunications(client: Client, carePlanId: string): Promise<Communication[]> {
    if (!client) return;
    // Communication?part-of=CarePlan/${carePlanId}
    let params = new URLSearchParams({
      "part-of": `CarePlan/${carePlanId}`
    }).toString();
    return await client
      .request({
        url: `/Communication?${params}`,
        headers: {
          "Cache-Control": "no-cache",
        },
      })
      .then(
        (bundle: Bundle) => {
          if (bundle.type === "searchset") {
            if (!bundle.entry) return [];

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

    if (!context.carePlan || !this.state.communications) {
      return <CircularProgress />;
    }

    let messageBoxProps = {
      maxHeight: 600,
      minHeight: 40,
      overflow: "auto",
      display: "flex",
      flexDirection: "column-reverse",
      border: "2px solid lightgrey",
      borderRadius: 1,
      paddingLeft: 0.5,
      paddingRight: 0.5,
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
        <List sx={messageBoxProps}>
          {communications.map((message: Communication, index) =>
            this._buildMessageRow(message, index)
          )}
        </List>
      );
    }

    return (
      <Grid container direction={"column"}>
        <Stack direction={"row"} justifyContent={"space-between"}>
          <Typography variant={"h6"}>{"Messages"}</Typography>
          {this.state.messagesLoading ? (
            <CircularProgress />
          ) : (
            <IconButton
              color="primary"
              onClick={() => this.loadCommunications()}
            >
              <Refresh />
            </IconButton>
          )}
        </Stack>

        {messages}

        {this._buildMessageTypeSelector()}

        <Divider></Divider>

        <Box sx={{ padding: (theme) => theme.spacing(1.5, 1, 1), borderWidth: "0 1px 1px", borderStyle: "solid", borderColor:grey[200] }}>
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
    );
  }

  private _buildMessageTypeSelector(): React.ReactNode {
    const handleInfoClose = () =>
      this.setState({
        infoOpen: false,
      });
    const tabProps = {
      sx: {
        padding: (theme: any) => theme.spacing(1, 2.5),
      },
    };
    return (
      <Stack direction={"row"} alignItems={"center"}>
        <Tabs
          value={this.state.activeMessage?.type}
          onChange={(event: React.SyntheticEvent, value: MessageType) => {
            this.setState({
              activeMessage: { ...defaultMessage, type: value },
            });
          }}
          textColor="primary"
          indicatorColor="primary"
          aria-label="message type tabs"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            marginTop: 1.5,
            minHeight: "40px",
          }}
        >
          <Tab value="sms" label="ISACC send" {...tabProps} />
          <Tab value="manual" label="Enter manual message" {...tabProps} />
          <Tab value="comment" label="Enter comment" {...tabProps} />
        </Tabs>
        <IconButton
          color="info"
          onClick={() => this.setState({ infoOpen: true })}
        >
          <InfoIcon></InfoIcon>
        </IconButton>
        <Dialog
          open={this.state.infoOpen}
          onClose={handleInfoClose}
          aria-labelledby="non-sms-dialog"
          aria-describedby="non-sms-dialog-description"
        >
          <DialogTitle>Information about message types</DialogTitle>
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
              Please note that messages external to ISACC and contact/note on
              the recipient will not be sent/communicated to the recipient.
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button variant="text" onClick={handleInfoClose}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
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
              status: "sent"
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
          direction={"row"}
          spacing={1.5}
          alignItems={{
            xs: "flex-start",
            sm: "center",
          }}
          justifyContent={"flex-start"}
          sx={{
            marginTop: 0.5,
            marginBottom: 1,
          }}
        >
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
            sx={{
              borderRadius: 1,
              border: "1px solid",
              borderColor: "#c4c4c4",
            }}
          >
            <FormControlLabel value={"sent"} label={"sent"} {...radioProps} />
            <FormControlLabel
              value="received"
              label="received"
              {...radioProps}
            />
          </RadioGroup>
          <Typography variant="body2" color="text.secondary">
            at
          </Typography>
          <DateTimePicker
            label="Date & time"
            inputFormat="ddd, MM/DD/YYYY hh:mm A"
            value={this.state.activeMessage?.date}
            renderInput={(params: TextFieldProps) => (
              <TextField
                {...params}
                sx={{ minWidth: 264, backgroundColor: "#FFF" }}
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
    const noteAboutCommunication = `non-SMS ${this.state.activeMessage?.type}, staff-entered`;
    // new communication
    // TODO implement sender, requires Practitioner resource set for the user
    const newCommunication = Communication.create(
      this.state.activeMessage.content,
      context.patient,
      context.carePlan,
      sentDate,
      receivedDate,
      IsaccMessageCategory.isaccNonSMSMessage,
      noteAboutCommunication
    );
    // save communication
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
        context.carePlan
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
    const isNonSmsMessage = !!message.category.find((c: ICodeableConcept) =>
      c.coding.find((coding: ICoding) =>
        IsaccMessageCategory.isaccNonSMSMessage.equals(coding)
      )
    );

    if (isNonSmsMessage) {
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
      message.category.find((c: ICodeableConcept) =>
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
      isNonSmsMessage
    );
    let priority = message.priority;
    let themes: string[] = message.getThemes();
    const note = message.displayNote();
    const messageLabel : string = isNonSmsMessage
      ? [
          note,
          `${
            message.sent ? "sent" : "received"
          } on ${MessagingView.displayDateTime(
            message.sent ? message.sent : message.received
          )}`,
        ].join("\n")
      : [
          note,
          `${
            incoming
              ? "reply (from recipient)"
              : message.sent
              ? "response (from author)"
              : ""
          }`,
        ].join("\n");

    return this._alignedRow(
      incoming,
      msg,
      timestamp,
      bubbleStyle,
      priority,
      index,
      themes,
      messageLabel
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

    let box = (
      <Box
        sx={{
          borderRadius: "12px",
          padding: 1,
          ...bubbleStyle,
        }}
      >
        <Typography variant={"body2"}>{message}</Typography>
      </Box>
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
          {comment && (
            <Typography
              variant="caption"
              color="text.secondary"
              gutterBottom
              sx={{ whiteSpace: "pre-line" }}
            >
              {comment}
            </Typography>
          )}
          {timestamp && (
            <Typography variant={"caption"}>{timestamp}</Typography>
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

  private static getBubbleStyle(
    incoming: boolean,
    auto: boolean,
    delivered: boolean,
    info: boolean
  ): object {
    if (info)
      return {
        backgroundColor: amber[100],
        color: "#000",
      };
    if (!delivered)
      return {
        borderStyle: "dashed",
        borderColor: grey[700],
        borderWidth: "1px",
        color: "#000",
      };
    if (incoming)
      return {
        backgroundColor: grey[300],
        color: "#000",
      };
    if (auto)
      return {
        backgroundColor: lightBlue[100],
        color: "#000",
      };
    return {
      backgroundColor: lightBlue[700],
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
