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
        content = <Grid container direction={"row"} justifyContent={"center"}>
            <GridItemWithCard xs={12} sm={8} md={4} lg={3} xl={3}>
                <Summary/>
            </GridItemWithCard>
            <GridItemWithCard item xs={12} sm={4} md={3} lg={2} xl={1}>
                <PatientPROs/>
            </GridItemWithCard>
            <GridItemWithoutCardContent xs={12} sm={8} md={5} lg={4} xl={5}>
                <PatientNotes/>
            </GridItemWithoutCardContent>
            <GridItemWithCard xs={12} sm={4} md={4} lg={3} xl={3}>
                <DiagnosisAndCareTeam/>
            </GridItemWithCard>
            {/*<GridItemWithCard sm={4} md={3} lg={3} xl={3}>{"Themes and stuff"} </GridItemWithCard>*/}
            {/*left column*/}
            <GridItemWithCard xs={12} md={8} lg={6} xl={6}>
                <MessageView/>
            </GridItemWithCard>
            {/*<GridItemWithCard xs={4} md={3} lg={3} xl={3}>{"Continuation of themes and stuff"}</GridItemWithCard>*/}
        </Grid>
    }
    return <AppPageScaffold title={"Messages"}>
        {content}
    </AppPageScaffold>;
}

const GridItemWithoutCardContent = ({children, ...rest}: PropsWithChildren & GridProps) =>
    <Grid item {...rest} flexGrow={1} display={"flex"}>
        <Card variant={"outlined"} sx={{'flex-grow':"1"}}>
            {children}
        </Card>
    </Grid>

const GridItemWithCard = ({children, ...rest}: PropsWithChildren & GridProps) =>
    <Grid item {...rest} flexGrow={1} display={"flex"}>
        <Card variant={"outlined"} sx={{
            'flex-grow':"1"
        }}>
            <CardContent>{children}</CardContent>
        </Card>
    </Grid>