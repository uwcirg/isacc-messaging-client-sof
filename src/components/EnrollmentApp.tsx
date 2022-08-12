import {AppPageScaffold} from "./AppPage";
import {Stack} from "@mui/material";
import Summary from "./Summary";
import ScheduleSetup from "./ScheduleSetup";
import {getDefaultMessageSchedule} from "../model/PlanDefinition";
import React from "react";

export const EnrollmentApp = () => <AppPageScaffold title={"Patient enrollment"}>
    <ScheduleSetup/>
</AppPageScaffold>