import { AppPageScaffold } from "./AppPage";
import { AlertTitle, Grid, GridProps, Paper, Stack, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import Summary from "./Summary";
import PatientNotes from "./PatientNotes";
import MessageView from "./MessagingView";
import React, { PropsWithChildren, useContext } from "react";
import { FhirClientContext } from "../FhirClientContext";
import Alert from "@mui/material/Alert";
import PatientPROs from "./PatientPROs";

export const MessagingApp = () => {
  const context = useContext(FhirClientContext);
  let content;
  if (!context.currentCarePlan) {
    content = (
      <Alert severity="error">
        <AlertTitle>Recipient has no ISACC CarePlan</AlertTitle>
        <Typography variant="body1" component="div"> {
          "Ensure the recipient is enrolled and has a message schedule CarePlan."
        }</Typography>
       
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
        <GridItem xs={12} sm={12} md={3.5} lg={3.5} xl={3}>
          <Stack direction={"column"} spacing={1} sx={{ width: "100%" }}>
            <Item>
              <Summary editable={false} />
            </Item>
          </Stack>
        </GridItem>
        <GridItem xs={12} sm={12} md={6} lg={6} xl={6} className="print-hidden">
          <Item>
            <MessageView />
          </Item>
        </GridItem>
        <GridItem xs={12} sm={12} md={2.5} lg={2.5} xl={3}>
            <Item>
              <Stack direction={"column"} spacing={2}>
                <div className="content">
                  <PatientNotes />
                </div>
                <div className="content">
                  <PatientPROs editable={false}></PatientPROs>
                </div>
              </Stack>
            </Item>
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
  marginBottom: 1
}));

const GridItem = ({ children, ...rest }: PropsWithChildren & GridProps) => (
  <Grid item {...rest} flexGrow={1} display={"flex"}>
    {children}
  </Grid>
);
