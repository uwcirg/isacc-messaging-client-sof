import * as React from "react";

import {createStyles, StyledComponentProps, withStyles} from "@mui/styles";
import {FhirClientContext, FhirClientContextType} from "../FhirClientContext";
import {injectIntl, WrappedComponentProps} from "react-intl";

import Communication from "../model/Communication";
import {ICodeableConcept, ICoding, IReference, IResource} from "@ahryman40k/ts-fhir-types/lib/R4";
import {Box, Button, CircularProgress, Grid, List, Stack, TextField, Theme, Typography} from "@mui/material";
import {grey, lightBlue} from "@mui/material/colors";
import {IsaccMessageCategory} from "../model/CodeSystem";
import Alert from "@mui/material/Alert";
import {Error, Warning} from "@mui/icons-material";

const classes = createStyles((theme: Theme) => {
    return {}
});

interface MessageViewProps {
}

type MessageViewState = {
    // messages: MessageDraft[];
    activeMessage: string;
    error: any;
    // showAlert: boolean;
    // alertSeverity: "error" | "warning" | "info" | "success";
    // alertText: string;
}


class MessageView extends React.Component<MessageViewProps & WrappedComponentProps & StyledComponentProps, MessageViewState> {
    static contextType = FhirClientContext


    constructor(props: Readonly<MessageViewProps & WrappedComponentProps & StyledComponentProps> | (MessageViewProps & WrappedComponentProps & StyledComponentProps)) {
        super(props);
        this.state = {
            activeMessage: null,
            error: null
        };

    }


    render(): React.ReactNode {
        if (!this.state) return <CircularProgress/>;
        /*        const {classes} = this.props;
                const {intl} = this.props;*/

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
            <Typography variant={'h6'} sx={{paddingTop: 2}}>{context.carePlan.reference}</Typography>

            <Grid container direction={"row"} justifyContent={"center"}>
                <Grid item container direction={"column"} xs={12} sm={10} md={8} lg={6}>
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

            </Grid>
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
        const {intl} = this.props;

        let incoming = true;
        if (message.recipient && message.recipient.find((r: IReference) => r.reference.includes("Patient"))) {
            incoming = false;
        }

        let datetime = new Date(message.sent);
        let timestamp = `${intl.formatDate(datetime)} ${intl.formatTime(datetime)}`;
        let msg = message.displayText();
        let autoMessage = true;
        if (!message.category) {
            console.log("Communication is missing category");
        } else if (message.category.find((c: ICodeableConcept) => c.coding.find((coding: ICoding) => IsaccMessageCategory.isaccManuallySentMessage.equals(coding)))) {
            autoMessage = false;
        }
        let bubbleStyle = MessageView.getBubbleStyle(incoming, autoMessage);
        let priority = message.priority;
        return this._alignedRow(incoming, msg, timestamp, bubbleStyle, priority);

    }

    private _alignedRow(incoming: boolean, message: string, timestamp: string, bubbleStyle: object, priority: string) {
        let spacer = <Box minWidth={100}/>;

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

        let messageBubble = <Stack direction={"column"} alignItems={align}>
            <Stack direction={"row"} alignItems={"center"} spacing={1}>
                {bubbleAndPriorityRow}
            </Stack>
            <Typography variant={"caption"}>{timestamp}</Typography>

        </Stack>

        let messageAndSpacerRow;
        if (incoming) { // different order based on message direction
            messageAndSpacerRow = <>
                {messageBubble}
                {spacer}
            </>;
        } else {
            messageAndSpacerRow = <>
                {spacer}
                {messageBubble}
            </>
        }

        return <Stack direction={"row"} justifyContent={align} alignItems={"center"} spacing={0.5}>
            {messageAndSpacerRow}
        </Stack>
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

export default injectIntl(withStyles(classes)(MessageView));