import * as React from "react";
import PlanDefinition from "../model/PlanDefinition";
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
    Theme,
    Typography
} from "@mui/material";
import ClearIcon from '@mui/icons-material/Clear';
import {DateTimePicker} from "@mui/x-date-pickers";
import {FhirClientContext} from "../FhirClientContext";
import {makeCarePlan, makeCommunicationRequests} from "../model/modelUtil";
import {IResource} from "@ahryman40k/ts-fhir-types/lib/R4";
import {CommunicationRequest} from "../model/CommunicationRequest";
import {injectIntl, WrappedComponentProps} from "react-intl";
import {createStyles, StyledComponentProps, withStyles} from "@mui/styles";
import Alert from "@mui/material/Alert";
import Patient from "../model/Patient";
import LaunchError from "./LaunchError";


interface ScheduleSetupProps {
    planDefinition: PlanDefinition;
}

type ScheduleSetupState = {
    messages: MessageDraft[];
    patientNote: string;
    showAlert: boolean;
    alertSeverity: "error" | "warning" | "info" | "success";
    alertText: string;
}

export type MessageDraft = {
    text: string,
    scheduledDateTime: Date
}


const styles = createStyles((theme: Theme) => {
    return {
        questionTitle: {},
        questionSectionTitle: {
            color: theme.palette.primary.main,
            fontWeight: "bolder",
            paddingTop: 8
        },
        helpText: {
            color: theme.palette.text.secondary
        },
        cardPageMargins: {
            padding: 8
        },
        paddingTop: {
            paddingTop: 8
        },
        chip: {
            flex: 1,
            textAlign: "center",
        },
        bubble: {
            padding: 4
        },
        list: {
            padding: 0
        },
        listItem: {
            paddingTop: 2
        },
        patientNotesField: {
            margin: 2
            // paddingTop: 2,
            // paddingBottom: 2,
        }
    }
});


class ScheduleSetup extends React.Component<ScheduleSetupProps & WrappedComponentProps & StyledComponentProps, ScheduleSetupState> {
    static contextType = FhirClientContext

    // declare context: React.ContextType<typeof FhirClientContext>

    constructor(props: Readonly<ScheduleSetupProps & WrappedComponentProps & StyledComponentProps> | (ScheduleSetupProps & WrappedComponentProps & StyledComponentProps)) {
        super(props);
        this.state = {
            messages: null,
            patientNote: '',
            showAlert: false,
            alertText: null,
            alertSeverity: null
        };
    }

    componentDidMount() {
        // @ts-ignore
        let patient: Patient = this.context.patient;

        if (!patient) {
            console.log("Context not available in componentDidMount!");
            return;
        }

        const messages: MessageDraft[] = this.props.planDefinition.createMessageList(patient);
        this.setState({messages: messages});
    }

    render(): React.ReactNode {
        if (!this.state) return <CircularProgress/>;

        // @ts-ignore
        let patient: Patient = this.context.patient;

        if (!patient) return <LaunchError message={"No patient"}/>;

        if (!this.state.messages) {
            return <CircularProgress/>;
        }

        const {classes} = this.props;
        const {intl} = this.props;

        return <>
            <Typography variant={'h6'}>{intl.formatMessage({id: 'patient_note'})}</Typography>
            <TextField
                className={classes.patientNotesField}
                label={"Patient notes"}
                fullWidth
                multiline
                value={this.state.patientNote ?? ""}
                placeholder={intl.formatMessage({id: 'patient_note'})}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    this.setState({patientNote: event.target.value});
                }}/>

            <Typography variant={'h6'}>{intl.formatMessage({id: 'message_schedule'})}</Typography>
            <Alert severity={"info"}>
                {"Use {name} to substitute the client's first name"}
            </Alert>

            <List>{
                this.state.messages.map((message: MessageDraft, index: number) => {
                        return this._buildMessageItem(message, index);
                    }
                )
            }</List>

            <Stack direction={'row'} justifyContent={"space-between"}>
                <Button variant="outlined" onClick={() => {
                    this.state.messages.push({text: "", scheduledDateTime: new Date()});
                    this.setState({messages: this.state.messages});
                }}>
                    Add message
                </Button>
                <Button variant="contained" onClick={() => this.saveSchedule()}>
                    Done
                </Button>
            </Stack>

            {this.getSnackbar()}
        </>

    }

    private showSnackbar(alertSeverity: "error" | "warning" | "info" | "success", alertText: string) {
        this.setState({showAlert: true, alertSeverity: alertSeverity, alertText: alertText});
    }

    private getSnackbar() {
        return <Snackbar open={this.state.showAlert}
                         autoHideDuration={6000}
                         onClose={() => this.setState({showAlert: false})}>
            <Alert
                onClose={() => this.setState({showAlert: false})}
                severity={this.state.alertSeverity}
                sx={{width: '100%'}}>
                {this.state.alertText}
            </Alert>
        </Snackbar>;
    }


    private saveSchedule() {
        // @ts-ignore
        let client = this.context.client;
        // @ts-ignore
        let patient = this.context.patient;

        if (!client) {
            console.log("No client");
            return;
        }

        if (!patient) {
            console.log("no patient");
            return;
        }

        if (this.state.messages.find((m: MessageDraft) => m.text.length === 0)) {
            this.showSnackbar("error", "Messages cannot be empty");
            return;
        }

        let communicationRequests = makeCommunicationRequests(patient, this.props.planDefinition, this.state.messages);
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
            let carePlan = makeCarePlan(this.props.planDefinition, patient, communicationRequests, this.state.patientNote);
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
        console.log("resource rejected");
        this.showSnackbar("error", "Schedule could not be created")
    }

    private _buildMessageItem(message: MessageDraft, index: number) {
        const {classes} = this.props;
        return <ListItem key={index} sx={{width: '100%'}} secondaryAction={
            <ClearIcon onClick={() => this.removeMessage(index)}/>
        }>
            <Grid container direction={"row"} flexDirection={"row"} spacing={2}
                  className={classes.listItem}>

                <Grid item>
                    <DateTimePicker

                        label="Date & Time"
                        value={message.scheduledDateTime}
                        onChange={(newValue: Date | null) => {
                            message.scheduledDateTime = newValue;
                            this.setState({messages: this.state.messages});
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
                        // placeholder={intl.formatMessage({id: 'enter_response'})}
                        placeholder={"Enter message"}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                            message.text = event.target.value;
                            this.setState({messages: this.state.messages});
                        }}/>
                </Grid>
            </Grid>
        </ListItem>
    }

    private removeMessage(index: number) {
        let messages = this.state.messages;
        messages.splice(index, 1);
        this.setState({messages: messages})
    }
}

export default injectIntl(withStyles(styles)(ScheduleSetup));