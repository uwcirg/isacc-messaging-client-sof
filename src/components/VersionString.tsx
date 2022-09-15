import React from "react";
import {Typography} from "@mui/material";
import {getEnv} from "../util/util";
import Box from "@mui/material/Box";

export default function VersionString() {
    return <Box padding={1}>
        <Typography variant={"body2"} align={"right"} color={'text.secondary'}>
            {`Version: ${getEnv('REACT_APP_VERSION_STRING')}`}
        </Typography>
    </Box>;
}
