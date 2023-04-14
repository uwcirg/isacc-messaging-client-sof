import React, {useContext} from "react";
import {AppBar, Box, Button, IconButton, Stack, Toolbar, Typography} from "@mui/material";
import {getPatientListURL} from "../util/isacc_util";
import {ArrowBackIos} from "@mui/icons-material";
import { FhirClientContext } from "../FhirClientContext";

export default function AppBanner() {
    const { patient } = useContext(FhirClientContext);
    return (
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="fixed">
          <Toolbar>
            <Stack sx={{ flexGrow: 1 }} direction="row" justifyContent="flex-start" spacing={2}>
              <Typography variant="h4" component="h1">
                ISACC
              </Typography>
              <Box>
                <Typography variant="body2">
                  {patient.fullNameDisplay}
                </Typography>
                <Typography variant="body2">
                  {patient.birthDate}
                </Typography>
              </Box>
            </Stack>
            <IconButton size="large" edge="start" color="inherit">
              <Button
                color="inherit"
                variant={"outlined"}
                href={getPatientListURL()}
              >
                <ArrowBackIos />
                Recipient list
              </Button>
            </IconButton>
          </Toolbar>
        </AppBar>
      </Box>
    );
}
