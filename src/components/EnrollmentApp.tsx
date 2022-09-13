import {AppPageScaffold} from "./AppPage";
import ScheduleSetup from "./ScheduleSetup";
import React from "react";

export const EnrollmentApp = () => <AppPageScaffold title={"Patient enrollment"}>
    <ScheduleSetup/>
</AppPageScaffold>