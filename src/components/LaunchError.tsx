import * as React from 'react';
import Alert from '@mui/material/Alert';

export default function LaunchError(props: LaunchErrorProps) {
  return (
    <Alert severity="error" variant="filled">{`Error launching! ${props.message}`}</Alert>
    );
}

type LaunchErrorProps = {
  message: string
}
