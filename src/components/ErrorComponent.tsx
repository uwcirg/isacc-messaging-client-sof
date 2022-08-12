import * as React from 'react';
import Alert from '@mui/material/Alert';

export default function ErrorComponent(props: { message: string }) {
    return (
        <Alert severity="error" variant="filled">{`Error launching! ${props.message}`}</Alert>
    );
}

