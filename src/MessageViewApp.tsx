import {AppPageScaffold} from "./components/AppPage";
import {Card, CardContent, Grid, GridProps} from "@mui/material";
import Summary from "./components/Summary";
import PatientPROs from "./components/PatientPROs";
import PatientNotes from "./components/PatientNotes";
import MessageView from "./components/MessageView";
import React, {PropsWithChildren} from "react";

export const MessageViewApp = () => <AppPageScaffold title={"Messages"}>
    <Grid container>
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
</AppPageScaffold>

const GridItem = ({children, ...rest}: PropsWithChildren & GridProps) =>
    <Grid item {...rest} >
        <Card variant={"outlined"}>
            <CardContent>{children}</CardContent>
        </Card>
    </Grid>