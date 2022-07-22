import * as React from "react";
import CCPlanDefinition, {CCActivityDefinition} from "../model/PlanDefinition";
import {Button, CircularProgress, Grid, List, ListItem, Stack, TextField} from "@mui/material";
import {DateTimePicker} from "@mui/x-date-pickers";
import {FhirClientContext, FhirClientContextType} from "../FhirClientContext";
import Client from "fhirclient/lib/Client";
import {makeCarePlanBundle} from "../model/modelUtil";
import {IResource} from "@ahryman40k/ts-fhir-types/lib/R4";


interface ScheduleSetupProps {
    planDefinition: CCPlanDefinition;
    classes?: any;
}

type ScheduleSetupState = {
    messages: Message[];
}

type Message = {
    text: string,
    scheduledDateTime: Date
}

const styles = {
    listItem: {
        paddingTop: 2
    }
};

export default class ScheduleSetup extends React.Component<ScheduleSetupProps, ScheduleSetupState> {

    componentDidMount(): void {
        const messages: Message[] = this.props.planDefinition.activityDefinitions.map(function (message: CCActivityDefinition) {
            let contentString = message.dynamicValue.find((dynVal) => dynVal.path === "payload.contentString").expression.expression;
            let date = message.occurrenceTimeFromNow();

            return {
                text: contentString,
                scheduledDateTime: date
                // scheduledDate: date.toISOString().substr(0, 10),
                // scheduledTime: date.toISOString().substr(11, 5),
            } as Message;
        });

        this.setState({messages: messages});
    }

    render(): React.ReactNode {
        if (!this.state) return <CircularProgress/>;

        return <>
            <List>{
                this.state.messages.map((message, index) => {
                        return this._buildMessageItem(message, index);
                    }
                )
            }</List>

            <Stack direction={'row'} justifyContent={"space-between"}>
                <Button variant="outlined">Add message</Button>
                <FhirClientContext.Consumer>
                    {(context: FhirClientContextType) => {
                        return <Button variant="contained" onClick={() => this.saveSchedule(context.client)}>Done</Button>
                    }}
                </FhirClientContext.Consumer>
            </Stack>

        </>

    }

    private saveSchedule(client:Client) {
        if (!client) {
            console.log("No client");
            return;
        }

        let bundle = makeCarePlanBundle(client.patient, this.props.planDefinition, this.state.messages);
        client.create(bundle).then(this.onSaved, this.onRejected);

    }

    private onSaved(value: IResource) {
        console.log("resource saved");
    }

    private onRejected(reason: any) {
        console.log("resource rejected");
    }

    private _buildMessageItem(message: Message, index: number) {
        return <ListItem key={index}>
            {/*<TextField*/}
            {/*    type={"number"}*/}
            {/*    InputProps={{*/}
            {/*        endAdornment: <InputAdornment position="end">Weeks</InputAdornment>,*/}
            {/*    }}*/}
            {/*/>*/}
            <Grid container alignItems={"stretch"}
                  sx={styles.listItem}>
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