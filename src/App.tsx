import React from 'react';
import FhirClientProvider from "./FhirClientProvider";
import Summary from './components/Summary';
import './style/App.scss';
import MessageView from "./components/MessageView";
import {LocalizationProvider} from "@mui/x-date-pickers";
import {AdapterMoment} from '@mui/x-date-pickers/AdapterMoment';
import {IntlProvider} from "react-intl";

import messages_de from './l10n/intl_de_DE.json';
import messages_mn from './l10n/intl_mn.json';
import messages_en from './l10n/intl_en.json';
import theme from "./theme";
import {ThemeProvider} from "@mui/styles";
import {AppPageScaffold} from "./components/AppPage";
import PatientNotes from "./components/PatientNotes";

export const intlMessages: any = {
    'en': messages_en,
    'de': messages_de,
    'mn': messages_mn
}

export default class App extends React.Component<any, any> {

    render() {
        const locale = "en";
        return (
            <IntlProvider key={locale} locale={locale} messages={intlMessages[locale]}>
                <ThemeProvider theme={theme}>
                    <LocalizationProvider dateAdapter={AdapterMoment}>
                        <FhirClientProvider>
                            <AppPageScaffold title={"Messages"}>
                                <Summary/>
                                <PatientNotes />
                                <MessageView/>
                            </AppPageScaffold>
                        </FhirClientProvider>
                    </LocalizationProvider>
                </ThemeProvider>
            </IntlProvider>
        );
    }
}
