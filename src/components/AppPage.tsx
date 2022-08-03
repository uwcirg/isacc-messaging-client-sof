import React, {FunctionComponent} from "react";
import DemoVersionBanner from "./DemoVersionBanner";
import {makeStyles} from "@mui/styles";
import {Divider, Theme, Typography} from "@mui/material";

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    width: '100%'
  },
  content: {
    "padding-top": 16,
    "padding-left": 16,
    "padding-right": 16
  },
  divider: {
    "margin-top": 4,
    "margin-bottom": 8,
    "margin-left": 80,
    "margin-right": 80,
    "height":2
  },
  pageTitle: {
    fontWeight: "bolder"
  }
}));

type AppPageScaffoldProps = {
  title?: string | JSX.Element;
  appBarChild?: JSX.Element;
}

type PageTitleProps = {
  title? : string | JSX.Element;
}

export const PageTitle: FunctionComponent<React.PropsWithChildren & PageTitleProps> = (props: React.PropsWithChildren<PageTitleProps>) => {
  const classes = useStyles();
  return <div className={classes.content}>
    <Typography variant={"h6"} align={"center"} className={classes.pageTitle}>
      {props.title}
    </Typography>
    <Divider className={classes.divider} variant={"middle"} />
    {props.children}
  </div>;
}

export const AppPageScaffold: FunctionComponent<React.PropsWithChildren & AppPageScaffoldProps> = (props: React.PropsWithChildren<AppPageScaffoldProps>) => {
  const classes = useStyles();

  function _content() {
    if (props.title) {
      // return title and divider with padding, followed by page content
      return <PageTitle title={props.title}>{props.children}</PageTitle>;
    }
    // return just the page content
    return <div className={classes.content}>
      {props.children}
    </div>;
  }

  return (
      <div>
        <DemoVersionBanner/>
        {_content()}
      </div>
  );
}