import {createTheme} from "@mui/material/styles";
import {lightBlue} from "@mui/material/colors";


export default createTheme({
  palette: {
    primary: {
      main: lightBlue[400],
      contrastText: "#fff"
    },
    secondary: {
      main: "#D1C4E9"
    },
    divider: "rgba(0,0,0,0.12)"
  },
  typography: {
    button: {
      color: "#2b4162",
      textTransform: "none",
      fontWeight: "bold"
    },
    h6: {
      "line-height": 1.2
    },
    subtitle1: {
      "line-height": 1.2
    },
    caption: {
      color: "rgba(0,0,0,0.54)"
    },
    body1: {
      "line-height": 1.2
    }
  }
});