import * as React from "react";

import {FhirClientContext, FhirClientContextType} from "../FhirClientContext";

import Communication from "../model/Communication";
import {IBundle_Entry, ICodeableConcept, ICoding, IReference, IResource} from "@ahryman40k/ts-fhir-types/lib/R4";
import {Box, Button, Chip, CircularProgress, Grid, IconButton, List, Stack, TextField, Typography} from "@mui/material";
import {grey, lightBlue} from "@mui/material/colors";
import {IsaccMessageCategory} from "../model/CodeSystem";
import Alert from "@mui/material/Alert";
import {Error, Refresh, Warning} from "@mui/icons-material";
import {CommunicationRequest} from "../model/CommunicationRequest";
import Client from "fhirclient/lib/Client";
import {Bundle} from "../model/Bundle";
import {getEnv} from "../util/util";

export default class MessagingView extends React.Component<{}, {
    // messages: MessageDraft[];
    activeMessage: string;
    error: any;
    communications: Communication[];
    temporaryCommunications: Communication[];
    messagesLoading: boolean;
    // showAlert: boolean;
    // alertSeverity: "error" | "warning" | "info" | "success";
    // alertText: string;
}> {
    static contextType = FhirClientContext
    interval: any;

    constructor(props: ({})) {
        super(props);
        this.state = {
            activeMessage: null,
            error: null,
            communications: null,
            temporaryCommunications: [],
            messagesLoading: false
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
        this.setState({messagesLoading: true});

        this.getCommunications(context.client, context.carePlan.id).then((result: Communication[]) => {
                let temporaryCommunications = this.state.temporaryCommunications.filter((tc: Communication) => {
                    return !result?.find((c: Communication) => {
                        return c.basedOn?.find((b: IReference) => {
                            return b.reference?.split("/")[1] === tc.id;
                        });
                    });
                });

                this.setState({
                    communications: result,
                    messagesLoading: false,
                    temporaryCommunications: temporaryCommunications
                });
            }, (reason: any) => this.setState({error: reason, messagesLoading: false})
        ).catch(e => {
            console.log("Error fetching Communications", e);
            this.setState({error: e, messagesLoading: false});
        })
    }

    async getCommunications(client: Client, carePlanId: string): Promise<Communication[]> {
        if (!client) return;
        // Communication?part-of=CarePlan/${carePlanId}
        let params = new URLSearchParams({
            "part-of": `CarePlan/${carePlanId}`,
            "_sort": "-sent"
        }).toString();
        return await client.request(`/Communication?${params}`).then((bundle: Bundle) => {
            if (bundle.type === "searchset") {
                if (!bundle.entry) return [];

                let communications: Communication[] = bundle.entry.map((e: IBundle_Entry) => {
                    if (e.resource.resourceType !== "Communication") {
                        this.setState({error: "Unexpected resource type returned"});
                        return null;
                    } else {
                        console.log("Communication loaded:", e);
                        return Communication.from(e.resource);
                    }
                })
                return communications;

            } else {
                this.setState({error: "Unexpected bundle type returned"});
                return null;
            }
        }, (reason: any) => {
            this.setState({error: reason.toString()});
            return null;
        });
    }

    render(): React.ReactNode {
        if (!this.state) return <CircularProgress/>;

        // @ts-ignore
        let context: FhirClientContextType = this.context;

        if (context.error) {
            return <Alert severity="error">{context.error}</Alert>
        }

        if (!context.carePlan || !this.state.communications) {
            return <CircularProgress/>
        }

        let messageBoxProps = {
            maxHeight: 600,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column-reverse',
            border: "1px solid lightgrey",
            borderRadius: 1,
            paddingLeft: 0.5,
            paddingRight: 0.5
        }

        let messages = <Stack direction={'row'} justifyContent={"flex-end"} sx={messageBoxProps}>
            <Typography variant={"caption"}>{"No messages"}</Typography>
        </Stack>

        if ((this.state.communications && this.state.communications.length > 0) || (this.state.temporaryCommunications && this.state.temporaryCommunications.length)) {
            let communications = [];
            communications.push(...this.state.communications);
            communications.push(...this.state.temporaryCommunications);
            communications.sort((a, b) => {
                let d1 = a.sent ?? a.meta.lastUpdated;
                let d2 = b.sent ?? b.meta.lastUpdated;
                return d1 < d2 ? 1 : -1;
            });
            messages = <List sx={messageBoxProps}>{
                communications.map((message: Communication, index) => this._buildMessageRow(message, index))
            }</List>
        }


        return <Grid container direction={"column"} sx={{backgroundColor: "#FFF"}}>
            <Stack direction={'row'} justifyContent={'space-between'}>
                <Typography variant={'h6'}>{"Messages"}</Typography>
                {this.state.messagesLoading ? <CircularProgress/> :
                    <IconButton color="primary" onClick={() => this.loadCommunications()}><Refresh/></IconButton>}
            </Stack>

            {messages}

            <TextField
                multiline
                InputProps={{sx: {marginTop: 0.25}}}
                value={this.state.activeMessage ?? ""}
                placeholder={"Enter message"}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    this.setState({activeMessage: event.target.value});
                }}/>
            <Stack direction={'row'} justifyContent={"flex-end"} sx={{marginTop: 2}}>
                <Button variant="contained" onClick={() => this.saveMessage()}>
                    Send
                </Button>
            </Stack>

        </Grid>

    }

    private saveMessage() {
        // @ts-ignore
        let context: FhirClientContextType = this.context;
        let newMessage: CommunicationRequest = CommunicationRequest.createNewManualOutgoingMessage(this.state.activeMessage, context.patient, context.carePlan);
        console.log("Attempting to save new CommunicationRequest:", newMessage);
        context.client.create(newMessage).then(
            (savedCommunicationRequest: IResource) => {
                console.log("Saved new CommunicationRequest:", savedCommunicationRequest);
                this.state.temporaryCommunications.unshift(Communication.tempCommunicationFrom(savedCommunicationRequest));
                this.setState({
                    activeMessage: "",
                    temporaryCommunications: this.state.temporaryCommunications
                });
            },
            (reason: any) => {
                console.log("Failed to create new CommunicationRequest:", reason);
                this.setState({error: reason});
            }
        ).catch((reason: any) => {
            console.log("Failed to create new CommunicationRequest:", reason);
            this.setState({error: reason});
        });
    }

    private _buildMessageRow(message: Communication, index: number): React.ReactNode {
        let incoming = true;
        if (message.recipient && message.recipient.find((r: IReference) => r.reference.includes("Patient"))) {
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
        if (!message.category) {
            console.log("Communication is missing category");
        } else if (message.category.find((c: ICodeableConcept) => c.coding.find((coding: ICoding) => IsaccMessageCategory.isaccManuallySentMessage.equals(coding)))) {
            autoMessage = false;
        }
        let bubbleStyle = MessagingView.getBubbleStyle(incoming, autoMessage, delivered);
        let priority = message.priority;
        let themes: string[] = message.getThemes();
        return this._alignedRow(incoming, msg, timestamp, bubbleStyle, priority, index, themes);

    }

    private _alignedRow(incoming: boolean, message: string, timestamp: string, bubbleStyle: object, priority: string, index: number, themes: string[]) {

        let priorityIndicator = null;
        if (getEnv("REACT_APP_SHOW_PRIORITY_INDICATOR")?.toLowerCase() === "true") {
            if (priority === "urgent") {
                priorityIndicator = <Warning color={"warning"}/>
            } else if (priority === "stat") {
                priorityIndicator = <Error color={"error"}/>
            }
        }
        let align = incoming ? "flex-start" : "flex-end";

        let box = <Box sx={{
            borderRadius: "12px",
            padding: 1,
            ...(bubbleStyle)
        }}>
            <Typography variant={"body2"}>
                {message}
            </Typography>
        </Box>;

        let bubbleAndPriorityRow;
        if (incoming) { // different order based on message direction
            bubbleAndPriorityRow = <>
                {box}
                {priorityIndicator}
            </>
        } else {
            bubbleAndPriorityRow = <>
                {priorityIndicator}
                {box}
            </>
        }

        let messageGroup = <Grid item xs={11} md={10} lg={8}>
            <Stack direction={"column"} alignItems={align} paddingBottom={0.5}>
                <Stack direction={"row"} alignItems={"center"} spacing={1}>
                    {bubbleAndPriorityRow}
                </Stack>
                {themes.length > 0 && <Stack direction={"row"} spacing={0.5} paddingTop={0.5}>
                    {themes.map((theme: string) => <Chip size={"small"} variant="outlined" label={theme}
                                                         onClick={(event) => console.log(event)}/>)}
                </Stack>
                }
                {timestamp && <Typography variant={"caption"}>{timestamp}</Typography>}

            </Stack>
        </Grid>

        let spacer = <Grid item xs={1} md={2} lg={4}/>;

        let messageAndSpacerRow;
        if (incoming) { // different order based on message direction
            messageAndSpacerRow = <>
                {messageGroup}
                {spacer}
            </>;
        } else {
            messageAndSpacerRow = <>
                {spacer}
                {messageGroup}
            </>
        }

        return <Grid container key={index} direction={"row"} justifyContent={align} alignItems={"center"} spacing={0.5}>
            {messageAndSpacerRow}
        </Grid>
    }

    private static getBubbleStyle(incoming: boolean, auto: boolean, delivered: boolean): object {
        if (!delivered) return {
            borderStyle: "dashed",
            borderColor: grey[700],
            borderWidth: "1px",
            color: "#000"
        }
        if (incoming) return {
            backgroundColor: grey[300],
            color: "#000"
        };
        if (auto) return {
            backgroundColor: lightBlue[100],
            color: "#000"
        };
        return {
            backgroundColor: lightBlue[700],
            color: "#fff",
        };
    }

}