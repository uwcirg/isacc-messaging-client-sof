import React from "react";
import {Box, Typography} from "@mui/material";

export default function AppBanner() {
    return <Box bgcolor={'primary.main'}>
        <Typography variant={"h5"} padding={1} color={'#fff'} align={'center'}>
            Informatics-Supported Authorship of Caring Contacts (ISACC)
        </Typography>
    </Box>;
}
