import React, {PropsWithChildren} from 'react';
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
import {Card, CardContent, Grid, GridProps} from "@mui/material";
import PatientPROs from "./components/PatientPROs";

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
                                <Grid container>
                                    {/*page header*/}
                                    <GridItem sm={8} md={3} lg={3} xl={3}><Summary/></GridItem>
                                    <GridItem sm={4} md={2} lg={2} xl={1}><PatientPROs/></GridItem>
                                    <GridItem sm={8} md={4} lg={4} xl={5}><PatientNotes/> </GridItem>
                                    <GridItem sm={4} md={3} lg={3} xl={3}>{"Themes and stuff"} </GridItem>

                                    {/*left column*/}
                                    <GridItem xs={12} md={3} lg={3} xl={3}>{"Diagnoses, Care team"} </GridItem>
                                    <GridItem xs={8} md={6} lg={6} xl={6}><MessageView/></GridItem>
                                    <GridItem xs={4} md={3} lg={3} xl={3}>{"Continuation of themes and stuff"}</GridItem>

                                </Grid>
                            </AppPageScaffold>
                        </FhirClientProvider>
                    </LocalizationProvider>
                </ThemeProvider>
            </IntlProvider>
        );
    }
}

const GridItem = ({children, ...rest}: PropsWithChildren & GridProps) =>
    <Grid item {...rest} >
        <Card variant={"outlined"}>
            <CardContent>{children}</CardContent>
        </Card>
    </Grid>
