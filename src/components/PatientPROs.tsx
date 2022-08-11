import React from 'react';
import {FhirClientContext, FhirClientContextType} from '../FhirClientContext';
import {Alert, CircularProgress, Stack, Typography} from "@mui/material";
import Client from "fhirclient/lib/Client";
import {Bundle} from "../model/Bundle";
import Patient from "../model/Patient";
import {ICoding, IObservation} from "@ahryman40k/ts-fhir-types/lib/R4";
import {amber, deepOrange, grey, lightBlue, orange, red} from "@mui/material/colors";
import {CSSAnswerCategories} from "../model/CodeSystem";
import {Observation} from "../model/Observation";

interface PatientPROsProps {

}

type PatientPROsState = {
    error: string;
    mostRecentPhq9: Observation,
    mostRecentCss: Observation
}

function colorForPhq9Obs(observation: Observation) {
    if (!observation || !observation.valueQuantity || !observation.valueQuantity.value) return grey[100];
    if (observation.valueQuantity.value < 5) return lightBlue[100];
    if (observation.valueQuantity.value < 10) return amber[100];
    if (observation.valueQuantity.value < 15) return orange[100];
    if (observation.valueQuantity.value < 20) return deepOrange[100];
    return red[100];
}

function colorForCssObs(value: Observation) {
    let answerCoding = value?.valueCodeableConcept?.coding?.find((value: ICoding) => {
        return CSSAnswerCategories.low.equals(value) || CSSAnswerCategories.medium.equals(value) || CSSAnswerCategories.high.equals(value);
    });
    if (!answerCoding) return grey[100];
    if (CSSAnswerCategories.low.equals(answerCoding)) return lightBlue[100];
    if (CSSAnswerCategories.medium.equals(answerCoding)) return amber[100];
    return red[100];
}

export default class PatientPROs extends React.Component<PatientPROsProps, PatientPROsState> {
    static contextType = FhirClientContext


    constructor(props: Readonly<PatientPROsProps> | PatientPROsProps) {
        super(props);
        this.state = {
            error: '',
            mostRecentPhq9: null,
            mostRecentCss: null,
        }
    }

    componentDidMount() {
        // @ts-ignore
        let context: FhirClientContextType = this.context;

        if (!context || !context.client) {
            console.log("Context not available in componentDidMount!");
            return;
        }

        this.getPROs(context.client, context.patient);
    }

    private async getPROs(client: Client, patient: Patient) {
        let phqRequest = this.getObs(client, patient, "44261-6");
        let cssRequest = this.getObs(client, patient, "93373-9");
        await Promise.all([phqRequest, cssRequest]).then(
            (results) => {
                console.log("Loaded Observations:", results);
                this.setState({
                    mostRecentPhq9: Observation.from(results[0]),
                    mostRecentCss: Observation.from(results[1])
                });
            },
            (reason: any) => {
                console.log("Error", reason);
                this.setState({error: reason});
            }
        ).catch(e => {
            console.log("Error", e);
            this.setState({error: e});
        });
    }

    private getObs(client: Client, patient: Patient, code: string): Promise<IObservation> {
        let params = new URLSearchParams({
            "subject": `${patient.reference}`,
            "code": code,
            "_sort": "-date",
            "_count": "1"
        }).toString();
        return client.request(`/Observation?${params}`).then((bundle: Bundle) => {
            if (bundle.type === "searchset") {
                if (!bundle.entry) return null;

                let obs: IObservation[] = bundle.entry.map((entry) => {
                    if (entry.resource.resourceType !== "Observation") {
                        throw new Error("Unexpected resource type returned");
                    } else {
                        console.log("IObservation loaded:", entry.resource);
                        let obs: IObservation = entry.resource as IObservation;
                        return obs;
                    }
                });
                if (obs.length > 1) throw new Error("More than 1 Observation.ts returned");
                return obs[0];

            } else {
                throw new Error("Unexpected bundle type returned");
            }
        }, (reason: any) => {
            throw new Error(reason.toString());
        });
    }

    render(): React.ReactNode {
        if (!this.state) return <CircularProgress/>;

        if (this.state.error) return <Alert severity={"error"}>{this.state.error}</Alert>;

        if (!this.state.mostRecentPhq9) return <CircularProgress/>

        return <Stack
            direction={"column"}
            alignItems={"center"}
            spacing={2}>
            <LabeledValueBubble
                title={"PHQ-9"}
                value={this.state.mostRecentPhq9?.valueDisplay ?? "No recent value"}
                backgroundColor={colorForPhq9Obs(this.state.mostRecentPhq9)}/>
            <LabeledValueBubble
                title={"CSS"}
                value={this.state.mostRecentCss?.valueDisplay ?? "No recent value"}
                backgroundColor={colorForCssObs(this.state.mostRecentCss)}/>

        </Stack>;
    }


}

const LabeledValueBubble = (props: { title: string, value: string, backgroundColor: string }) => <Stack
    alignItems={"center"}>
    <Typography variant={"body2"} color={"text.secondary"}>
        {props.title}
    </Typography>
    <Typography variant={"h6"} sx={{
        borderRadius: "50px",
        paddingTop: 1,
        marginTop: 0,
        paddingBottom: 1,
        paddingLeft: 2,
        paddingRight: 2,
        color: "#000",
        backgroundColor: props.backgroundColor
    }}>
        {props.value}
    </Typography>
</Stack>;
