import React from "react";
import {AppBar, Box, Button, IconButton, Toolbar, Typography} from "@mui/material";
import {getPatientListURL} from "../util/isacc_util";
import {ArrowBackIos} from "@mui/icons-material";

export default function AppBanner() {
    return  <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
            <Toolbar>
                <IconButton
                    size="large"
                    edge="start"
                    color="inherit"
                    sx={{ mr: 2 }}
                >
                    <Button
                        color='inherit'
                        variant={'outlined'}
                        href={getPatientListURL()}><ArrowBackIos/>
                        Back to recipient list
                    </Button>
                </IconButton>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    ISACC
                </Typography>
            </Toolbar>
        </AppBar>
    </Box>;
}
