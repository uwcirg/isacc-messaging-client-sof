import { AppPageScaffold } from "./AppPage";
import { Grid, GridProps, Paper, Stack } from "@mui/material";
import { styled } from "@mui/material/styles";
import Summary from "./Summary";
import PatientPROs from "./PatientPROs";
import PatientNotes from "./PatientNotes";
import MessageView from "./MessagingView";
import React, { PropsWithChildren, useContext } from "react";
import { FhirClientContext } from "../FhirClientContext";
import Alert from "@mui/material/Alert";
import DiagnosisAndCareTeam from "./DiagnosisAndCareTeam";

export const MessagingApp = () => {
  const context = useContext(FhirClientContext);
  let content;
  if (!context.currentCarePlan) {
    content = (
      <Alert severity="error">
        {
          "Recipient has no ISACC CarePlan. Ensure the recipient is enrolled and has a message schedule CarePlan."
        }
      </Alert>
    );
  } else {
    content = (
      <Grid
        container
        direction={"row"}
        justifyContent={"center"}
        rowSpacing={1}
        columnSpacing={1}
      >
        <GridItem xs={12} sm={12} md={3} lg={3} xl={3}>
          <Stack direction={"column"} spacing={1} sx={{ width: "100%" }}>
            <Item>
              <Summary editable={false} />
            </Item>
            <Item>
              <PatientNotes />
            </Item>
          </Stack>
        </GridItem>
        <GridItem xs={12} sm={12} md={6} lg={6} xl={6}>
          <Item>
            <MessageView />
          </Item>
        </GridItem>
        <GridItem xs={12} sm={12} md={3} lg={3} xl={3}>
          <Stack direction={"column"} spacing={1} sx={{ width: "100%" }}>
            <Item>
              <DiagnosisAndCareTeam />
            </Item>
            <Item>
              <PatientPROs />
            </Item>
          </Stack>
        </GridItem>
      </Grid>
    );
  }
  return <AppPageScaffold title={"Messages"}>{content}</AppPageScaffold>;
};

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: "#fff",
  ...theme.typography.body1,
  padding: theme.spacing(2),
  color: theme.palette.text.secondary,
  flexGrow: 1,
  border: "1px solid #ececec",
}));

const GridItem = ({ children, ...rest }: PropsWithChildren & GridProps) => (
  <Grid item {...rest} flexGrow={1} display={"flex"}>
    {children}
  </Grid>
);
