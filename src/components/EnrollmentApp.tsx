import {AppPageScaffold} from "./AppPage";
import ScheduleSetup from "./ScheduleSetup";
import React from "react";
import {FhirClientContext, FhirClientContextType} from "../FhirClientContext";
import Client from "fhirclient/lib/Client";
import {CommunicationRequest} from "../model/CommunicationRequest";
import {makeCarePlan} from "../model/modelUtil";
import {Button, CircularProgress} from "@mui/material";
import CarePlan from "../model/CarePlan";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import {IsaccMessageCategory} from "../model/CodeSystem";
import {IBundle_Entry, ICommunicationRequest} from "@ahryman40k/ts-fhir-types/lib/R4";
import {getDefaultMessageSchedule} from "../model/PlanDefinition";
import {getUsername} from "../util/isacc_util";
import Patient from "../model/Patient";
import {Bundle} from "../model/Bundle";

type EnrollmenAppState = {
    activeCarePlan: CarePlan;
    editMode: boolean;
    error: string;
}

export default class EnrollmentApp extends React.Component<{}, EnrollmenAppState> {
    static contextType = FhirClientContext;

    constructor(props: {}) {
        super(props);
        this.state = {
            activeCarePlan: null,
            editMode: null,
            error: null
        };
    }

    createNewCarePlan(): CarePlan {
        //@ts-ignore
        let patient: Patient = this.context.patient;
        //@ts-ignore
        let client: Client = this.context.client;

        let planDefinition = getDefaultMessageSchedule();

        let replacements: { [key: string]: number } = {};
        let preferred_username = getUsername(client);
        if (preferred_username) {
            replacements['{userName}'] = preferred_username;
        }

        const messages: CommunicationRequest[] = planDefinition.createMessageList(patient, replacements);
        const carePlan = makeCarePlan(planDefinition, patient, messages);

        return carePlan;
    }

    discontinueExistingCarePlan() {
        // @ts-ignore
        let client: Client = this.context.client;
        //@ts-ignore
        let existingCarePlan: CarePlan = this.context.carePlan;
        //@ts-ignore
        let patient: Patient = this.context.patient;

        let params = new URLSearchParams({
            "recipient": `Patient/${patient.id}`,
            "category": IsaccMessageCategory.isaccScheduledMessage.code,
            "status": "active",
            "based-on": existingCarePlan.reference,
            "_sort": "occurrence",
            "_count": "1000"
        }).toString();

        client.request(`CommunicationRequest?${params}`).then((bundle: Bundle) => {
            if (bundle.type !== "searchset") {
                this.setState({error: `Unexpected bundle type returned: ${bundle.type}`});
                return null;
            }
            if (!bundle.entry) {
                return null;
            }
            let crsToRevoke: CommunicationRequest[] = bundle.entry.map((e: IBundle_Entry) => {
                if (e.resource.resourceType === 'CommunicationRequest') {
                    return CommunicationRequest.from(e.resource as ICommunicationRequest);
                } else {
                    this.setState({error: `Unexpected resource type returned: ${e.resource.resourceType}`});
                    return null;
                }
            })
            crsToRevoke.forEach((cr) => {
                cr.status = "revoked";
                client.update(cr).then(
                    //onfulfilled
                    (value) => console.log(`CommunicationRequest/${cr.id} successfully revoked:`, value),
                    //onrejected
                    (rejectionReason) => console.log(`CommunicationRequest/${cr.id} revocation rejected:`, rejectionReason)
                ).catch(
                    (errorReason) => console.log(`CommunicationRequest/${cr.id} revocation caused error:`, errorReason)
                );
            });

        }).then(() => {
            existingCarePlan.status = "revoked";
            client.update(existingCarePlan).then(
                //onfulfilled
                (value) => console.log(`CarePlan/${existingCarePlan.id} revocation successful:`, value),
                //onrejected
                (rejectionReason) => console.log(`CarePlan/${existingCarePlan.id} revocation rejected:`, rejectionReason)
            ).catch(
                (errorReason) => console.log(`CarePlan/${existingCarePlan.id} revocation caused error:`, errorReason)
            );
        });
    }

    componentWillMount() {
        if (!this.state || !this.context) return;

        //@ts-ignore
        let existingCarePlan: CarePlan = this.context.carePlan;

        //@ts-ignore
        let context: FhirClientContextType = this.context;

        if (this.state.activeCarePlan == null) {
            if (existingCarePlan == null) {
                let cp = this.createNewCarePlan();
                context.carePlan = cp;
                this.setState({activeCarePlan: cp});
            }
        }
    }

    private handleSetEditModeFalse() {
        this.discontinueExistingCarePlan();

        let cp = this.createNewCarePlan();

        //@ts-ignore
        let context: FhirClientContextType = this.context;
        context.carePlan = cp;
        this.setState({activeCarePlan: cp, editMode: false});
    }

    private handleSetEditModeTrue() {
        //@ts-ignore
        let context: FhirClientContextType = this.context;

        let client: Client = context.client;
        let patient: Patient = context.patient;
        let existingCarePlan: CarePlan = context.carePlan;

        //load associated communication requests
        let params = new URLSearchParams({
            "recipient": `Patient/${patient.id}`,
            "based-on": `CarePlan/${existingCarePlan.id}`,
            "category": IsaccMessageCategory.isaccScheduledMessage.code
        }).toString();
        client.request(`CommunicationRequest?${params}`).then((bundle: Bundle) => {
            if (bundle.type === "searchset") {
                if (!bundle.entry) return [];

                let crs: CommunicationRequest[] = bundle.entry.map((e: IBundle_Entry) => {
                    if (e.resource.resourceType !== "CommunicationRequest") {
                        this.setState({error: "Unexpected resource type returned"});
                        return null;
                    } else {
                        console.log("CommunicationRequest loaded:", e);
                        return CommunicationRequest.from(e.resource);
                    }
                })
                existingCarePlan.setCommunicationRequests(crs);
                context.carePlan = existingCarePlan;
                this.setState({activeCarePlan: existingCarePlan, editMode: true});
            } else {
                this.setState({error: "Unexpected bundle type returned"});
                return null;
            }
        })
    }

    render(): React.ReactNode {
        if (!this.state || !this.context) return <CircularProgress/>;

        let view = <CircularProgress/>;
        if (this.state.activeCarePlan != null) {
            view = <ScheduleSetup/>;
        } else if (this.state.editMode == null) {
            view = this.getCarePlanAlreadyExistsView();
        }

        return <AppPageScaffold title={"Patient enrollment"}>
            {view}
        </AppPageScaffold>;
    }

    getCarePlanAlreadyExistsView(): JSX.Element {
        let edit = () => this.handleSetEditModeTrue();
        let createNew = () => this.handleSetEditModeFalse();

        // @ts-ignore
        let existingCarePlan: CarePlan = this.context.carePlan;
        let creationDate = existingCarePlan?.created
        let alertMessage = `The patient already has a CarePlan. Would you like to edit this CarePlan or revoke it and create a new one?`;
        if (creationDate) {
            alertMessage = `The patient already has a CarePlan (created ${new Date(creationDate)}). Would you like to edit this CarePlan or revoke it and create a new one?`;
        }

        return <DialogContent>
            <DialogContentText>{alertMessage}</DialogContentText>
            <DialogActions>
                <Button
                    onClick={edit} autoFocus>Edit</Button>
                <Button
                    onClick={createNew} autoFocus>Revoke and create new</Button>
            </DialogActions>
        </DialogContent>;

    }
}