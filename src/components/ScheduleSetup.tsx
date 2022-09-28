import * as React from "react";
import {
    Button,
    CircularProgress,
    Grid,
    List,
    ListItem,
    Snackbar,
    Stack,
    TextField,
    TextFieldProps,
    Typography
} from "@mui/material";
import ClearIcon from '@mui/icons-material/Clear';
import {DateTimePicker} from "@mui/x-date-pickers";
import {FhirClientContext} from "../FhirClientContext";
import {makeCarePlan, makeCommunicationRequests} from "../model/modelUtil";
import {IResource} from "@ahryman40k/ts-fhir-types/lib/R4";
import {CommunicationRequest} from "../model/CommunicationRequest";
import Alert from "@mui/material/Alert";
import Patient from "../model/Patient";
import Summary from "./Summary";
import PlanDefinition, {getDefaultMessageSchedule} from "../model/PlanDefinition";
import {getEnv} from "../util/util";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Dialog from "@mui/material/Dialog";
import Client from "fhirclient/lib/Client";
import {getUsername} from "../util/isacc_util";


interface ScheduleSetupProps {
}

type ScheduleSetupState = {
    messages: MessageDraft[];
    patientNote: string;
    showAlert: boolean;
    alertSeverity: "error" | "warning" | "info" | "success";
    alertText: string;
    savingInProgress: boolean;
}

export type MessageDraft = {
    text: string,
    scheduledDateTime: Date
}


const styles = {
    patientNotesField: {
        margin: 2
    }
};


export default class ScheduleSetup extends React.Component<ScheduleSetupProps, ScheduleSetupState> {
    static contextType = FhirClientContext
    planDefinition: PlanDefinition;

    // declare context: React.ContextType<typeof FhirClientContext>

    constructor(props: ScheduleSetupProps) {
        super(props);
        this.state = {
            messages: null,
            patientNote: '',
            showAlert: false,
            alertText: null,
            alertSeverity: null,
            savingInProgress: false
        };
        this.planDefinition = getDefaultMessageSchedule();
    }

    componentDidMount() {
        //@ts-ignore
        let patient: Patient = this.context.patient;
        //@ts-ignore
        let client: Client = this.context.client;

        let replacements: { [key: string]: number } = {};
        let preferred_username = getUsername(client);
        if (preferred_username) {
            replacements['{userName}'] = preferred_username;
        }

        const messages: MessageDraft[] = this.planDefinition.createMessageList(patient, replacements);
        this.setState({messages: messages});
    }

    render(): React.ReactNode {
        if (!this.state || !this.state.messages) return <CircularProgress/>;

        return <>
            <Grid container spacing={2}>
                <Grid item xs={6}><Summary/></Grid>
                <Grid item xs={6}>
                    <Typography variant={'h6'}>{"Patient note"}</Typography>
                    <TextField
                        sx={{maxHeight: 400, overflow: 'auto', ...styles.patientNotesField}}
                        fullWidth
                        multiline
                        value={this.state.patientNote ?? ""}
                        placeholder={"Patient note"}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                            this.setState({patientNote: event.target.value});
                        }}/>
                </Grid>
                <Grid item xs={12}>
                    <MessageScheduleList
                        messages={this.state.messages}
                        onMessagesChanged={(messages: MessageDraft[]) => this.setState({messages: messages})}
                        saveSchedule={() => this.saveSchedule()}
                    />
                </Grid>
            </Grid>

            {this.getAlert()}
        </>
    }

    private showSnackbar(alertSeverity: "error" | "warning" | "info" | "success", alertText: string) {
        this.setState({showAlert: true, alertSeverity: alertSeverity, alertText: alertText, savingInProgress: false});
    }

    private getAlert() {
        let clearSessionLink = getEnv("REACT_APP_DASHBOARD_URL") + "/clear_session";
        let onClose = () => this.setState({showAlert: false});

        if (this.state.savingInProgress) {
            return <Dialog open={this.state.savingInProgress}>
                <DialogContent>
                    <CircularProgress/>
                    <DialogContentText>{"Saving..."}</DialogContentText>
                </DialogContent>
            </Dialog>;
        }

        if (this.state.alertSeverity === 'success') {
            return <Dialog open={this.state.showAlert}
                           onClose={onClose}>
                <DialogContent>
                    <DialogContentText>{this.state.alertText}</DialogContentText>
                    <DialogActions>
                        <Button
                            onClick={onClose}
                            href={clearSessionLink} autoFocus>Close schedule planner</Button>

                    </DialogActions>
                </DialogContent>
            </Dialog>;
        }
        return <Snackbar open={this.state.showAlert}
                         autoHideDuration={6000}
                         onClose={onClose}>
            <Alert
                onClose={onClose}
                action={<Button href={clearSessionLink}>Close schedule planner</Button>}
                severity={this.state.alertSeverity}
                sx={{width: '100%'}}>
                {this.state.alertText}
            </Alert>
        </Snackbar>;
    }

    private saveSchedule() {
        // @ts-ignore
        let client: Client = this.context.client;
        // @ts-ignore
        let patient: Patient = this.context.patient;

        if (!client) {
            console.log("No client");
            return;
        }

        if (!patient) {
            console.log("no patient");
            return;
        }
        this.setState({savingInProgress: true});

        if (this.state.messages.find((m: MessageDraft) => m.text.length === 0)) {
            this.showSnackbar("error", "Messages cannot be empty");
            return;
        }

        let communicationRequests = makeCommunicationRequests(patient, this.planDefinition, this.state.messages);
        let promises = communicationRequests.map(
            (c: CommunicationRequest) => client.create(c).then(
                (value: any) => CommunicationRequest.from(value)
            )
        );

        Promise.all(promises).then((communicationRequests: CommunicationRequest[]) => {
            communicationRequests.forEach((v: CommunicationRequest) => {
                console.log("resource saved:", v);
            });
            // create CarePlan with the newly created CommunicationRequests
            let carePlan = makeCarePlan(this.planDefinition, patient, communicationRequests, this.state.patientNote);
            client.create(carePlan).then((savedCarePlan: IResource) => {
                this.onSaved(savedCarePlan);
                let updatePromises = communicationRequests.map((c: CommunicationRequest) => {
                    c.basedOn = [{reference: `CarePlan/${savedCarePlan.id}`}];
                    return client.update(c).then((value: any) => CommunicationRequest.from(value));
                });
                Promise.all(updatePromises).then((updatedCommunicationRequests: CommunicationRequest[]) => {
                    updatedCommunicationRequests.forEach((v: CommunicationRequest) => {
                        console.log("CommunicationRequest updated:", v);
                    });
                })
            }, (reason: any) => this.onRejected(reason));
        }, this.onRejected);
    }

    private onSaved(value: IResource) {
        console.log("resource saved:", value);
        this.showSnackbar("success", "Schedule created successfully")
    }

    private onRejected(reason: any) {
        console.log("resource rejected:", reason);
        this.showSnackbar("error", "Schedule could not be created")
    }

}


const MessageScheduleList = (props: {
    messages: MessageDraft[],
    onMessagesChanged: (messages: MessageDraft[]) => void,
    saveSchedule: () => void,
}) => {

    const buildMessageItem = (message: MessageDraft, index: number) => {
        return <ListItem key={index} sx={{width: '100%'}} secondaryAction={
            <ClearIcon onClick={() => {
                removeMessage(index);
            }}/>
        }>
            <Grid container direction={"row"} flexDirection={"row"} spacing={2}
                  sx={{paddingTop: 2}}>

                <Grid item>
                    <DateTimePicker

                        label="Date & Time"
                        value={message.scheduledDateTime}
                        onChange={(newValue: Date | null) => {
                            // message.scheduledDateTime = newValue;
                            let messages = props.messages;
                            messages[index].scheduledDateTime = newValue;
                            props.onMessagesChanged(messages);
                            // this.setState({messages: this.state.messages});
                        }}
                        renderInput={(params: TextFieldProps) => <TextField {...params} />}/>
                </Grid>
                <Grid item flexGrow={1}>
                    <TextField
                        error={message.text.length === 0}
                        helperText={message.text.length === 0 ? "Enter a message" : ""}
                        label={"Message"}
                        fullWidth
                        multiline
                        value={message.text ?? ""}
                        placeholder={"Enter message"}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                            props.messages[index].text = event.target.value;
                            props.onMessagesChanged(props.messages);
                            // this.setState({messages: this.state.messages});
                        }}/>
                </Grid>
            </Grid>
        </ListItem>
    }

    const removeMessage = (index: number) => {
        let messages = props.messages;
        messages.splice(index, 1);
        props.onMessagesChanged(messages);
    }

    return <><Typography variant={'h6'}>{"Message schedule"}</Typography>
        <Alert severity={"info"}>
            {"Use {name} to substitute the client's first name"}
        </Alert>

        <List>{
            props.messages.map((message: MessageDraft, index: number) => {
                    return buildMessageItem(message, index);
                }
            )
        }</List>

        <Stack direction={'row'} justifyContent={"space-between"}>
            <Button variant="outlined" onClick={() => {
                props.messages.push({text: "", scheduledDateTime: new Date()});
                props.onMessagesChanged(props.messages);
                // this.setState({messages: this.state.messages});
            }}>
                Add message
            </Button>
            <Button variant="contained" onClick={() => props.saveSchedule()}>
                Done
            </Button>
        </Stack>
    </>

}