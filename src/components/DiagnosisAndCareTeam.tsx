import * as React from "react";
import {FhirClientContext, FhirClientContextType} from "../FhirClientContext";
import {Bundle} from "../model/Bundle";
import {Condition} from "../model/Condition";
import {Stack, Typography} from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
import {ICareTeam, ICareTeam_Participant} from "@ahryman40k/ts-fhir-types/lib/R4";


export default class DiagnosisAndCareTeam extends React.Component<{}, {
    conditions: Condition[],
    careTeam: ICareTeam,
    ready: boolean
}> {
    static contextType = FhirClientContext;

    componentDidMount() {
        // @ts-ignore
        let context: FhirClientContextType = this.context;

        Promise.all([
            this.loadDiagnoses(context),
            this.loadCareTeam(context)
        ]).then(() => this.setState({ready: true}));
    }

    private loadDiagnoses(context: FhirClientContextType) {
        let params = new URLSearchParams({
            "subject": `Patient/${context.patient.id}`,
            "clinical-status:not": "resolved",
            "_sort": "-onset-date"
        });
        params.append("clinical-status:not", "inactive");

        return context.client.request(`Condition?${params.toString()}`).then(
            (bundle: Bundle) => {
                if (!bundle || !bundle.entry || bundle.entry.length === 0) {
                    console.log("No Conditions found");
                } else {
                    let conditions = bundle.entry.map((e) => Condition.from(e.resource));
                    if (!conditions) conditions = [];
                    this.setState({conditions: conditions})
                }
            },
            (reason: any) => {
                console.log("Error fetching Conditions", reason);
            }
        ).catch((error: any) => {
            console.log("Error fetching Conditions", error);
        });
    }

    private loadCareTeam(context: FhirClientContextType) {
        let params = new URLSearchParams({
            "subject": `Patient/${context.patient.id}`,
            "status": "active",
            "_sort": "-_lastUpdated",
            "_count": "1"
        });

        return context.client.request(`CareTeam?${params.toString()}`).then(
            (bundle: Bundle) => {
                if (!bundle || !bundle.entry || bundle.entry.length === 0) {
                    console.log("No CareTeam found");
                } else {
                    let careTeam = bundle.entry[0].resource as ICareTeam;
                    this.setState({careTeam: careTeam})
                }
            },
            (reason: any) => {
                console.log("Error fetching CareTeam", reason);
            }
        ).catch((error: any) => {
            console.log("Error fetching CareTeam", error);
        });
    }

    render() {
        if (!this.state || !this.state.ready) return <CircularProgress/>;

        let infoRows = this.state.conditions?.map((condition: Condition) => {
            return {
                title: condition.code.coding[0].display,
                info: [
                    {label: "Onset", value: new Date(condition.onsetDateTime)?.toLocaleDateString()},
                    {label: "Status", value: condition.clinicalStatus.coding[0].code}
                ]
            };
        });

        let careteamRows = this.state.careTeam?.participant?.map((participant: ICareTeam_Participant) => {
            return {
                title: participant.member.display,
                info: [
                    {label: "Role", value: participant.role[0].coding[0].display}
                ]
            }
        });

        if (!infoRows && !careteamRows) {
            return <>
                <Typography variant={"h6"}>Recipient info</Typography>
                <Typography variant={"caption"}>{"No diagnosis or care team information on file"}</Typography>
            </>;
        }

        return <>
            <Typography variant={"h6"}>Diagnoses</Typography>
            {!infoRows ?
                <Typography variant={"caption"}>{"No diagnoses on file"}</Typography> :
                infoRows.map((row) => <DisplayRow item={row}/>)}
            <Typography variant={"h6"}>Care team</Typography>
            {!careteamRows ?
                <Typography variant={"caption"}>{"No care team information on file"}</Typography> :
                careteamRows.map((row) => <DisplayRow item={row}/>)}
        </>

    }
}

const DisplayRow = ({item}: { item: DisplayItem }) => <>
    <Typography variant={"body1"}>{item.title}</Typography>
    {
        item.info.map((infoItem, index) => {
            return <Stack direction={"row"} alignItems={"flex-end"} spacing={0.5} key={`infoItem_${index}`}>
                <Typography variant={"caption"}>{`${infoItem.label}: `}</Typography>
                <Typography variant={"body2"}>{`${infoItem.value}`}</Typography>
            </Stack>;
        })
    }
</>;

type DisplayItem = {
    title: string,
    info: { label: string, value: string }[]
}