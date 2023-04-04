import * as React from "react";

import {FhirClientContext, FhirClientContextType} from "../FhirClientContext";

import Communication from "../model/Communication";
import {IBundle_Entry, ICodeableConcept, ICoding, IReference, IResource} from "@ahryman40k/ts-fhir-types/lib/R4";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormGroup,
  FormControlLabel,
  Grid,
  IconButton,
  List,
  Stack,
  TextField,
  TextFieldProps,
  Typography,
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import {amber, grey, lightBlue} from "@mui/material/colors";
import {IsaccMessageCategory} from "../model/CodeSystem";
import Alert from "@mui/material/Alert";
import {Error, Refresh, Warning} from "@mui/icons-material";
import {CommunicationRequest} from "../model/CommunicationRequest";
import Client from "fhirclient/lib/Client";
import {Bundle} from "../model/Bundle";
import {getEnv} from "../util/util";

interface NonSMSMessage {
    date: string,
    content: string
}

export default class MessagingView extends React.Component<
  {},
  {
    // messages: MessageDraft[];
    activeMessage: string;
    activeNonSMSMessage: NonSMSMessage;
    error: any;
    communications: Communication[];
    isNonSMSChecked: boolean;
    temporaryCommunications: Communication[];
    messagesLoading: boolean;
    saveLoading: boolean;
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
      activeMessage: null,
      activeNonSMSMessage: {
        date: new Date().toISOString(),
        content: "",
      },
      error: null,
      communications: null,
      isNonSMSChecked: false,
      temporaryCommunications: [],
      messagesLoading: false,
      saveLoading: false,
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
      _sort: "-sent",
    }).toString();
    return await client.request(`/Communication?${params}`).then(
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
        <Typography variant={"caption"}>{"No messages"}</Typography>
      </Stack>
    );

    if (this.state.communications && this.state.communications.length > 0) {
      let communications = [];
      communications.push(...this.state.communications);
      communications.push(...this.state.temporaryCommunications);
      communications.sort((a, b) => {
        let d1 = a.sent ?? a.meta.lastUpdated;
        let d2 = b.sent ?? b.meta.lastUpdated;
        return d1 < d2 ? 1 : -1;
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

        <TextField
          multiline
          value={this.state.activeMessage ?? ""}
          placeholder={"Enter message"}
        />
        <Stack
          direction={"row"}
          justifyContent={"flex-end"}
          sx={{ marginTop: 2, marginBottom: 2 }}
        >
          <Button variant="contained" onClick={() => this.saveMessage()}>
            Send
          </Button>
        </Stack>
        <Divider></Divider>
        {this._buildNonSMSEntryComponent()}
        {this.state.error && (
          <Alert severity="error" sx={{ marginTop: 2 }}>
            {typeof this.state.error === "string" ? this.state.error : "Error occurred.  See console for detail."}
          </Alert>
        )}
      </Grid>
    );
  }

  private _buildNonSMSEntryComponent(): React.ReactNode {
    return (
      <Stack
        direction={"column"}
        justifyContent={"flex-start"}
        sx={{
            marginTop: 1,
            padding: 1,
            backgroundColor: this.state.isNonSMSChecked ? "#F1F1F1" : "#FFF",
            borderRadius: 1
        }}
        spacing={1}
      >
        <FormGroup>
          <FormControlLabel
            control={<Checkbox />}
            label="Non-SMS?"
            onClick={() =>
              this.setState({
                isNonSMSChecked: !this.state.isNonSMSChecked,
              })
            }
          />
        </FormGroup>
        {this.state.isNonSMSChecked && (
          <>
            <Stack direction={"row"} spacing={1}>
              <DateTimePicker
                label="date & time"
                inputFormat="ddd, MM/DD/YYYY hh:mm A"
                value={this.state.activeNonSMSMessage?.date}
                renderInput={(params: TextFieldProps) => (
                  <TextField
                    {...params}
                    sx={{ minWidth: "264px", backgroundColor: "#FFF" }}
                  />
                )}
                onChange={(newValue: Date | null) => {
                  this.setState({
                    activeNonSMSMessage: {
                      ...this.state.activeNonSMSMessage,
                      date: newValue?.toISOString(),
                    },
                  });
                }}
              ></DateTimePicker>
              <TextField
                multiline
                fullWidth
                placeholder="Enter content"
                value={this.state.activeNonSMSMessage?.content || ""}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    this.setState({
                    activeNonSMSMessage: {
                        ...this.state.activeNonSMSMessage,
                        content: event.target.value,
                    },
                    });
                }}
                sx={{
                  backgroundColor: "#FFF",
                }}
              ></TextField>
            </Stack>
            <Box sx={{ textAlign: "right" }}>
              <LoadingButton
                variant="contained"
                onClick={() => {
                  this.saveNonSMSMessage();
                }}
                loading={this.state.saveLoading}
              >
                Save
              </LoadingButton>
            </Box>
          </>
        )}
      </Stack>
    );
  }

  private saveNonSMSMessage() {
    if (
      !this.state.activeNonSMSMessage ||
      !this.state.activeNonSMSMessage.content ||
      !this.state.activeNonSMSMessage.date
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
    const newCommunication = Communication.createNonSMSCommunication(
      this.state.activeNonSMSMessage?.content,
      context.patient,
      context.carePlan,
      this.state.activeNonSMSMessage?.date
    );
    console.log("new communication? ", newCommunication);
    context.client
      .create(newCommunication)
      .then(
        (savedResult: IResource) => {
          console.log("Saved new Non SMS communication:", savedResult);
          this.setState({
            activeNonSMSMessage: {
              date: new Date().toISOString(),
              content: "",
            },
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
        this.state.activeMessage,
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
            activeMessage: "",
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
    if (
      message.recipient &&
      message.recipient.find((r: IReference) => r.reference.includes("Patient"))
    ) {
      incoming = false;
    }

    let timestamp = null;
    let delivered = true;
    if (message.sent) {
      let datetime = new Date(message.sent);
      // instead of hard-coded en-US possibly get locale info from config?
      timestamp = `${datetime.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "numeric",
        day: "numeric",
      })} ${datetime.toLocaleTimeString()}`;
    } else {
      delivered = false;
    }
    // let timestamp = `${intl.formatDate(datetime)} ${intl.formatTime(datetime)}`;
    let msg = message.displayText();
    let autoMessage = true;
    let nonSMSMessage = false;
    if (!message.category) {
      console.log("Communication is missing category");
    } else if (
      message.category.find((c: ICodeableConcept) =>
        c.coding.find((coding: ICoding) =>
          IsaccMessageCategory.isaccNonSMSMessage.equals(coding)
        )
      )
    ) {
      nonSMSMessage = true;
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
      nonSMSMessage
    );
    let priority = message.priority;
    let themes: string[] = message.getThemes();
    const comment = nonSMSMessage ? "Non-SMS" : "";
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
            <Typography variant={"caption"} sx={{color: "#777"}} gutterBottom>{`(${comment})`}</Typography>
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
}
