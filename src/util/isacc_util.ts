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

export function getUsername(client: Client) {
    let access_token = client.state.tokenResponse.access_token;
    return jwtDecode<any>(access_token)['preferred_username'];
}