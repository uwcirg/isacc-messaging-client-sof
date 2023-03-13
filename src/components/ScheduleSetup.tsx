import * as React from "react";
import {
    Button,
    CircularProgress,
    Grid,
    IconButton,
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
import PatientNotes from "./PatientNotes";
import CarePlan from "../model/CarePlan";


interface ScheduleSetupProps {
}

type ScheduleSetupState = {
    carePlan: CarePlan;
    showCloseSchedulePlannerAlert: boolean;
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
            carePlan: null,
            showCloseSchedulePlannerAlert: false,
            alertText: null,
            alertSeverity: null,
            savingInProgress: false
        };
        this.planDefinition = getDefaultMessageSchedule();
    }

    componentDidMount() {
        //@ts-ignore
        let carePlan: CarePlan = this.context.carePlan;
        this.setState({carePlan: carePlan});
    }

    render(): React.ReactNode {
        if (!this.state || !this.state.carePlan || !this.context) return <CircularProgress/>;

        //@ts-ignore
        let patient: Patient = this.context.patient;

        let editing = this.state.carePlan.id != null;


        return <>
            {editing ?
                <Alert severity={"info"}>
                    {`You are editing an existing CarePlan (CarePlan/${this.state.carePlan.id}, created ${new Date(this.state.carePlan.created)})`}
                </Alert>
                : null}
            <Grid container spacing={2}>
                <Grid item xs={6}><Summary editable={true}/></Grid>
                <Grid item xs={6}>
                    {editing ?
                        <PatientNotes/> :
                        <>
                            <Typography variant={'h6'}>{"Patient note"}</Typography>
                            <TextField
                                sx={{maxHeight: 400, overflow: 'auto', ...styles.patientNotesField}}
                                fullWidth
                                multiline
                                value={this.state.carePlan.description ?? ""}
                                placeholder={"Patient note"}
                                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                    const cp = this.state.carePlan;
                                    cp.description = event.target.value;
                                    this.setState({carePlan: cp});
                                }}/>
                        </>
                    }
                </Grid>
                <Grid item xs={12}>
                    <MessageScheduleList
                        messagePlan={this.state.carePlan}
                        onMessagePlanChanged={(carePlan: CarePlan) => {
                            this.setState({carePlan: carePlan});
                        }}
                        saveSchedule={() => this.saveSchedule()}
                        patient={patient}
                    />
                </Grid>
            </Grid>

            {this.getCloseSchedulePlannerAlert()}
        </>
    }

    private showSnackbar(alertSeverity: "error" | "warning" | "info" | "success", alertText: string) {
        this.setState({
            showCloseSchedulePlannerAlert: true,
            alertSeverity: alertSeverity,
            alertText: alertText,
            savingInProgress: false
        });
    }

    private getCloseSchedulePlannerAlert() {
        let clearSessionLink = getEnv("REACT_APP_DASHBOARD_URL") + "/clear_session";
        let onClose = () => this.setState({showCloseSchedulePlannerAlert: false});

        if (this.state.savingInProgress) {
            return <Dialog open={this.state.savingInProgress}>
                <DialogContent>
                    <CircularProgress/>
                    <DialogContentText>{"Saving..."}</DialogContentText>
                </DialogContent>
            </Dialog>;
        }

        if (this.state.alertSeverity === 'success') {
            return <Dialog open={this.state.showCloseSchedulePlannerAlert}
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
        return <Snackbar open={this.state.showCloseSchedulePlannerAlert}
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

        if (this.state.carePlan.communicationRequests.find((m: CommunicationRequest) => m.getText().length === 0)) {
            this.showSnackbar("error", "Messages cannot be empty");
            return;
        }

        client.update(patient).then((value: any) => console.log(`Patient ${patient.id} updated`));

        let promises = this.state.carePlan.communicationRequests.map(
            (c: CommunicationRequest) => {
                let p;
                if (c.id) {
                    p = client.update(c);
                } else {
                    p = client.create(c);
                }
                return p.then(
                    (value: any) => CommunicationRequest.from(value)
                );
            }
        );

        Promise.all(promises).then((communicationRequests: CommunicationRequest[]) => {
            communicationRequests.forEach((v: CommunicationRequest) => {
                console.log("resource saved:", v);
            });
            // update CarePlan with the newly created CommunicationRequests
            this.state.carePlan.setCommunicationRequests(communicationRequests);
            // create resource on server
            let p;
            if (this.state.carePlan.id) {
                p = client.update(this.state.carePlan);
            } else {
                p = client.create(this.state.carePlan);
            }
            p.then((savedCarePlan: IResource) => {
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
    messagePlan: CarePlan,
    patient: Patient,
    onMessagePlanChanged: (carePlan: CarePlan) => void,
    saveSchedule: () => void,
}) => {

    const buildMessageItem = (message: CommunicationRequest, index: number) => {
        return <ListItem key={index} sx={{
            width: '100%'
        }} secondaryAction={
            message.status === "completed" ? <></> :
            <IconButton hidden={message.status === "completed"} onClick={() => {
                removeMessage(index);
            }}>
                <ClearIcon/>
            </IconButton>
        }>
            <Grid container direction={"row"} flexDirection={"row"} spacing={2}
                  sx={{paddingTop: 2}}>

                <Grid item>
                    <DateTimePicker

                        label={message.status === "completed" ? "Delivered Date & Time" : "Scheduled Date & Time"}
                        value={message.occurrenceDateTime}
                        inputFormat="ddd, MM/DD/YYYY hh:mm A" // example output display: Thu, 03/09/2023 09:34 AM
                        disabled={message.status === "completed"}
                        onChange={(newValue: Date | null) => {
                            message.setOccurrenceDate(newValue);
                            props.onMessagePlanChanged(props.messagePlan);
                        }}
                        renderInput={(params: TextFieldProps) => <TextField {...params} />}/>
                </Grid>
                <Grid item flexGrow={1}>
                    <TextField
                        error={message.getText().length === 0}
                        helperText={message.getText().length === 0 ? "Enter a message" : ""}
                        label={message.status === "completed" ? "Delivered Message" : "Scheduled Message"}
                        fullWidth
                        multiline
                        value={message.getText() ?? ""}
                        placeholder={"Enter message"}
                        disabled={message.status === "completed"}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                            message.setText(event.target.value);
                            props.onMessagePlanChanged(props.messagePlan);
                        }}/>
                </Grid>
            </Grid>
        </ListItem>
    }

    const removeMessage = (index: number) => {
        let messagePlan = props.messagePlan;
        messagePlan.removeActiveCommunicationRequest(index);
        props.onMessagePlanChanged(messagePlan);
    }

    return <><Typography variant={'h6'}>{"Message schedule"}</Typography>
        <Alert severity={"info"}>
            {"Use {name} to substitute the client's first name"}
        </Alert>

        <List>{
            props.messagePlan.getActiveCommunicationRequests().map(
                (message: CommunicationRequest, index: number) => buildMessageItem(message, index)
            )
        }</List>

        <Stack direction={'row'} justifyContent={"space-between"}>
            <Button variant="outlined" onClick={() => {
                let newMessage = CommunicationRequest.createNewScheduledMessage("", props.patient, props.messagePlan, new Date());
                props.messagePlan.addCommunicationRequest(newMessage);
                props.onMessagePlanChanged(props.messagePlan);
            }}>
                Add message
            </Button>
            <Button variant="contained" onClick={() => props.saveSchedule()}>
                Done
            </Button>
        </Stack>
    </>

}