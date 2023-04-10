import {getEnv} from "./util";
import Client from "fhirclient/lib/Client";
import jwtDecode from 'jwt-decode';

export function birthdaysBetweenDates(programStart: Date, programEnd: Date, birthday: Date): Date[] {
    birthday.setFullYear(programStart.getFullYear());
    if (birthday < programStart) {
        birthday.setFullYear(birthday.getFullYear() + 1);
    }

    let birthdays = [];
    while (birthday < programEnd) {
        birthdays.push(birthday);
        birthday = new Date(birthday);
        birthday.setFullYear(birthday.getFullYear() + 1);
    }
    return birthdays;
}

export function getPatientListURL() {
    return getEnv("REACT_APP_DASHBOARD_URL") + "/clear_session";
}

export function getUserName(client: Client) {
    let access_token = client.state.tokenResponse.access_token;
    let token = jwtDecode<any>(access_token)
    if (token['given_name']) return token['given_name'];
    return token['preferred_username'];
}

export function getUserEmail(client: Client) {
    let access_token = client.state.tokenResponse.access_token;
    let token = jwtDecode<any>(access_token)
    if (token['email']) return token['email'];
    return null;
}