import {
  Alert,
  Avatar,
  Box,
  Button,
  Autocomplete,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  IconButton,
  InputAdornment,
  InputLabel,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { SelectChangeEvent } from "@mui/material/Select";
import ClearIcon from "@mui/icons-material/Clear";
import AddIcon from "@mui/icons-material/Add";
import {
  IBundle_Entry,
  ICareTeam_Participant,
  IContactPoint,
  IPractitioner,
  IReference,
} from "@ahryman40k/ts-fhir-types/lib/R4";
import React from "react";
import { FhirClientContext } from "../FhirClientContext";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import * as moment from "moment";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { DateValidationError } from "@mui/x-date-pickers/models";
import Patient from "../model/Patient";
import Client from "fhirclient/lib/Client";
import { Bundle } from "../model/Bundle";
import {
  AsYouType,
  isPossiblePhoneNumber,
  parsePhoneNumber,
} from "libphonenumber-js";
import { getFhirData } from "../util/isacc_util";
import CareTeam from "../model/CareTeam";

interface SummaryProps {
  editable?: boolean;
  onChange?: Function;
}

type ContactToAdd = {
  name: string;
  phoneNumber: string;
  email: string;
};

type SummaryState = {
  error: string;
  studyStartDateValidationError: DateValidationError | null;
  DOBDateValidationError: DateValidationError | null;
  practitioners: IPractitioner[];
  selectedPractitioners: (string | IPractitioner)[];
  selectAllPractitioners: boolean;
  primaryAuthor: string | IPractitioner;
  contactToAdd: ContactToAdd;
};

const NONE_TEXT = "--";

export default class Summary extends React.Component<SummaryProps, SummaryState> {
  static contextType = FhirClientContext;

  constructor(props: Readonly<SummaryProps> | SummaryProps) {
    super(props);
    this.state = {
      error: "",
      studyStartDateValidationError: null,
      DOBDateValidationError: null,
      practitioners: null,
      selectedPractitioners: null,
      selectAllPractitioners: false,
      primaryAuthor: null,
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

    let params = new URLSearchParams({
      _count: "250",
      _sort: "-_lastUpdated",
    }).toString();
    getFhirData(client, `/Practitioner?${params}`).then((bundle: Bundle) => {
      console.log("Loaded practitioners", bundle);
      // @ts-ignore
      const patient = this.context.patient;
      if (this.props.editable) {
        if (
          !patient.generalPractitioner ||
          !patient.generalPractitioner.length
        ) {
          this.handleSetCurrentUserAsGeneralPractitioner();
        }
        this.handleSetCurrentUserAsCareTeamParticipant();
      }
      const entries = bundle?.entry?.map(
        (e: IBundle_Entry) => e.resource as IPractitioner
      );
      let matchedPrimaryAuthor: IPractitioner[] = entries?.filter(
        (p: IPractitioner) => {
          //@ts-ignore
          return this.context.patient?.generalPractitioner?.find(
            (gp: IReference) => gp.reference?.split("/")[1] === p.id
          );
        }
      );
      let arrCTPractitioners: IPractitioner[] = entries?.filter(
        (p: IPractitioner) => {
          const isCareTeamParticipant =
            // @ts-ignore
            this.context.careTeam?.participant?.find(
              (ip: ICareTeam_Participant) => {
                return ip.member?.reference.split("/")[1] === p.id;
              }
            );
          const isGeneralPractitioner = patient.generalPractitioner?.find(
            (gp: IReference) => gp.reference?.split("/")[1] === p.id
          );
          return isCareTeamParticipant || isGeneralPractitioner;
        }
      );

      this.setState({
        practitioners: entries,
        primaryAuthor:
          matchedPrimaryAuthor && matchedPrimaryAuthor.length === 1
            ? matchedPrimaryAuthor[0]
            : null,
        selectedPractitioners:
          arrCTPractitioners && arrCTPractitioners.length
            ? arrCTPractitioners
            : [],
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
      { label: "First name", value: this._buildFirstNameEntry() },
      { label: "Last name", value: this._buildLastNameEntry() },
      { label: "DOB", value: this._buildDOBEntry() },
      { label: "Preferred name", value: this._buildPreferredNameEntry() },
      { label: "Gender", value: this._buildGenderEntry() },
      { label: "Pronouns", value: this._buildPronounsEntry() },
      { label: "Address", value: this._buildAddressEntry() },
      {
        label: "Contact information",
        value: this._buildContactInformationEntry(),
      },
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
      { label: "Primary author", value: this._buildPrimaryAuthorEntry() },
      {
        label: "Notify on incoming message",
        value: this._buildNotifyPractitionersEntry(),
      },
    ];

    return (
      <React.Fragment>
        <Typography variant={"h6"}>Recipient info</Typography>
        {patient && (
          <>
            <TableContainer>
              <Table sx={{ minWidth: 50 }} size={"small"}>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow
                      sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                      key={`patient_info_row_${index}`}
                    >
                      <TableCell component="th" scope="row">
                        {row.label}
                      </TableCell>
                      <TableCell align="left">
                        <Typography variant="body1" component={"div"}>
                          {row.value}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {this.props.editable && <Divider/>}
            {this._buildIsTestPatientEntry()}
          </>
        )}
      </React.Fragment>
    );
  }

  private _buildIsTestPatientEntry() {
    // @ts-ignore
    const patient = this.context.patient;
    if (!this.props.editable)
      // @ts-ignore
      return patient?.isTest ? (
        <Alert severity="info" sx={{ margin: (theme) => theme.spacing(2, 0) }}>
          This is a test recipient.
        </Alert>
      ) : null;

    return (
      <FormGroup sx={{padding: (theme) => theme.spacing(2)}}>
        <FormControlLabel
          control={
            <Checkbox
              color="primary"
              // @ts-ignore
              checked={(patient?.isTest)}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                // @ts-ignore
                this.context.patient.isTest = event.target.checked;
                if (this.props.onChange) this.props.onChange();
                this.setState({});
              }}
            />
          }
          label="This is a test recipient"
        />
      </FormGroup>
    );
  }

  private _buildFirstNameEntry() {
    // @ts-ignore
    const patient = this.context.patient;
    return this.props.editable ? (
      <TextField
        value={patient.firstName ? patient.firstName : ""}
        placeholder={"First name"}
        size="small"
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          patient.firstName = event.target.value;
          if (this.props.onChange) this.props.onChange();
          this.setState({});
        }}
        fullWidth
      ></TextField>
    ) : (
      <Typography variant={"body1"} component={"div"}>
        {patient.firstName}
      </Typography>
    );
  }

  private _buildLastNameEntry() {
    // @ts-ignore
    const patient = this.context.patient;
    return this.props.editable ? (
      <TextField
        value={patient.lastName ? patient.lastName : ""}
        placeholder={"Last name"}
        size="small"
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          patient.lastName = event.target.value;
          if (this.props.onChange) this.props.onChange();
          this.setState({});
        }}
        fullWidth
      ></TextField>
    ) : (
      <Typography variant={"body1"} component={"div"}>
        {patient.lastName}
      </Typography>
    );
  }

  private _buildDOBEntry() {
    // @ts-ignore
    const patient = this.context.patient;
    return this.props.editable ? (
      <LocalizationProvider dateAdapter={AdapterMoment}>
        <DatePicker
          format="YYYY-MM-DD"
          // @ts-ignore
          value={patient.birthDate ? moment(patient.birthDate) : null}
          onError={(newError) => {
            this.setState({
              DOBDateValidationError: newError,
            });
          }}
          slotProps={{
            textField: {
              size: "small",
              fullWidth: true,
              helperText: this.state.DOBDateValidationError
                ? "invalid entry"
                : null,
              //@ts-ignore
              onChange: (value: moment.Moment, validationContext) => {
                const validationError = validationContext?.validationError;
                if (this.props.onChange) this.props.onChange();
                if (!validationError) {
                  const inputValue = value
                    ? value.toDate().toISOString().slice(0, 10)
                    : null;
                  patient.birthDate = inputValue;
                  this.setState({
                    DOBDateValidationError: null,
                  });
                } else {
                  this.setState({
                    DOBDateValidationError: validationError,
                  });
                }
              },
            },
          }}
          onChange={(newValue: Date | null) => {
            patient.birthDate = newValue?.toISOString()?.slice(0, 10);
            if (this.props.onChange) this.props.onChange();
            this.setState({});
          }}
          disableFuture
        ></DatePicker>
      </LocalizationProvider>
    ) : (
      patient.birthDate
    );
  }

  private _buildGenderEntry() {
    // @ts-ignore
    const patient = this.context.patient;
    if (!this.props.editable) {
      return patient.gender ?? NONE_TEXT;
    }
    // see https://www.hl7.org/fhir/valueset-administrative-gender.html
    const choices = ["male", "female", "other", "unknown"];
    return (
      <FormControl fullWidth>
        <InputLabel></InputLabel>
        <Select
          labelId="input-gender-label"
          id="gender-select"
          label=""
          placeholder="Gender"
          value={patient.gender}
          onChange={(event: SelectChangeEvent) => {
            patient.gender = event.target.value;
            if (this.props.onChange) this.props.onChange();
            this.setState({});
          }}
          inputProps={{
            size: "small",
          }}
          size="small"
        >
          {" "}
          {choices.map((item, index) => {
            return (
              <MenuItem value={item} key={`gender_item_${index}`}>
                {item}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>
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
                  if (this.props.onChange) this.props.onChange();
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
          if (this.props.onChange) this.props.onChange();
          this.setState({});
        }}
        fullWidth
      />
    );
    return this.props.editable
      ? contactInformationEntry
      : patient.smsContactPoint ?? NONE_TEXT;
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
          if (this.props.onChange) this.props.onChange();
          this.setState({});
        }}
        fullWidth
      ></TextField>
    ) : (
      <Typography variant={"body1"} component={"div"}>
        {patient.preferredName ?? NONE_TEXT}
      </Typography>
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
          if (this.props.onChange) this.props.onChange();
          this.setState({});
        }}
        fullWidth
      ></TextField>
    ) : (
      <Typography variant={"body1"} component={"div"}>
        {patient.pronouns ?? NONE_TEXT}
      </Typography>
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
          if (this.props.onChange) this.props.onChange();
          this.setState({});
        }}
        fullWidth
      ></TextField>
    ) : (
      <Typography
        variant={"body1"}
        component={"div"}
        sx={{ whiteSpace: "pre-wrap" }}
      >
        {patient.addressText ?? NONE_TEXT}
      </Typography>
    );
  }

  private _buildEmergencyContactsEntry() {
    // @ts-ignore
    const patient = this.context.patient;
    const emergencyContacts = patient.getEmergencyContacts();
    const Contacts = emergencyContacts?.map((o: any, index: number) => {
      const name = o.name?.text ? (
        <Typography variant="subtitle2" component={"div"} key={`${index}_contact`}>
          {o.name.text}
        </Typography>
      ) : (
        ""
      );
      const detail = o.telecom?.map((t: IContactPoint) => t.value).join(" / ");
      return (
        <Box key={`contact_item_${index}`}>
          <ListItem
            sx={{
              paddingLeft: 0,
            }}
            secondaryAction={
              this.props.editable ? (
                <IconButton
                  edge="end"
                  onClick={() => {
                    patient.removeEmergencyContact(index);
                    if (this.props.onChange) this.props.onChange();
                    this.setState({});
                  }}
                >
                  <ClearIcon />
                </IconButton>
              ) : null
            }
          >
            {this.props.editable && (
              <ListItemAvatar>
                <Avatar></Avatar>
              </ListItemAvatar>
            )}
            <ListItemText primary={name} secondary={detail}></ListItemText>
          </ListItem>
          {patient.contact && index !== patient.contact.length - 1 && (
            <Divider key={`contact_list_divider_${index}`} />
          )}
        </Box>
      );
    });
    if (!this.props.editable) {
      if (!patient.contact) return NONE_TEXT;
      return <>{Contacts}</>;
    }
    return (
      <>
        <List>
          {Contacts}
          {patient.contact?.length > 0 && <Divider></Divider>}
          <ListItem
            alignItems="flex-start"
            sx={{
              marginTop: patient.contact ? 1 : 0,
              paddingLeft: 0,
              paddingRight: 0,
            }}
          >
            <Stack spacing={2} direction={"column"} sx={{ width: "100%" }}>
              <TextField
                value={this.state.contactToAdd?.name}
                label={"Name"}
                InputLabelProps={{
                  shrink: true,
                }}
                margin="dense"
                size="small"
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  if (this.props.onChange) this.props.onChange();
                  this.setState({
                    contactToAdd: {
                      ...this.state.contactToAdd,
                      name: event.target.value,
                    },
                  });
                }}
                fullWidth
              ></TextField>
              <TextField
                value={this.state.contactToAdd?.phoneNumber}
                label={"Phone number"}
                InputLabelProps={{
                  shrink: true,
                }}
                sx={{
                  marginTop: 2,
                }}
                margin="dense"
                size="small"
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  if (this.props.onChange) this.props.onChange();
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
                sx={{
                  marginTop: 2,
                }}
                size="small"
                margin="dense"
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  if (this.props.onChange) this.props.onChange();
                  this.setState({
                    contactToAdd: {
                      ...this.state.contactToAdd,
                      email: event.target.value,
                    },
                  });
                }}
                fullWidth
              ></TextField>
              <Box>
                <Button
                  startIcon={<AddIcon></AddIcon>}
                  size="small"
                  variant="outlined"
                  sx={{ textAlign: "left"}}
                  onClick={() => {
                    patient.addEmergencyContact(
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
              </Box>
            </Stack>
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
          if (this.props.onChange) this.props.onChange();
          this.setState({});
        }}
        fullWidth
      ></TextField>
    ) : (
      patient.userID ?? NONE_TEXT
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
                const validationError = validationContext?.validationError;
                if (this.props.onChange) this.props.onChange();
                if (!validationError) {
                  const inputValue = value
                    ? value.toDate().toISOString().slice(0, 10)
                    : null;
                  patient.studyStartDate = inputValue;
                  this.setState({
                    studyStartDateValidationError: null,
                  });
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
            if (this.props.onChange) this.props.onChange();
            this.setState({});
          }}
          disableFuture
        ></DatePicker>
      </LocalizationProvider>
    ) : (
      patient.studyStartDate ?? NONE_TEXT
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
          if (this.props.onChange) this.props.onChange();
          this.setState({});
        }}
      />
    ) : (
      patient.studyStatus ?? NONE_TEXT
    );
  }

  private handleSetCurrentUserAsGeneralPractitioner() {
    // @ts-ignore
    const currentPractitioner = this.context.practitioner;
    if (!currentPractitioner) return;

    // @ts-ignore
    // only pre-populate primary author for new recipient
    if (this.context.careTeam?.id) return;

    // @ts-ignore
    this.context.patient.generalPractitioner = this.toReferences([
      currentPractitioner,
    ]);
  }

  private handleSetCurrentUserAsCareTeamParticipant() {
    // @ts-ignore
    const currentPractitioner = this.context.practitioner;
    if (!currentPractitioner) return;
    // @ts-ignore
    // only pre-populate care team for new recipient
    if (this.context.careTeam?.id) return;

    const isInCareTeam = // @ts-ignore
      this.context.careTeam?.participant?.find(
        (p: ICareTeam_Participant) =>
          p.member?.reference?.split("/")[1] === currentPractitioner?.id
      );
    if (!isInCareTeam) {
      // @ts-ignore
      this.context.careTeam.participant = [
        // @ts-ignore
        ...(this.context.careTeam?.participant
          ? // @ts-ignore
            this.context.careTeam?.participant
          : []),
        CareTeam.toParticipant(
          "Practitioner",
          currentPractitioner as IPractitioner
        ),
      ];
    }
  }

  private _buildPrimaryAuthorEntry() {
    if (!this.props.editable) {
      if (!this.state.primaryAuthor) return NONE_TEXT;
      else
        return this.getPractitionerLabel(
          this.state.primaryAuthor as IPractitioner
        );
    }
    return (
      <Autocomplete
        size="small"
        value={this.state.primaryAuthor as IPractitioner}
        options={this.state.practitioners}
        getOptionLabel={(option) =>
          this.getPractitionerLabel(option as IPractitioner)
        }
        renderInput={(params) => (
          <TextField {...params} placeholder={"Primary Author"} />
        )}
        onChange={(event: any, value: string | IPractitioner) => {
          // @ts-ignore
          const patient = this.context.patient;

          if (this.props.onChange) this.props.onChange();

          patient.generalPractitioner = value
            ? this.toReferences([value])
            : null;
          const currentPartipants = CareTeam.toParticipants(
            "Practitioner",
            value
              ? (this.state.selectedPractitioners as IPractitioner[])?.filter(
                  (ip) => {
                    return (
                      (ip as IPractitioner)?.id !== (value as IPractitioner)?.id
                    );
                  }
                )
              : (this.state.selectedPractitioners as IPractitioner[])
          );
          // @ts-ignore
          this.context.careTeam.participant = [
            ...(currentPartipants ?? []),
            ...(value
              ? [CareTeam.toParticipant("Practitioner", value as IPractitioner)]
              : []),
          ];
          this.setState({
            primaryAuthor: value ? (value as IPractitioner) : null,
            selectedPractitioners: [
              ...(this.state.selectedPractitioners &&
              this.state.selectedPractitioners.length
                ? this.state.selectedPractitioners.filter(
                    (p) =>
                      (p as IPractitioner)?.id !== (value as IPractitioner)?.id
                  )
                : []),
              ...(value ? [value] : []),
            ],
          });
        }}
      />
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
        NONE_TEXT
      );
    if (!this.props.editable) return selectedPractitionersDisplay;
    return this._buildPractitionerSelector();
  }

  private _buildPractitionerSelector() {
    const generalPractitioner = this.state.primaryAuthor
      ? this.state.primaryAuthor
      : null;
    const defaultSelection: IPractitioner[] = this.state.primaryAuthor
      ? [this.state.primaryAuthor as IPractitioner]
      : [];
    return (
      <>
        <Autocomplete
          multiple
          size="small"
          value={this.state.selectedPractitioners}
          options={this.state.practitioners}
          getOptionDisabled={(option) => {
            return (
              (option as IPractitioner)?.id ===
              (generalPractitioner as IPractitioner)?.id
            );
          }}
          getOptionLabel={(option) =>
            this.getPractitionerLabel(option as IPractitioner)
          }
          renderInput={(params) => (
            <TextField {...params} placeholder={"Users"} />
          )}
          renderTags={(tagValue, getTagProps) =>
            tagValue.map((option, index) => (
              <Chip
                label={this.getPractitionerLabel(option as IPractitioner)}
                {...getTagProps({ index })}
                key={`tag_${index}`}
                disabled={
                  (option as IPractitioner)?.id ===
                  (generalPractitioner as IPractitioner)?.id
                }
              />
            ))
          }
          onChange={(event: any, value: (string | IPractitioner)[]) => {
            if (this.props.onChange) this.props.onChange();
            this.setState({
              selectedPractitioners:
                !value || !value.length ? defaultSelection : value,
              selectAllPractitioners: false,
            });
            if (!value || !value.length) {
              // @ts-ignore
              this.context.careTeam.participant = this.state.primaryAuthor
                ? CareTeam.toParticipants("Practitioner", defaultSelection)
                : null;
              return;
            }
            // @ts-ignore
            this.context.careTeam.participant = CareTeam.toParticipants(
              "Practitioner",
              value.map((p) => p as IPractitioner)
            );
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
                    : this.state.primaryAuthor
                    ? defaultSelection
                    : [],
                });

                // @ts-ignore
                this.context.careTeam.participant = CareTeam.toParticipants(
                  "Practitioner",
                  this.state.practitioners.map((p) => p as IPractitioner)
                );
                if (this.props.onChange) this.props.onChange();
              }}
            />
          }
        />
      </>
    );
  }

  private toReferences = (practitioners: (string | IPractitioner)[]) =>
    practitioners?.map((v) => ({
      type: "Practitioner",
      reference: `Practitioner/${(v as IPractitioner).id}`,
      display: this.getPractitionerLabel(v),
    }));

  private getPractitionerLabel(option: IPractitioner | string) {
    if (!option) return null;
    if (typeof option === "string") return option;
    if (!option.name || !option.name[0])
      return `${option.resourceType}/${option.id}`;
    return `${option.name[0].family}, ${option.name[0].given}`;
  }
}
