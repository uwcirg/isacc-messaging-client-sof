import React from "react";
import {Typography} from "@mui/material";
import {getEnv} from "../util/util";
import Box from "@mui/material/Box";

export default function VersionString() {
    const configVersion = getEnv('REACT_APP_VERSION_STRING');
    if (!configVersion) return null;
    return <Box padding={1} className="print-hidden">
        <Typography variant={"body2"} align={"right"} color={'text.secondary'}>
            {`Version: ${configVersion}`}
        </Typography>
    </Box>;
}
