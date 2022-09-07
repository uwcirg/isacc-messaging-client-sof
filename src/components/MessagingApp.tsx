import {AppPageScaffold} from "./AppPage";
import {Card, CardContent, Grid, GridProps} from "@mui/material";
import Summary from "./Summary";
import PatientPROs from "./PatientPROs";
import PatientNotes from "./PatientNotes";
import MessageView from "./MessagingView";
import React, {PropsWithChildren, useContext} from "react";
import {FhirClientContext} from "../FhirClientContext";
import Alert from "@mui/material/Alert";
import DiagnosisAndCareTeam from "./DiagnosisAndCareTeam";

export const MessagingApp = () => {
    const context = useContext(FhirClientContext);
    let content;
    if (!context.carePlan) {
        content = <Alert
            severity="error">{"Patient has no ISACC CarePlan. Ensure the patient is enrolled and has a message schedule CarePlan."}</Alert>;
    } else {
        content = <Grid container direction="column"
                        alignItems="stretch" display={"flex"} flexGrow={1}>
            {/*page header*/}
            <Grid container direction={"row"} alignItems={"stretch"}>
                <GridItem xs={12} sm={8} md={3} lg={3} xl={3}><Summary/></GridItem>
                <Grid item xs={12} sm={4} md={2} lg={2} xl={1}><PatientPROs/></Grid>
                <Grid item xs={12} sm={8} md={4} lg={4} xl={5} display={"flex"} direction={"row"}><PatientNotes/> </Grid>
                <GridItem xs={12} sm={4} md={3} lg={3} xl={3}><DiagnosisAndCareTeam/> </GridItem>
                {/*<GridItem sm={4} md={3} lg={3} xl={3}>{"Themes and stuff"} </GridItem>*/}
            </Grid>
            <Grid container direction={"row"} alignItems={"stretch"}>
                {/*left column*/}
                <Grid item xs={12} md={3} lg={3} xl={3}> </Grid>
                <GridItem xs={12} md={6} lg={6} xl={6}><MessageView/></GridItem>
                {/*<GridItem xs={4} md={3} lg={3} xl={3}>{"Continuation of themes and stuff"}</GridItem>*/}
            </Grid>
        </Grid>
    }
    return <AppPageScaffold title={"Messages"}>
        {content}
    </AppPageScaffold>;
}

const GridItem = ({children, ...rest}: PropsWithChildren & GridProps) =>
    <Grid item {...rest} display={"flex"} direction={"row"}>
        <Card variant={"outlined"}>
            <CardContent>{children}</CardContent>
        </Card>
    </Grid>