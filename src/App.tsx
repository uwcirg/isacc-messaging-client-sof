import React from 'react';
import FhirClientProvider from "./FhirClientProvider";
import Summary from './components/Summary';
import './style/App.scss';
import ScheduleSetup from "./components/ScheduleSetup";
import {getDefaultMessageSchedule} from "./model/PlanDefinition";
import {LocalizationProvider} from "@mui/lab";
import {AdapterMoment} from '@mui/x-date-pickers/AdapterMoment';

export default class App extends React.Component<any, any> {


    render() {
        return (
            <LocalizationProvider dateAdapter={AdapterMoment}>
                <FhirClientProvider>
                    <Summary/>
                    <ScheduleSetup planDefinition={getDefaultMessageSchedule()}/>
                </FhirClientProvider>
            </LocalizationProvider>
        );
    }
}
