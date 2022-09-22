import React, {FunctionComponent} from "react";
import DemoVersionBanner from "./DemoVersionBanner";
import {Divider, Typography} from "@mui/material";
import VersionString from "./VersionString";
import AppBanner from "./AppBanner";
import Box from "@mui/material/Box";

const styles = {content: { "padding": "16px" }};

type AppPageScaffoldProps = {
    title?: string | JSX.Element;
    appBarChild?: JSX.Element;
}

type PageTitleProps = {
    title?: string | JSX.Element;
}

export const PageTitle: FunctionComponent<React.PropsWithChildren & PageTitleProps> = (props: React.PropsWithChildren<PageTitleProps>) => {
    return <Box sx={ styles.content }>
        <Typography variant={"h6"} align={"center"} fontWeight={"bolder"}>
            {props.title}
        </Typography>
        <Divider
            sx={{
                "marginTop": '4px',
                "marginBottom": "8px",
                "marginLeft": "80px",
                "marginRight": "80px",
                "height": 2
            }}
            variant={"middle"}/>
        {props.children}
    </Box>;
}

export const AppPageScaffold: FunctionComponent<React.PropsWithChildren & AppPageScaffoldProps> = (props: React.PropsWithChildren<AppPageScaffoldProps>) => {

    function _content() {
        if (props.title) {
            // return title and divider with padding, followed by page content
            return <PageTitle title={props.title}>{props.children}</PageTitle>;
        }
        // return just the page content
        return <Box sx={ styles.content }>
            {props.children}
        </Box>;
    }

    return (
        <div>
            <AppBanner/>
            <DemoVersionBanner/>
            {_content()}
            <VersionString/>
        </div>
    );
}