import * as React from "react";

import {FhirClientContext, FhirClientContextType} from "../FhirClientContext";

import Communication from "../model/Communication";
import {ICodeableConcept, ICoding, IReference, IResource} from "@ahryman40k/ts-fhir-types/lib/R4";
import {Box, Button, Chip, CircularProgress, Grid, List, Stack, TextField, Typography} from "@mui/material";
import {grey, lightBlue} from "@mui/material/colors";
import {IsaccMessageCategory} from "../model/CodeSystem";
import Alert from "@mui/material/Alert";
import {Error, Warning} from "@mui/icons-material";

export default class MessagingView extends React.Component<{}, {
    // messages: MessageDraft[];
    activeMessage: string;
    error: any;
    // showAlert: boolean;
    // alertSeverity: "error" | "warning" | "info" | "success";
    // alertText: string;
}> {
    static contextType = FhirClientContext

    constructor(props: ({})) {
        super(props);
        this.state = {
            activeMessage: null,
            error: null
        };

    }

    render(): React.ReactNode {
        if (!this.state) return <CircularProgress/>;

        // @ts-ignore
        let context: FhirClientContextType = this.context;

        if (context.error) {
            return <Alert severity="error">{context.error}</Alert>
        }

        if (!context.carePlan || !context.communications) {
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

        if (context.communications && context.communications.length > 0) {
            messages = <List sx={messageBoxProps}>{
                context.communications.map((message, index) => this._buildMessageRow(message, index))
            }</List>
        }


        return <Grid container direction={"column"}>
            <Typography variant={'h6'} sx={{paddingTop: 2}}>{"Messages"}</Typography>

            {messages}

            <TextField
                multiline
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
        let newMessage: Communication = Communication.createNewOutgoingMessage(this.state.activeMessage, context.patient, context.carePlan);
        console.log("Attempting to save new Communication:", newMessage);
        context.client.create(newMessage).then(
            (savedCommunication: IResource) => {
                console.log("Saved new Communication:", savedCommunication);
                context.communications.unshift(Communication.from(savedCommunication));
                this.setState({activeMessage: ""});
            },
            (reason: any) => {
                console.log("Failed to create new Communication:", reason);
                this.setState({error: reason});
            }
        ).catch((reason: any) => {
            console.log("Failed to create new Communication:", reason);
            this.setState({error: reason});
        });
    }

    private _buildMessageRow(message: Communication, index: number): React.ReactNode {

        let incoming = true;
        if (message.recipient && message.recipient.find((r: IReference) => r.reference.includes("Patient"))) {
            incoming = false;
        }

        let datetime = new Date(message.sent);
        let timestamp = `${datetime.toLocaleDateString()} ${datetime.toLocaleTimeString()}`;
        // let timestamp = `${intl.formatDate(datetime)} ${intl.formatTime(datetime)}`;
        let msg = message.displayText();
        let autoMessage = true;
        if (!message.category) {
            console.log("Communication is missing category");
        } else if (message.category.find((c: ICodeableConcept) => c.coding.find((coding: ICoding) => IsaccMessageCategory.isaccManuallySentMessage.equals(coding)))) {
            autoMessage = false;
        }
        let bubbleStyle = MessagingView.getBubbleStyle(incoming, autoMessage);
        let priority = message.priority;
        let themes: string[] = message.getThemes();
        return this._alignedRow(incoming, msg, timestamp, bubbleStyle, priority, index, themes);

    }

    private _alignedRow(incoming: boolean, message: string, timestamp: string, bubbleStyle: object, priority: string, index: number, themes: string[]) {

        let priorityIndicator = null;
        if (priority === "urgent") {
            priorityIndicator = <Warning color={"warning"}/>
        } else if (priority === "stat") {
            priorityIndicator = <Error color={"error"}/>
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
                {themes.length>0 && <Stack direction={"row"} spacing={0.5} paddingTop={0.5}>
                    {themes.map((theme: string) => <Chip size={"small"} variant="outlined" label={theme}
                                                         onClick={(event) => console.log(event)}/>)}
                </Stack>
                }
                <Typography variant={"caption"}>{timestamp}</Typography>

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

    private static getBubbleStyle(incoming: boolean, auto: boolean): object {
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