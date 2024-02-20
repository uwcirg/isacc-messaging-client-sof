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

export function getDashboardURL() {
  return getEnv("REACT_APP_DASHBOARD_URL");
}

export function getPatientListURL() {
  return getDashboardURL() + "/clear_session";
}

type ClientType = "ENROLLMENT" | "MESSAGING";
export function getClientAppURL(clientId: ClientType, patientId: string) {
  //client id is either MESSAGING or ENROLLMENT
  return getDashboardURL() + `/target?sof_client_id=${clientId}&patient=${patientId}`;
}

export function getAccessToken(client: Client) {
  if (!client || !client.state || !client.state.tokenResponse) return null;
  let access_token = client.state.tokenResponse.access_token;
  if (!access_token) return null;
  return jwtDecode<any>(access_token);
}

export function getUserName(client: Client) {
    const token = getAccessToken(client);
    if (!token) return null;
    if (token['given_name']) return token['given_name'];
    return token['preferred_username'];
}

export function getUserEmail(client: Client) {
    const token = getAccessToken(client);
    if (!token) return null;
    if (token['email']) return token['email'];
    return null;
}

export function getFhirData(client: Client, url: string, signal: AbortSignal = null) {
  return client?.request({
    url: url,
    headers: {
      "Cache-Control": "no-cache",
    },
  });
}