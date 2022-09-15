import React from 'react';
import FhirClientProvider from "./FhirClientProvider";
import './style/App.scss';
import {LocalizationProvider} from "@mui/x-date-pickers";
import {AdapterMoment} from '@mui/x-date-pickers/AdapterMoment';
import theme from "./theme";
import {ThemeProvider} from "@mui/styles";
import {EnrollmentApp} from "./components/EnrollmentApp";
import {MessagingApp} from "./components/MessagingApp";
import {fetchEnvData, getEnv} from "./util/util";

fetchEnvData();
const REACT_APP_CLIENT_ID: string = getEnv("REACT_APP_CLIENT_ID");

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


