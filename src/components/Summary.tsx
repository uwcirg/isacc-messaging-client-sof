import React, {ReactNode} from 'react';
import {FhirClientContext} from '../FhirClientContext';
import {
    Alert, Autocomplete,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    TextField,
    Typography
} from "@mui/material";

import {
    IBundle_Entry,
    ICodeableConcept,
    ICoding,
    IContactPoint,
    IPatient_Contact, IPractitioner, IReference
} from "@ahryman40k/ts-fhir-types/lib/R4";
import {RelationshipCategory} from "../model/CodeSystem";
import Patient from "../model/Patient";
import Client from "fhirclient/lib/Client";
import {Bundle} from "../model/Bundle";
import { AsYouType, isPossiblePhoneNumber,parsePhoneNumber } from 'libphonenumber-js'

interface SummaryProps {
    editable: boolean
}

type SummaryState = {
    error: string;
    practitioners: IPractitioner[];
}

export default class Summary extends React.Component<SummaryProps, SummaryState> {
    static contextType = FhirClientContext


    constructor(props: Readonly<SummaryProps> | SummaryProps) {
        super(props);
        this.state = {
            error: '',
            practitioners: null
        }
    }

    componentDidMount() {
        if (!this.state || this.state.practitioners) return;

        // @ts-ignore
        let client: Client = this.context.client;
        let params = new URLSearchParams({
            "_count": "250",
            "_sort": "-_lastUpdated"
        }).toString();
        client.request(`/Practitioner?${params}`).then((bundle: Bundle) => {
            console.log("Loaded practitioners", bundle);
            this.setState({practitioners: bundle.entry.map((e: IBundle_Entry) => e.resource as IPractitioner)});
        });
    }

    render(): React.ReactNode {
        if (!this.state || !this.state.practitioners) return <CircularProgress/>;

        if (this.state.error) return <Alert severity={"error"}>{this.state.error}</Alert>;

        // @ts-ignore
        let patient: Patient = this.context.patient;

        if (!patient) return <Alert severity={"error"}>{"No recipient"}</Alert>;

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
            size="small"
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

        let notifyPractitionersSelector = null;
        if (this.state.practitioners) {
            let currentSelection = this.state.practitioners.filter(
                (p: IPractitioner) => {
                    return patient.generalPractitioner?.find((gpRef: IReference) => {
                        return gpRef.type === "Practitioner" && gpRef.reference.includes(p.id);
                    });
                });
            notifyPractitionersSelector = <Autocomplete
                multiple
                size="small"
                defaultValue={currentSelection}
                options={this.state.practitioners}
                getOptionLabel={(option) => this.getPractitionerLabel(option as IPractitioner)}
                renderInput={(params) => <TextField {...params} placeholder={"Practitioners"}/>}
                onChange={(event: any, value: (string | IPractitioner)[]) => {
                    patient.generalPractitioner = value.map((v) => ({
                        type: "Practitioner",
                        reference: `Practitioner/${(v as IPractitioner).id}`
                    }));
                }}
            />;
        }

        let rows = [
            {label: 'First name', value: patient.name[0].given},
            {label: 'Last name', value: patient.name[0].family},
            {label: 'Gender', value: patient.gender},
            {label: 'DOB', value: patient.birthDate},
            contactInformation,
            {label: 'Emergency contact', value: emergencyContactString},
            {
                label: 'Send Caring Contacts via:',
                value: "SMS" // hard coded because only SMS is supported for now
            },
            {
                label: "Notify on incoming message",
                value: notifyPractitionersSelector ?? "No practitioner records available"
            }
        ]


        return <React.Fragment>
            <Typography variant={"h6"}>Recipient info</Typography>
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

    private getPractitionerLabel(option: IPractitioner) {
        if (!option.name || !option.name[0]) return `${option.resourceType}/${option.id}`;
        return `${option.name[0].given} ${option.name[0].family}`;
    }
}
