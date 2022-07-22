import React from "react";
import {FormattedMessage} from "react-intl";
import AppConfig from "../AppConfig";
import {Box, Typography} from "@mui/material";
import {amber} from "@mui/material/colors";

export default function DemoVersionBanner() {
    return <Box bgcolor={amber[100]}>
        <Typography variant={"body2"} align={"center"}>
            <FormattedMessage id={'demoVersionBannerText'}
                              values={{deploymentType: AppConfig.deploymentType}}/>
        </Typography>
    </Box>;
}
