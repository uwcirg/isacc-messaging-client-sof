import React from "react";
import AppConfig from "../AppConfig";
import {Box, Typography} from "@mui/material";
import {amber} from "@mui/material/colors";

export default function DemoVersionBanner() {
    return <Box bgcolor={amber[100]}>
        <Typography variant={"body2"} align={"center"}>
            {`This is a ${AppConfig.deploymentType} system - not for real data.`}
        </Typography>
    </Box>;
}
