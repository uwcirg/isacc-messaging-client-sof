import {
  Alert,
  Avatar,
  Button,
  Autocomplete,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  TextField,
  Typography
} from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import AddIcon from "@mui/icons-material/Add";
import {
  IBundle_Entry,
  IContactPoint,
  IPractitioner,
  IReference
} from "@ahryman40k/ts-fhir-types/lib/R4";
import React from 'react';
import {FhirClientContext} from '../FhirClientContext';
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import * as moment from "moment";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { DateValidationError } from "@mui/x-date-pickers/models";
import Patient from "../model/Patient";
import Client from "fhirclient/lib/Client";
import {Bundle} from "../model/Bundle";
import { AsYouType, isPossiblePhoneNumber,parsePhoneNumber } from 'libphonenumber-js';
import { getFhirData } from '../util/isacc_util';

interface SummaryProps {
    editable: boolean
}

type ContactToAdd = {
  name: string,
  phoneNumber: string,
  email: string
}

type SummaryState = {
    error: string;
    studyStartDateValidationError: DateValidationError | null;
    practitioners: IPractitioner[];
    selectedPractitioners: (string | IPractitioner)[];
    selectAllPractitioners: boolean;
    contactToAdd: ContactToAdd;
}

export default class Summary extends React.Component<SummaryProps, SummaryState> {
  static contextType = FhirClientContext;

  constructor(props: Readonly<SummaryProps> | SummaryProps) {
    super(props);
    this.state = {
      error: "",
      studyStartDateValidationError: null,
      practitioners: null,
      selectedPractitioners: null,
      selectAllPractitioners: false,
      contactToAdd: {
        name: "",
        phoneNumber: "",
        email: "",
      },
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
    getFhirData(client, `/Practitioner?${params}`).then((bundle: Bundle) => {
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

    let rows = [
      { label: "First name", value: patient.name[0].given },
      { label: "Last name", value: patient.name[0].family },
      { label: "DOB", value: patient.birthDate },
      { label: "Preferred name", value: this._buildPreferredNameEntry() },
      //{ label: "Gender", value: patient.gender },
      { label: "Pronouns", value: this._buildPronounsEntry() },
      { label: "Address", value: this._buildAddressEntry() },
      { label: "Contact information", value: this._buildContactInformationEntry()},
      {
        label: "Emergency contact",
        value: this._buildEmergencyContactsEntry(),
      },
      {
        label: "Send Caring Contacts via:",
        value: "SMS", // hard coded because only SMS is supported for now
      },
      {
        label: "ISACC user ID",
        value: this._buildUserIdEntry(),
      },
      { label: "Study start date", value: this._buildStudyStartDateEntry() },
      { label: "ISACC status", value: this._buildStudyStatusEntry() },
      {
        label: "Notify on incoming message",
        value: this._buildNotifyPractitionersEntry(),
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
                    <TableCell align="left">
                      <Typography variant="body1">{row.value}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </React.Fragment>
    );
  }

  private _buildContactInformationEntry() {
    // @ts-ignore
    const patient = this.context.patient;
    let error = true;
    if (patient.smsContactPoint) {
      error = !isPossiblePhoneNumber(patient.smsContactPoint, "US");
    }
    const contactInformationEntry = (
      <TextField
        value={
          patient.smsContactPoint
            ? new AsYouType("US").input(patient.smsContactPoint)
            : ""
        }
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="clear phone number"
                onClick={() => {
                  patient.smsContactPoint = "";
                  this.setState({});
                }}
                edge="end"
                size="small"
                sx={{
                  display: patient.smsContactPoint ? "block" : "none",
                }}
                title={"Clear phone number"}
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
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
        fullWidth
      />
    );
    return this.props.editable
    ? contactInformationEntry
    : patient.smsContactPoint ?? "None on file";
  }

  private _buildPreferredNameEntry() {
    // @ts-ignore
    const patient = this.context.patient;
    return this.props.editable ? (
      <TextField
        value={patient.preferredName ? patient.preferredName : ""}
        placeholder={"Preferred name"}
        size="small"
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          patient.preferredName = event.target.value;
          this.setState({});
        }}
        fullWidth
      ></TextField>
    ) : (
      <Typography variant={"body1"}>{patient.preferredName}</Typography>
    );
  }

  private _buildPronounsEntry() {
    // @ts-ignore
    const patient = this.context.patient;
    return this.props.editable ? (
      <TextField
        value={patient.pronouns ? patient.pronouns : ""}
        placeholder={"Pronouns"}
        size="small"
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          patient.pronouns = event.target.value;
          this.setState({});
        }}
        fullWidth
      ></TextField>
    ) : (
      <Typography variant={"body1"}>{patient.pronouns}</Typography>
    );
  }

  private _buildAddressEntry() {
    // @ts-ignore
    const patient = this.context.patient;
    return this.props.editable ? (
      <TextField
        value={patient.addressText ? patient.addressText : ""}
        placeholder={"Address"}
        multiline
        minRows={5}
        size="small"
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          patient.addressText = event.target.value;
          this.setState({});
        }}
        fullWidth
      ></TextField>
    ) : (
      <Typography variant={"body1"} sx={{ whiteSpace: "pre-wrap" }}>
        {patient.addressText}
      </Typography>
    );
  }

  private _buildEmergencyContactsEntry() {
    // @ts-ignore
    const patient = this.context.patient;
    const Contacts = patient.contact?.map((o: any, index: number) => {
      const name = o.name?.text ? (
        <Typography variant="subtitle2" component={"div"}>
          {o.name.text}
        </Typography>
      ) : (
        ""
      );
      const detail = o.telecom?.map((t: IContactPoint) => t.value).join(" / ");
      return (
        <>
          <ListItem
            key={`contact_item_${index}`}
            secondaryAction={
              this.props.editable ? (
                <IconButton
                  edge="end"
                  onClick={() => {
                    patient.removeContact(index);
                    this.setState({});
                  }}
                >
                  <ClearIcon />
                </IconButton>
              ) : null
            }
          >
            {this.props.editable && <ListItemAvatar>
              <Avatar></Avatar>
            </ListItemAvatar>}
            <ListItemText primary={name} secondary={detail}></ListItemText>
          </ListItem>
          {patient.contact && index !== patient.contact.length - 1 && (
            <Divider  />
          )}
        </>
      );
    });
    if (!this.props.editable) {
      if (!patient.contact) return "None on file";
      return <>{Contacts}</>;
    }
    return (
      <>
        <List>
          {Contacts}
          {patient.contact?.length > 0 && <Divider></Divider>}
          <ListItem alignItems="flex-start" sx={{marginTop: 1}}>
            <ListItemText
              primary={
                <TextField
                  value={this.state.contactToAdd?.name}
                  label={"Name"}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  margin="dense"
                  variant="standard"
                  size="small"
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    this.setState({
                      contactToAdd: {
                        ...this.state.contactToAdd,
                        name: event.target.value,
                      },
                    });
                  }}
                  fullWidth
                ></TextField>
              }
              secondary={
                <>
                  <TextField
                    value={this.state.contactToAdd?.phoneNumber}
                    label={"Phone number"}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    margin="dense"
                    variant="standard"
                    size="small"
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                      this.setState({
                        contactToAdd: {
                          ...this.state.contactToAdd,
                          phoneNumber: event.target.value,
                        },
                      });
                    }}
                    fullWidth
                  ></TextField>
                  <TextField
                    value={this.state.contactToAdd?.email}
                    label={"Email"}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    variant="standard"
                    size="small"
                    margin="dense"
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                      this.setState({
                        contactToAdd: {
                          ...this.state.contactToAdd,
                          email: event.target.value,
                        },
                      });
                    }}
                    fullWidth
                  ></TextField>
                  <Button
                    startIcon={<AddIcon></AddIcon>}
                    size="small"
                    variant="outlined"
                    sx={{ textAlign: "left", marginTop: 1 }}
                    onClick={() => {
                      patient.addContact(
                        this.state.contactToAdd.name,
                        this.state.contactToAdd.phoneNumber,
                        this.state.contactToAdd.email
                      );
                      this.setState({
                        contactToAdd: { name: "", phoneNumber: "", email: "" },
                      });
                    }}
                  >
                    Add
                  </Button>
                </>
              }
            ></ListItemText>
          </ListItem>
        </List>
      </>
    );
  }

  private _buildUserIdEntry() {
    // @ts-ignore
    const patient = this.context.patient;
    return this.props.editable ? (
      <TextField
        value={patient.userID ? patient.userID : ""}
        placeholder={"ISACC user ID"}
        size="small"
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          patient.userID = event.target.value;
          this.setState({});
        }}
        fullWidth
      ></TextField>
    ) : (
      patient.userID
    );
  }

  private _buildStudyStartDateEntry() {
    // @ts-ignore
    const patient = this.context.patient;
    return this.props.editable ? (
      <LocalizationProvider dateAdapter={AdapterMoment}>
        <DatePicker
          format="YYYY-MM-DD"
          // @ts-ignore
          value={patient.studyStartDate ? moment(patient.studyStartDate) : null}
          sx={{
            flexGrow: 1,
            width: "100%",
          }}
          onError={(newError) => {
            this.setState({
              studyStartDateValidationError: newError,
            });
          }}
          slotProps={{
            textField: {
              size: "small",
              helperText: this.state.studyStartDateValidationError
                ? "invalid entry"
                : null,
              //@ts-ignore
              onChange: (value: moment.Moment, validationContext) => {
                const inputValue = value
                  ? value.toDate().toISOString().slice(0, 10)
                  : null;
                if (!inputValue) return;
                const validationError = validationContext?.validationError;
                if (!validationError) {
                  patient.studyStartDate = inputValue;
                  this.setState({});
                } else {
                  this.setState({
                    studyStartDateValidationError: validationError,
                  });
                }
              },
            },
          }}
          onChange={(newValue: Date | null) => {
            patient.studyStartDate = newValue?.toISOString()?.slice(0, 10);
            this.setState({});
          }}
          disableFuture
        ></DatePicker>
      </LocalizationProvider>
    ) : (
      patient.studyStartDate
    );
  }

  private _buildStudyStatusEntry() {
    // @ts-ignore
    const patient = this.context.patient;
    const statuses = [
      "active",
      "completed",
      "on hold",
      "lost",
      "refused further CC",
      "withdrawn by PI",
      "deceased",
    ];
    return this.props.editable ? (
      <Autocomplete
        size="small"
        value={patient.studyStatus}
        options={statuses}
        renderInput={(params) => (
          <TextField {...params} placeholder={"ISACC status"} />
        )}
        onChange={(event: any, value: string) => {
          patient.studyStatus = value;
          this.setState({});
        }}
      />
    ) : (
      patient.studyStatus
    );
  }

  private _buildNotifyPractitionersEntry() {
    if (!this.state.practitioners) return "No practitioner entry available.";
    const selectedPractitionersDisplay =
      this.state.selectedPractitioners &&
      this.state.selectedPractitioners.length ? (
        <Stack spacing={0.5} alignItems={"flex-start"}>
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
    if (!this.props.editable) return selectedPractitionersDisplay;
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
            <TextField {...params} placeholder={"Users"} />
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
          componentsProps={{
            typography: {
              variant: "body2",
            },
          }}
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
