import * as React from "react";

import {createStyles, StyledComponentProps, withStyles} from "@mui/styles";
import {FhirClientContext, FhirClientContextType} from "../FhirClientContext";
import {injectIntl, WrappedComponentProps} from "react-intl";

import Communication from "../model/Communication";
import {ICodeableConcept, ICoding, IReference, IResource} from "@ahryman40k/ts-fhir-types/lib/R4";
import {Box, Button, CircularProgress, List, Stack, TextField, Theme, Typography} from "@mui/material";
import {grey, indigo, lightBlue} from "@mui/material/colors";
import {IsaccMessageCategory} from "../model/CodeSystem";
import Alert from "@mui/material/Alert";

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

        let messages = <Stack direction={'row'} justifyContent={"flex-end"} sx={{marginTop: 2}}>
            <Typography variant={"caption"}>{"No messages"}</Typography>
        </Stack>

        if (context.communications && context.communications.length > 0) {
            messages = <List sx={{maxHeight:600, overflow: 'auto', display: 'flex', flexDirection: 'column-reverse'}}>{
                context.communications.map((message, index) => this._buildMessageRow(message, index))
                }</List>
        }


        return <Stack direction={"column"}>
            <Typography variant={'h6'} sx={{paddingTop: 2}}>{context.carePlan.reference}</Typography>

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
        </Stack>

    }

    private saveMessage() {
        // @ts-ignore
        let context: FhirClientContextType = this.context;
        let newMessage: Communication = Communication.createNewOutgoingMessage(this.state.activeMessage, context.patient, context.carePlan);
        console.log("Attempting to save new Communication:", newMessage);
        context.client.create(newMessage).then(
            (savedCommunication: IResource) => {
                console.log("Saved new Communication:", savedCommunication);
                context.communications.push(Communication.from(savedCommunication));
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
        return this._alignedRow(incoming, msg, timestamp, bubbleStyle);

    }

    private _alignedRow(incoming: boolean, message: string, timestamp: string, bubbleStyle: object) {
        let spacer = <Box minWidth={100}/>;
        let align = incoming ? "flex-start" : "flex-end";
        if (incoming) {
            return <Stack direction={"row"} justifyContent={align} spacing={2} sx={{marginTop: 1}}>
                {this._buildMessageBubble(align, message, timestamp, bubbleStyle)}
                {spacer}
            </Stack>
        } else {
            return <Stack direction={"row"} justifyContent={align} spacing={2} sx={{marginTop: 1}}>
                {spacer}
                {this._buildMessageBubble(align, message, timestamp, bubbleStyle)}
            </Stack>
        }
    }

    private _buildMessageBubble(align: string, message: string, timestamp: string, bubbleStyle: object) {
        return <Stack maxWidth={800} direction={"column"} alignItems={align}>
            <Box sx={{
                borderRadius: "12px",
                padding: 1,
                ...bubbleStyle
            }}>
                <Typography variant={"body2"}>
                    {message}
                </Typography>
            </Box>
            <Typography variant={"caption"}>{timestamp}</Typography>
        </Stack>;
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