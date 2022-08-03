import * as React from "react";

import {createStyles, styled, StyledComponentProps, withStyles} from "@mui/styles";
import {FhirClientContext, FhirClientContextType} from "../FhirClientContext";
import {injectIntl, WrappedComponentProps} from "react-intl";

import Communication from "../model/Communication";
import {IReference} from "@ahryman40k/ts-fhir-types/lib/R4";
import {Box, Button, CircularProgress, List, Paper, Stack, TextField, Theme, Typography} from "@mui/material";
import {lightBlue} from "@mui/material/colors";

const styles = createStyles((theme: Theme) => { return {} });

interface MessageViewProps {
}

type MessageViewState = {
    // messages: MessageDraft[];
    activeMessage: string;
    // showAlert: boolean;
    // alertSeverity: "error" | "warning" | "info" | "success";
    // alertText: string;
}


class MessageView extends React.Component<MessageViewProps & WrappedComponentProps & StyledComponentProps, MessageViewState> {
    static contextType = FhirClientContext


    constructor(props: Readonly<MessageViewProps & WrappedComponentProps & StyledComponentProps> | (MessageViewProps & WrappedComponentProps & StyledComponentProps)) {
        super(props);
        this.state = {
            activeMessage: null
        };

    }


    render(): React.ReactNode {
        if (!this.state) return <CircularProgress/>;
        /*        const {classes} = this.props;
                const {intl} = this.props;*/

        // @ts-ignore
        let context: FhirClientContextType = this.context;

        if (context.error) {
            return context.error;
        }

        if (!context.carePlan || !context.communications) {
            return <CircularProgress/>
        }

        return <Stack direction={"column"}>
            <Typography variant={'h6'} sx={{paddingTop:2}}>{context.carePlan.reference}</Typography>


            <List>{
                context.communications.map((message, index) => this._buildMessageItem(message, index)
                )
            }</List>

            <TextField

                multiline
                value={this.state.activeMessage ?? ""}
                placeholder={"Enter message"}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    this.setState({activeMessage: event.target.value});
                }}/>

            <Stack direction={'row'} justifyContent={"flex-end"} sx={{marginTop:2}}>
                <Button variant="contained">
                    Send
                </Button>
            </Stack>
        </Stack>


    }

    private _buildMessageItem(message: Communication, index: number): React.ReactNode {
        const {classes} = this.props;
        const {intl} = this.props;

        let align = "flex-start";
        if (message.recipient.find((r: IReference) => r.reference.includes("Patient"))) {
            align = "flex-end";
        }

        let datetime = new Date(message.sent);
        let timestamp = `${intl.formatDate(datetime)} ${intl.formatTime(datetime)}`;
        return <Stack direction={"row"} justifyContent={align} spacing={2} sx={{marginTop: 1}}>
            <Box minWidth={100}/>
            <Stack maxWidth={800} direction={"column"} alignItems={align}>
                <Box sx={{
                    borderRadius: "12px",
                    color: "#fff",
                    backgroundColor: lightBlue[700],
                    padding: 1
                }}>
                    <Typography variant={"body2"}>
                        {message.payload[0].contentString}
                    </Typography>
                </Box>
                <Typography variant={"caption"}>{timestamp}</Typography>
            </Stack>
        </Stack>;

    }

}

export default injectIntl(withStyles(styles)(MessageView));