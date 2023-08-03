import React from 'react';
import {FhirClientContext, FhirClientContextType} from '../FhirClientContext';
import {
  Alert,
  Box,
  Button,
  CardActions,
  CardContent,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";
import CarePlan from "../model/CarePlan";
import {ICarePlan} from "@ahryman40k/ts-fhir-types/lib/R4";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";

interface PatientNotesProps {
  onChange?: Function,
  onSave?: Function
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
        let carePlan: CarePlan = this.context.currentCarePlan;

        if (!carePlan) return null;

        return (
          <>
            <CardContent sx={{ padding: 0 }}>
              <Typography variant={"h6"}>Recipient notes</Typography>
              {this.state.editable ? (
                <Box sx={{margin: (theme) => theme.spacing(1)}}>
                  <TextField
                    InputProps={{ sx: { typography: "body1" } }}
                    multiline
                    fullWidth
                    minRows={4}
                    value={this.state.updatedPatientNote ?? ""}
                    placeholder={"Enter recipient note"}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                      if (this.props.onChange) this.props.onChange();
                      this.setState({ updatedPatientNote: event.target.value });
                    }}
                  />
                </Box>
              ) : (
                <Box sx={{padding: 1}}>
                  <Typography variant={"body2"} component="div" sx={{whiteSpace: "pre-wrap"}}>
                    {carePlan.description ?? "None on file"}
                  </Typography>
                </Box>
              )}
              {this._updateError()}
            </CardContent>
            <CardActions disableSpacing>
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
                size="small"
                variant="outlined"
                startIcon={this.state.editable ? <SaveIcon/> : <EditIcon/>}
              >
                {this.state.editable ? "Save notes" : "Update notes"}
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
        let carePlan = context.currentCarePlan;
        carePlan.description = updatedPatientNote;
        context.client.update(carePlan).then(
            (result: any) => {
                context.currentCarePlan = CarePlan.from(result as ICarePlan);
                console.log("Updated CarePlan:", context.currentCarePlan);
                if (this.props.onSave) this.props.onSave();
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
