import * as React from 'react';
import {Typography} from "@mui/material";
import Box from "@mui/material/Box";

export default function SizeIndicator() {
    return (
        <Box padding={1}>
            <Typography
                variant={"body2"} align={"right"} color={'text.secondary'}
                sx={{ display: { xs: 'block', sm: 'none' } }}>
                 xs
            </Typography>
            <Typography
                variant={"body2"} align={"right"} color={'text.secondary'}
                sx={{ display: { xs: 'none', sm: 'block', md: 'none' } }}>
                 sm
            </Typography>
            <Typography
                variant={"body2"} align={"right"} color={'text.secondary'}
                sx={{ display: { xs: 'none', md: 'block', lg: 'none' } }}>
                 md
            </Typography>
            <Typography
                variant={"body2"} align={"right"} color={'text.secondary'}
                sx={{ display: { xs: 'none', lg: 'block', xl: 'none' } }}>
                 lg
            </Typography>
            <Typography
                variant={"body2"} align={"right"} color={'text.secondary'}
                sx={{ display: { xs: 'none', xl: 'block' } }}>
                 xl
            </Typography>

        </Box>
    );
}