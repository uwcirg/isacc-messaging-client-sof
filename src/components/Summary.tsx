import React, {ReactNode} from 'react';
import {FhirClientContext} from '../FhirClientContext';
import {
    Alert,
    Autocomplete,
    Checkbox,
    Chip,
    CircularProgress,
    FormControlLabel,
    Stack,
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
    selectedPractitioners: (string | IPractitioner)[];
    selectAllPractitioners: boolean;
}

export default class Summary extends React.Component<SummaryProps, SummaryState> {
  static contextType = FhirClientContext;

  constructor(props: Readonly<SummaryProps> | SummaryProps) {
    super(props);
    this.state = {
      error: "",
      practitioners: null,
      selectedPractitioners: null,
      selectAllPractitioners: false,
    };
  }

  componentDidMount() {
    if (!this.state || this.state.practitioners) return;

    // @ts-ignore
    let client: Client = this.context.client;
    // @ts-ignore
    const patient = this.context.patient;
    let params = new URLSearchParams({
      _count: "250",
      _sort: "-_lastUpdated",
    }).toString();
    client.request(`/Practitioner?${params}`).then((bundle: Bundle) => {
      console.log("Loaded practitioners", bundle);
      const entries = bundle?.entry?.map(
        (e: IBundle_Entry) => e.resource as IPractitioner
      );
      this.setState({
        practitioners: entries,
        selectedPractitioners: entries?.filter((p: IPractitioner) => {
          return patient.generalPractitioner?.find((gpRef: IReference) => {
            return (
              gpRef.type === "Practitioner" && gpRef.reference.includes(p.id)
            );
          });
        }),
      });
    });
  }

  render(): React.ReactNode {
    if (!this.state || !this.state.practitioners) return <CircularProgress />;

    if (this.state.error)
      return <Alert severity={"error"}>{this.state.error}</Alert>;

    // @ts-ignore
    let patient: Patient = this.context.patient;

    if (!patient) return <Alert severity={"error"}>{"No recipient"}</Alert>;

    let emergencyContactString = "None on file";
    if (patient.contact) {
      // if (this.props.editable) {

      let emergencyContact: IPatient_Contact = patient.contact.find(
        (contact: IPatient_Contact) =>
          contact.relationship.find((relationship: ICodeableConcept) =>
            relationship.coding.find(
              (coding: ICoding) =>
                coding === RelationshipCategory.emergencyContact
            )
          )
      );
      let contactDetails = emergencyContact.telecom
        .map((t: IContactPoint) => t.value)
        .join(" / ");
      emergencyContactString = `${emergencyContact.name.given} ${emergencyContact.name.family} (${contactDetails})`;
    }

    let error = true;
    if (patient.smsContactPoint) {
      error = !isPossiblePhoneNumber(patient.smsContactPoint, "US");
    }

    let contactInformationEntry = (
      <TextField
        value={
          patient.smsContactPoint
            ? new AsYouType("US").input(patient.smsContactPoint)
            : ""
        }
        error={error}
        placeholder={"Phone number"}
        size="small"
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          try {
            let n = parsePhoneNumber(event.target.value, "US");
            patient.smsContactPoint = n.nationalNumber;
          } catch (e) {
            patient.smsContactPoint = event.target.value;
          }
          this.setState({});
        }}
      />
    );

    let contactInformation: { label: string; value: ReactNode } = {
      label: "Contact information",
      value: this.props.editable
        ? contactInformationEntry
        : patient.smsContactPoint ?? "None on file",
    };

    let notifyPractitionersSelector = null;
    if (this.state.practitioners) {
      const selectedPractitionersDisplay =
        this.state.selectedPractitioners &&
        this.state.selectedPractitioners.length ? (
          <Stack spacing={0.5}>
            {this.state.selectedPractitioners.map(
              (p: string | IPractitioner, index) => {
                return (
                  <Chip
                    key={`notify_p_display_${index}`}
                    label={this.getPractitionerLabel(p)}
                    variant="outlined"
                    size="small"
                  ></Chip>
                );
              }
            )}
          </Stack>
        ) : (
          "None on file"
        );

      notifyPractitionersSelector = this.props.editable
        ? this._buildPractitionerSelector()
        : selectedPractitionersDisplay;
    }

    let rows = [
      { label: "First name", value: patient.name[0].given },
      { label: "Last name", value: patient.name[0].family },
      { label: "Gender", value: patient.gender },
      { label: "DOB", value: patient.birthDate },
      contactInformation,
      { label: "Emergency contact", value: emergencyContactString },
      {
        label: "Send Caring Contacts via:",
        value: "SMS", // hard coded because only SMS is supported for now
      },
      {
        label: "Notify on incoming message",
        value:
          notifyPractitionersSelector ?? "No practitioner records available",
      },
    ];

    return (
      <React.Fragment>
        <Typography variant={"h6"}>Recipient info</Typography>
        {patient && (
          <TableContainer>
            <Table sx={{ minWidth: 50 }} size={"small"}>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.label}
                    sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                  >
                    <TableCell component="th" scope="row">
                      {row.label}
                    </TableCell>
                    <TableCell align="left">{row.value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </React.Fragment>
    );
  }

  private _buildPractitionerSelector() {
    // @ts-ignore
    const patient: Patient = this.context.patient;
    const toReferences = (practitioners: (string | IPractitioner)[]) =>
      practitioners?.map((v) => ({
        type: "Practitioner",
        reference: `Practitioner/${(v as IPractitioner).id}`,
      }));
    return (
      <>
        <Autocomplete
          multiple
          size="small"
          value={this.state.selectedPractitioners ?? []}
          options={this.state.practitioners}
          getOptionLabel={(option) =>
            this.getPractitionerLabel(option as IPractitioner)
          }
          renderInput={(params) => (
            <TextField {...params} placeholder={"Practitioners"} />
          )}
          onChange={(event: any, value: (string | IPractitioner)[]) => {
            this.setState({
              selectedPractitioners: value,
            });
            if (!value || !value.length) {
              this.setState({
                selectAllPractitioners: false,
              });
              patient.generalPractitioner = null;
              return;
            }
            patient.generalPractitioner = toReferences(value);
          }}
        />
        <FormControlLabel
          label="Select all"
          control={
            <Checkbox
              size="small"
              checked={this.state.selectAllPractitioners}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                this.setState({
                  selectAllPractitioners: event.target.checked,
                  selectedPractitioners: event.target.checked
                    ? this.state.practitioners
                    : null,
                });
                patient.generalPractitioner = toReferences(
                  this.state.practitioners
                );
              }}
            />
          }
        />
      </>
    );
  }

  private getPractitionerLabel(option: IPractitioner | string) {
    if (typeof option === "string") return option;
    if (!option.name || !option.name[0])
      return `${option.resourceType}/${option.id}`;
    return `${option.name[0].given} ${option.name[0].family}`;
  }
}
