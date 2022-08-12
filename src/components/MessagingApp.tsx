import {AppPageScaffold} from "./AppPage";
import {Card, CardContent, Grid, GridProps} from "@mui/material";
import Summary from "./Summary";
import PatientPROs from "./PatientPROs";
import PatientNotes from "./PatientNotes";
import MessageView from "./MessagingView";
import React, {PropsWithChildren, useContext} from "react";
import {FhirClientContext} from "../FhirClientContext";
import ErrorComponent from "./ErrorComponent";
import Alert from "@mui/material/Alert";

export const MessagingApp = () => {
    const context = useContext(FhirClientContext);
    let content;
    if (!context.carePlan) {
        content = <Alert severity="error">{"Patient has no ISACC CarePlan. Ensure the patient is enrolled and has a message schedule CarePlan."}</Alert>;
    } else {
        content = <Grid container>
            {/*page header*/}
            <GridItem sm={8} md={3} lg={3} xl={3}><Summary/></GridItem>
            <GridItem sm={4} md={2} lg={2} xl={1}><PatientPROs/></GridItem>
            <Grid item sm={8} md={4} lg={4} xl={5}><PatientNotes/> </Grid>
            <GridItem sm={4} md={3} lg={3} xl={3}>{"Themes and stuff"} </GridItem>

            {/*left column*/}
            <GridItem xs={12} md={3} lg={3} xl={3}>{"Diagnoses, Care team"} </GridItem>
            <GridItem xs={8} md={6} lg={6} xl={6}><MessageView/></GridItem>
            <GridItem xs={4} md={3} lg={3} xl={3}>{"Continuation of themes and stuff"}</GridItem>

        </Grid>
    }
    return <AppPageScaffold title={"Messages"}>
        {content}
    </AppPageScaffold>;
}

const GridItem = ({children, ...rest}: PropsWithChildren & GridProps) =>
    <Grid item {...rest} >
        <Card variant={"outlined"}>
            <CardContent>{children}</CardContent>
        </Card>
    </Grid>