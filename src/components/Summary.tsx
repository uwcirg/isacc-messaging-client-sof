import React from 'react';
import {FhirClientContext} from '../FhirClientContext';
import Error from './Error';
import {CircularProgress, Table, TableBody, TableCell, TableContainer, TableRow, Typography} from "@mui/material";
import {ICodeableConcept, ICoding, IContactPoint, IPatient_Contact} from "@ahryman40k/ts-fhir-types/lib/R4";
import {RelationshipCategory} from "../model/CodeSystem";
import Patient from "../model/Patient";

interface SummaryProps {

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

// private async getFhirResources(client, id) {
    //     const resources = getFHIRResourcePaths(id);
    //     const requests = resources.map(resource => contextContent.client.request(resource));
    //     return Promise.all(requests).then(results => {
    //         results.forEach(result => {
    //             if (!result) return true;
    //             if (result.resourceType === 'Bundle' && result.entry) {
    //                 result.entry.forEach(o => {
    //                     if (o && o.resource) patientBundle.entry.push({resource: o.resource});
    //                 });
    //             } else if (Array.isArray(result)) {
    //                 result.forEach(o => {
    //                     if (o.resourceType) patientBundle.entry.push({resource: o});
    //                 });
    //             } else {
    //                 patientBundle.entry.push({resource: result});
    //             }
    //         });
    //         //FHIR resources should be available now via patientBundle.entry
    //         console.log('FHIR resource bundle entries ', patientBundle.entry);
    //     });
    // }


    render(): React.ReactNode {
        if (!this.state) return <CircularProgress/>;

        if (this.state.error) return <Error message={this.state.error}/>;

        // @ts-ignore
        let patient: Patient = this.context.patient;

        if (!patient) return <Error message={"No patient"}/>;

        let emergencyContactString = "";

        if (patient.contact) {
            let emergencyContact: IPatient_Contact = patient.contact.find((contact: IPatient_Contact) => contact.relationship.find((relationship: ICodeableConcept) => relationship.coding.find((coding: ICoding) => coding === RelationshipCategory.emergencyContact)));
            let contactDetails = emergencyContact.telecom.map((t: IContactPoint) => t.value).join(" / ");
            emergencyContactString = `${emergencyContact.name.given} ${emergencyContact.name.family} (${contactDetails})`;
        }

        let rows = [
            {label: 'First name', value: patient.name[0].given},
            {label: 'Last name', value: patient.name[0].family},
            {label: 'Gender', value: patient.gender},
            {label: 'DOB', value: patient.birthDate},
            ...patient.telecom.map((t: IContactPoint) => {
                return {label: 'Contact information', value: t.value}
            }),
            {label: 'Emergency contact', value: emergencyContactString}
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
