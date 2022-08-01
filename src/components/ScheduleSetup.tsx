import * as React from "react";
import PlanDefinition, {ActivityDefinition} from "../model/PlanDefinition";
import {
    Button,
    CircularProgress,
    Grid,
    List,
    ListItem,
    Snackbar,
    Stack,
    TextField,
    Theme,
    Typography
} from "@mui/material";
import {DateTimePicker} from "@mui/x-date-pickers";
import {FhirClientContext} from "../FhirClientContext";
import {makeCarePlan, makeCommunicationRequests} from "../model/modelUtil";
import {IResource} from "@ahryman40k/ts-fhir-types/lib/R4";
import {CommunicationRequest} from "../model/CommunicationRequest";
import {injectIntl, WrappedComponentProps} from "react-intl";
import {createStyles, StyledComponentProps, withStyles} from "@mui/styles";
import Alert from "@mui/material/Alert";


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

    componentDidMount(): void {
        const messages: MessageDraft[] = this.props.planDefinition.activityDefinitions.map(function (message: ActivityDefinition) {
            let contentString = message.dynamicValue.find((dynVal) => dynVal.path === "payload.contentString").expression.expression;
            let date = message.occurrenceTimeFromNow();

            return {
                text: contentString,
                scheduledDateTime: date
                // scheduledDate: date.toISOString().substr(0, 10),
                // scheduledTime: date.toISOString().substr(11, 5),
            } as MessageDraft;
        });

        this.setState({messages: messages});
    }

    render(): React.ReactNode {
        if (!this.state || !this.state.messages) return <CircularProgress/>;

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

            <List className={classes.list}>{
                this.state.messages.map((message, index) => {
                        return this._buildMessageItem(message, index);
                    }
                )
            }</List>

            <Stack direction={'row'} justifyContent={"space-between"}>
                <Button variant="outlined" onClick={() => this.showSnackbar("info", "Not implemented")}>Add
                    message</Button>
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

        let communicationRequests = makeCommunicationRequests(patient, this.props.planDefinition, this.state.messages);
        let promises = communicationRequests.map((c: CommunicationRequest) => client.create(c));

        // let onSaved = (value: IResource) => {
        //     console.log("resource saved:", value);
        //     this.showSnackbar("success", "Schedule created successfully");
        // }
        // let onRejected = (reason: any)  => {
        //     console.log("resource rejected");
        //     this.showSnackbar("error", "Schedule could not be created");
        // }
        // save all the communication requests first so we can get references to them
        Promise.all(promises).then((values) => {
            values.forEach((v) => {
                console.log("resource saved:", v);
            });
            // create CarePlan with the newly created CommunicationRequests
            let carePlan = makeCarePlan(this.props.planDefinition, patient,
                values.map((c: any) => CommunicationRequest.from(c)), this.state.patientNote);
            client.create(carePlan).then((v: IResource) => this.onSaved(v), (reason: any) => this.onRejected(reason));
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
        return <ListItem key={index}>
            {/*<TextField*/}
            {/*    type={"number"}*/}
            {/*    InputProps={{*/}
            {/*        endAdornment: <InputAdornment position="end">Weeks</InputAdornment>,*/}
            {/*    }}*/}
            {/*/>*/}
            <Grid container alignItems={"stretch"}
                  className={classes.listItem}>
                <Grid item xs={4}>
                    {/*<TextField*/}
                    {/*    fullWidth*/}
                    {/*    value={message.text ?? ""}*/}
                    {/*    // placeholder={intl.formatMessage({id: 'enter_response'})}*/}
                    {/*    placeholder={"Enter message"}*/}
                    {/*    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {*/}
                    {/*        message.text = event.target.value;*/}
                    {/*        this.setState({messages: this.state.messages});*/}
                    {/*    }}/>*/}

                    <DateTimePicker
                        label="Date & Time"
                        value={message.scheduledDateTime}
                        onChange={(newValue: Date | null) => {
                            message.scheduledDateTime = newValue;
                            this.setState({messages: this.state.messages});
                        }}
                        renderInput={(params) => <TextField {...params} />}/>
                </Grid>
                <Grid item xs={8}>
                    <TextField
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

}

export default injectIntl(withStyles(styles)(ScheduleSetup));