import {AppPageScaffold} from "./components/AppPage";
import {Stack} from "@mui/material";
import Summary from "./components/Summary";
import ScheduleSetup from "./components/ScheduleSetup";
import {getDefaultMessageSchedule} from "./model/PlanDefinition";
import React from "react";

export const EnrollmentApp = () => <AppPageScaffold title={"Patient enrollment"}>
    <Stack direction={"column"} sx={{padding: 1}}>
        <Summary/>
        <ScheduleSetup planDefinition={getDefaultMessageSchedule()}/>
    </Stack>
</AppPageScaffold>