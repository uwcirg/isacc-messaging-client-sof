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
            <IconButton size="medium" edge="start" color="inherit">
              <Button
                color="inherit"
                variant={"outlined"}
                href={getPatientListURL()}
                title="Back to recipient list"
              >
                <ArrowBackIos />
                <Typography variant="body2" sx={{
                    display: {
                        xs: "none",
                        sm: "inline-block"
                    }
                }}>Back to recipient list</Typography>
              </Button>
            </IconButton>
            <Stack
              sx={{ flexGrow: 1, marginLeft: 1 }}
              direction="row"
              justifyContent="flex-start"
              alignItems="center"
              spacing={2}
            >
              <Typography variant="h3" component="h1">
                ISACC
              </Typography>
              <Box>
                <Typography variant="body2">
                  {patient.fullNameDisplay}
                </Typography>
                <Typography variant="body2">{patient.birthDate}</Typography>
              </Box>
            </Stack>
          </Toolbar>
        </AppBar>
      </Box>
    );
}
