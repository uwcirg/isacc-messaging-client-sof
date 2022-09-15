import React from 'react';
import FhirClientProvider from "./FhirClientProvider";
import './style/App.scss';
import {LocalizationProvider} from "@mui/x-date-pickers";
import {AdapterMoment} from '@mui/x-date-pickers/AdapterMoment';
import {EnrollmentApp} from "./components/EnrollmentApp";
import {MessagingApp} from "./components/MessagingApp";
import {fetchEnvData, getEnv} from "./util/util";
import {theme} from "./theme";
import {ThemeProvider} from '@mui/material/styles';

fetchEnvData();
const REACT_APP_CLIENT_ID = getEnv("REACT_APP_CLIENT_ID");

export default class App extends React.Component<any, any> {
    render() {
        return (
            <ThemeProvider theme={theme}>
                <LocalizationProvider dateAdapter={AdapterMoment}>
                    <FhirClientProvider>
                        {
                            REACT_APP_CLIENT_ID === "enrollment" ?
                                <EnrollmentApp/> :
                                <MessagingApp/>
                        }
                    </FhirClientProvider>
                </LocalizationProvider>
            </ThemeProvider>
        );
    }
}


