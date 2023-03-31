import React from 'react';
import {FhirClientContext, FhirClientContextType} from '../FhirClientContext';
import {Alert, Button, CardActions, CardContent, CircularProgress, TextField, Typography} from "@mui/material";
import CarePlan from "../model/CarePlan";
import {ICarePlan} from "@ahryman40k/ts-fhir-types/lib/R4";

interface PatientNotesProps {

}

type PatientNotesState = {
    error: string;
    editable: boolean;
    updatedPatientNote: string;
    updateAlert: { text: string, error: boolean }
}

export default class PatientNotes extends React.Component<PatientNotesProps, PatientNotesState> {
    static contextType = FhirClientContext

    constructor(props: Readonly<PatientNotesProps> | PatientNotesProps) {
        super(props);
        this.state = {
            error: null,
            editable: false,
            updatedPatientNote: null,
            updateAlert: null
        }
    }

    render(): React.ReactNode {
        if (!this.state) return <CircularProgress/>;

        if (this.state.error) return <Alert severity={"error"}>{this.state.error}</Alert>;

        // @ts-ignore
        let carePlan: CarePlan = this.context.carePlan;

        if (!carePlan) return null;

        return (
          <>
            <CardContent sx={{ padding: 0 }}>
              <Typography variant={"h6"}>Patient notes</Typography>
              {this.state.editable ? (
                <TextField
                  InputProps={{ sx: { typography: "body2" } }}
                  multiline
                  fullWidth
                  value={this.state.updatedPatientNote ?? ""}
                  placeholder={"Enter patient note"}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    this.setState({ updatedPatientNote: event.target.value });
                  }}
                />
              ) : (
                <Typography variant={"body2"}>
                  {carePlan.description}
                </Typography>
              )}
              {this._updateError()}
            </CardContent>
            <CardActions>
              <Button
                onClick={() => {
                  if (this.state.editable) {
                    this.updateNote(this.state.updatedPatientNote);
                  } else {
                    this.setState({
                      updatedPatientNote: carePlan.description,
                      editable: true,
                    });
                  }
                }}
              >
                {this.state.editable ? "Done" : "Update"}
              </Button>
            </CardActions>
          </>
        );
    }

    private _updateError() {
        if (this.state.updateAlert != null) {
            return <Alert
                severity={this.state.updateAlert.error ? "error" : "success"}
            >{this.state.updateAlert.text}</Alert>;
        }
        return null;
    }

    private updateNote(updatedPatientNote: string) {
        // @ts-ignore
        let context: FhirClientContextType = this.context;
        let carePlan = context.carePlan;
        carePlan.description = updatedPatientNote;
        context.client.update(carePlan).then(
            (result: any) => {
                context.carePlan = CarePlan.from(result as ICarePlan);
                console.log("Updated CarePlan:", context.carePlan);
                this.setState({
                    editable: false,
                    updatedPatientNote: null
                });
            },
            (error) => {
                console.log("Error updating carePlan description:", error);
                this.setState({
                    updateAlert: {text: "Error updating", error: true}
                });
            });
    }
}