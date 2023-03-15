import React, {ReactNode} from 'react';
import {FhirClientContext} from '../FhirClientContext';
import {
    Alert,
    CircularProgress,
    FormControl,
    MenuItem,
    Select,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    TextField,
    Typography
} from "@mui/material";
import {ICodeableConcept, ICoding, IContactPoint, IPatient_Contact} from "@ahryman40k/ts-fhir-types/lib/R4";
import {RelationshipCategory} from "../model/CodeSystem";
import Patient from "../model/Patient";
import { AsYouType, isPossiblePhoneNumber,parsePhoneNumber } from 'libphonenumber-js'


interface SummaryProps {
    editable: boolean
}

type SummaryState = {
    error: string;
}

export default class Summary extends React.Component<SummaryProps, SummaryState> {
    static contextType = FhirClientContext


    constructor(props: Readonly<SummaryProps> | SummaryProps) {
        super(props);
        this.state = {
            error: ''
        }
    }

    render(): React.ReactNode {
        if (!this.state) return <CircularProgress/>;

        if (this.state.error) return <Alert severity={"error"}>{this.state.error}</Alert>;

        // @ts-ignore
        let patient: Patient = this.context.patient;

        if (!patient) return <Alert severity={"error"}>{"No patient"}</Alert>;

        let emergencyContactString = "None on file";
        if (patient.contact) {
            // if (this.props.editable) {

            let emergencyContact: IPatient_Contact = patient.contact.find((contact: IPatient_Contact) => contact.relationship.find((relationship: ICodeableConcept) => relationship.coding.find((coding: ICoding) => coding === RelationshipCategory.emergencyContact)));
            let contactDetails = emergencyContact.telecom.map((t: IContactPoint) => t.value).join(" / ");
            emergencyContactString = `${emergencyContact.name.given} ${emergencyContact.name.family} (${contactDetails})`;
        }

        let error = true;
        if (patient.smsContactPoint) {
            error = !isPossiblePhoneNumber(patient.smsContactPoint, 'US');
        }

        let contactInformationEntry = <TextField
            value={patient.smsContactPoint ? new AsYouType('US').input(patient.smsContactPoint) : ""}
            error={error}
            placeholder={"Phone number"}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                try {
                    let n = parsePhoneNumber(event.target.value, 'US');
                    patient.smsContactPoint = n.nationalNumber;
                } catch (e) {
                    patient.smsContactPoint = event.target.value;
                }
                this.setState({});
            }}/>;

        let contactInformation: { label: string, value: ReactNode } = {
            label: 'Contact information',
            value: this.props.editable ? contactInformationEntry : (patient.smsContactPoint ?? "None on file")
        };

        let ccContactMethodPreference = "SMS";
        let ccContactMethodSelector = <FormControl variant="standard" sx={{m: 1, minWidth: 120}}>
            <Select
                value={ccContactMethodPreference}
                // onChange={handleChange}

            >
                <MenuItem value={"SMS"}>SMS</MenuItem>
                <MenuItem value={"Email"}>Email</MenuItem>
            </Select>
        </FormControl>

        let rows = [
            {label: 'First name', value: patient.name[0].given},
            {label: 'Last name', value: patient.name[0].family},
            {label: 'Gender', value: patient.gender},
            {label: 'DOB', value: patient.birthDate},
            contactInformation,
            {label: 'Emergency contact', value: emergencyContactString},
            {
                label: 'Send Caring Contacts via:',
                value: this.props.editable ? ccContactMethodSelector : ccContactMethodPreference
            },
        ]


        return <React.Fragment>
            <Typography variant={"h6"}>Patient info</Typography>
            {patient && <TableContainer>
                <Table sx={{minWidth: 50}} size={"small"}>
                    <TableBody>
                        {rows.map((row) => (
                            <TableRow
                                key={row.label}
                                sx={{'&:last-child td, &:last-child th': {border: 0}}}
                            >
                                <TableCell component="th" scope="row">
                                    {row.label}
                                </TableCell>
                                <TableCell align="left">{row.value}</TableCell>

                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>}
        </React.Fragment>;
    }
}
