import * as React from "react";

import {FhirClientContext, FhirClientContextType} from "../FhirClientContext";

import Communication from "../model/Communication";
import {IBundle_Entry, ICodeableConcept, ICoding, IReference, IResource} from "@ahryman40k/ts-fhir-types/lib/R4";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  FormControlLabel,
  Grid,
  IconButton,
  List,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  TextFieldProps,
  Typography,
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import InfoIcon from "@mui/icons-material/Info";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import {amber, grey, lightBlue} from "@mui/material/colors";
import {IsaccMessageCategory} from "../model/CodeSystem";
import Alert from "@mui/material/Alert";
import {Error, Refresh, Warning} from "@mui/icons-material";
import {CommunicationRequest} from "../model/CommunicationRequest";
import Client from "fhirclient/lib/Client";
import {Bundle} from "../model/Bundle";
import {getEnv} from "../util/util";

type MessageType  = "sms" | "manual message" | "note";
type MessageMode = "sent" |  "received";

interface Message {
    date: string,
    content: string,
    type: MessageType
    mode: MessageMode
}

const defaultMessage : Message = {
    date: new Date().toISOString(),
    content: "",
    type: "sms",
    mode: "sent"
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
      infoOpen: false
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

  async getCommunications(
    client: Client,
    carePlanId: string
  ): Promise<Communication[]> {
    if (!client) return;
    // Communication?part-of=CarePlan/${carePlanId}
    let params = new URLSearchParams({
      "part-of": `CarePlan/${carePlanId}`,
     // _sort: "-sent",
    }).toString();
    return await client.request({
        url : `/Communication?${params}`, 
        headers: {
            "Cache-Control": "no-cache",
        }
    }).then(
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
      border: "1px solid lightgrey",
      borderRadius: 1,
      paddingLeft: 0.5,
      paddingRight: 0.5,
    };

    let messages = (
      <Stack direction={"row"} justifyContent={"flex-end"} sx={messageBoxProps}>
        <Typography variant={"body1"} color="text.secondary">{"No messages"}</Typography>
      </Stack>
    );

    if (this.state.communications && this.state.communications.length > 0) {
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
          <Typography variant={"h6"} sx={{ paddingTop: 2 }}>
            {"Messages"}
          </Typography>
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

        <Box sx={{ backgroundColor: grey[50], padding: 1 }}>
          {this.state.activeMessage.type === "sms" && this._buildSMSEntryComponent()}
          {this.state.activeMessage.type !== "sms" && this._buildNonSMSEntryComponent()}
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

  private _hasNoMessageContent(): boolean {
    return (
        !this.state.activeMessage || 
        (!this.state.activeMessage.content) || 
        !String(this.state.activeMessage.content).trim()
    );
  }

  private _buildMessageTypeSelector(): React.ReactNode {
    const handleInfoClose = () =>
      this.setState({
        infoOpen: false,
      });
    return (
      <Stack direction={"row"}>
        <RadioGroup
          row
          aria-labelledby="message type radio group"
          name="messageTypes"
          value={this.state.activeMessage?.type}
          //@ts-ignore
          onChange={(event: React.ChangeEvent, value: MessageType) => {
            this.setState({ activeMessage: {...this.state.activeMessage, type: value} });
          }}
          sx={{ marginTop: 1.5 }}
        >
          <FormControlLabel
            value="sms"
            control={<Radio size="small" />}
            label="ISSAC send"
          />
          <FormControlLabel
            value="manual message"
            control={<Radio size="small" />}
            label="Enter manual message"
          />
           <FormControlLabel
            value="note"
            control={<Radio size="small" />}
            label="Enter comment"
          />
        </RadioGroup>
        <IconButton
          color="info"
          size="small"
          sx={{ position: "relative", top: 4 }}
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
          <DialogContent>
            <Typography variant="body1">
              <p><b>ISACC send</b> are messages sent or received directly by ISACC, which include texts, “sms”, iMessages, etc.</p>
              <p><b>Manual messages</b> mean messages external to ISACC, including manually entered notifications of emails, phone calls, postal mail, or other non-automated communication.</p>
              <p><b>Comments</b> are contact/note on the patient.</p>
            </Typography>
            <Alert severity="info">Please note that messages external to ISACC and contact/note on the patient will not be sent/communicated to the patient.</Alert>
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
          placeholder={"Type message for ISSAC to send"}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            this.setState({ activeMessage: {...this.state.activeMessage, content : event.target.value }});
          }}
          fullWidth
          sx={{ backgroundColor: "#FFF" }}
        />
        <Stack
          direction={"row"}
          justifyContent={"flex-end"}
          sx={{ marginTop: 1, marginBottom: 1 }}
        >
          <Button variant="contained" onClick={() => this.saveMessage()} disabled={this._hasNoMessageContent()}>
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
            placeholder="Enter contact/note on patient"
            value={this.state.activeMessage?.content ?? ""}
            rows={4}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            this.setState({
                activeMessage: {
                ...this.state.activeMessage,
                date: (new Date()).toISOString(),
                content: event.target.value,
                },
            });
            }}
            sx={{
            backgroundColor: "#FFF",
            }}
            autoFocus
        ></TextField>
    )
  }

  private _buildManualMessageEntryComponent(): React.ReactNode {
     const radioProps = {
        control : <Radio size="small" />,
        sx: {
            paddingLeft: 2
        }
     }
     return (
        <>
            <Stack
                direction={"row"} 
                spacing={2}
                alignItems={"center"}
                justifyContent={"space-around"}
                sx={{
                    marginBottom: 1
                }}
            >
                <Typography variant="body2">
                    Email / Phone / Letter
                </Typography>
                <RadioGroup
                    aria-labelledby="message type radio group"
                    name="messageModes"
                    value={this.state.activeMessage?.mode}
                    //@ts-ignore
                    onChange={(event: React.ChangeEvent, value: MessageMode) => {
                        this.setState({ activeMessage: {...this.state.activeMessage, mode: value} });
                    }}
                    sx={{
                        backgroundColor: "#FFF",
                        borderRadius: 2
                    }}
                >
                    <FormControlLabel
                        value={"sent"}
                        label={"sent"}
                        {...radioProps}
                    />
                    <FormControlLabel
                        value="received"
                        label="received"
                        {...radioProps}
                    />
                </RadioGroup>
                <Typography variant="body2">
                    at
                </Typography>
                <DateTimePicker
                    label="date & time"
                    inputFormat="ddd, MM/DD/YYYY hh:mm A"
                    value={this.state.activeMessage?.date}
                    renderInput={(params: TextFieldProps) => (
                    <TextField
                        {...params}
                        sx={{ minWidth: 264, backgroundColor: "#FFF" }}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                            console.log("value ", event.target.value);
                            //console.log("date value ", new Date(event.target.value).toISOString())
                            const dateVal = new Date(event.target.value);
                            if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
                                this.setState({
                                    activeMessage: {
                                    ...this.state.activeMessage,
                                    date: event.target.value ? dateVal.toISOString() : null,
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
            {/* <Typography variant="subtitle2" sx={{marginTop: 3}}>{`Message ${this.state.activeMessage?.mode} at ${displayDateTime(this.state.activeMessage?.date)}`}</Typography> */}
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
                sx={{
                    backgroundColor: "#FFF",
                }}
            ></TextField>
        </>
     )
  }

  private _buildNonSMSEntryComponent(): React.ReactNode {
    const activeType = this.state.activeMessage.type;
    return (
      <>
        <Stack direction={"column"} spacing={1}>
          {activeType === "note" && this._buildNoteEntryComponent()}
           {activeType !== "note" && this._buildManualMessageEntryComponent()}
        </Stack>
        <Box sx={{ marginTop: 1, textAlign: "right"}}>
          <LoadingButton
            variant="contained"
            onClick={() => {
              this.saveNonSMSMessage();
            }}
            loading={this.state.saveLoading}
            disabled={this._hasNoMessageContent()}
          >
            Save
          </LoadingButton>
        </Box>
      </>
    );
  }

  private saveNonSMSMessage() {
    if (
      this._hasNoMessageContent() || !this.state.activeMessage.date
    ) {
      this.setState({
        error:
          "Incomplete data.  A content and a date for the message are required.",
      });
      return;
    }
    // @ts-ignore
    let context: FhirClientContextType = this.context;
    this.setState({ saveLoading: true });
    const newCommunication = Communication.create(
      this.state.activeMessage.content,
      context.patient,
      context.carePlan,
      this.state.activeMessage?.mode === "sent" ? this.state.activeMessage.date : null,
      this.state.activeMessage?.mode === "received" ? this.state.activeMessage.date : null,
      IsaccMessageCategory.isaccNonSMSMessage,
      `Non-SMS ${this.state.activeMessage?.mode} ${this.state.activeMessage?.type}, staff entered`
    );
    console.log("Saving new non-sms communication: ", newCommunication);
    context.client
      .create(newCommunication)
      .then(
        (savedResult: IResource) => {
          console.log("Saved new Non SMS communication:", savedResult);
          this.setState({
            activeMessage: defaultMessage,
            error: null,
          });
          this.loadCommunications();
          setTimeout(() => this.setState({ saveLoading: false }), 250);
        },
        (reason: any) => {
          console.log("Failed to create new non-sms Communication:", reason);
          this.setState({ error: reason, saveLoading: false });
        }
      )
      .catch((reason: any) => {
        console.log("Failed to create new non-sms Communication:", reason);
        this.setState({ error: reason, saveLoading: false });
      });
  }

  private saveMessage() {
    // @ts-ignore
    let context: FhirClientContextType = this.context;
    let newMessage: CommunicationRequest =
      CommunicationRequest.createNewManualOutgoingMessage(
        this.state.activeMessage.content,
        context.patient,
        context.carePlan
      );
    console.log("Attempting to save new CommunicationRequest:", newMessage);
    context.client
      .create(newMessage)
      .then(
        (savedCommunicationRequest: IResource) => {
          console.log(
            "Saved new CommunicationRequest:",
            savedCommunicationRequest
          );
          this.state.temporaryCommunications.unshift(
            Communication.tempCommunicationFrom(savedCommunicationRequest)
          );
          this.setState({
            activeMessage: defaultMessage,
            temporaryCommunications: this.state.temporaryCommunications,
            error: null,
          });
        },
        (reason: any) => {
          console.log("Failed to create new CommunicationRequest:", reason);
          this.setState({ error: reason });
        }
      )
      .catch((reason: any) => {
        console.log("Failed to create new CommunicationRequest:", reason);
        this.setState({ error: reason });
      });
  }

  private _buildMessageRow(
    message: Communication,
    index: number
  ): React.ReactNode {
    let incoming = true;
    const isNonSmSMessage = message.category.find((c: ICodeableConcept) =>
        c.coding.find((coding: ICoding) => IsaccMessageCategory.isaccNonSMSMessage.equals(coding))
    ) ? true : false;
   
    if (isNonSmSMessage && message.received) {
        incoming = true;
    } else if (
        message.recipient &&
        message.recipient.find((r: IReference) => r.reference.includes("Patient"))
    ) {
        incoming = false;
    }

    let timestamp = null;
    let delivered = true;
    if (message.sent) {
      timestamp = MessagingView.displayDateTime(message.sent);
    } else if (isNonSmSMessage && message.received) {
      timestamp = MessagingView.displayDateTime(message.received);
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
      isNonSmSMessage
    );
    let priority = message.priority;
    let themes: string[] = message.getThemes();

    const comment = message.displayNote();
    
    return this._alignedRow(
      incoming,
      msg,
      timestamp,
      bubbleStyle,
      priority,
      index,
      themes,
      comment
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
          {timestamp && (
            <Typography variant={"caption"}>{timestamp}</Typography>
          )}
          {comment && (
            <Typography
              variant={"caption"}
              color="text.secondary"
              gutterBottom
            >{`(${comment})`}</Typography>
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
    nonSMS: boolean
  ): object {
    if (nonSMS)
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
  private static displayDateTime (dateString:string) :string {
    if (!dateString) return "";
    const dateObj = new Date(dateString);
    const dateDisplay = dateObj.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "numeric",
        day: "numeric",
    });
    const timeDisplay = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `${dateDisplay} ${timeDisplay}`;
  }
}
