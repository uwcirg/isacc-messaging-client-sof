import React from 'react';
import {FhirClientContext} from '../FhirClientContext';
import {Alert, CircularProgress, Typography} from "@mui/material";

interface PatientNotesProps {

}

type PatientNotesState = {
    error: string;
}

export default class PatientNotes extends React.Component<PatientNotesProps, PatientNotesState> {
    static contextType = FhirClientContext


    constructor(props: Readonly<PatientNotesProps> | PatientNotesProps) {
        super(props);
        this.state = {
            error: ''
        }
    }

    render(): React.ReactNode {
        if (!this.state) return <CircularProgress/>;

        if (this.state.error) return <Alert severity={"error"}>{this.state.error}</Alert>;

        // @ts-ignore
        let carePlan: CarePlan = this.context.carePlan;

        if (!carePlan) return null;

        return <React.Fragment>
            <Typography variant={"h6"}>Patient notes</Typography>
            <Typography variant={"body2"}>{carePlan.description}</Typography>
        </React.Fragment>;
    }
}
