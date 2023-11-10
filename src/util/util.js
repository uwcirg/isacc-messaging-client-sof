export function fetchEnvData() {
    if (window["appConfig"] && Object.keys(window["appConfig"]).length) {
        console.log("Window config variables added. ");
        return;
    }
    const setConfig = function () {
        if (!xhr.readyState === xhr.DONE) {
            return;
        }
        if (xhr.status !== 200) {
            console.log("Request failed! ");
            return;
        }
        var envObj = JSON.parse(xhr.responseText);
        window["appConfig"] = {};
        //assign window process env variables for access by app
        //won't be overridden when Node initializing env variables
        for (var key in envObj) {
            if (!window["appConfig"][key]) {
                window["appConfig"][key] = envObj[key];
            }
        }
    };
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/env.json", false);
    xhr.onreadystatechange = function () {
        //in the event of a communication error (such as the server going down),
        //or error happens when parsing data
        //an exception will be thrown in the onreadystatechange method when accessing the response properties, e.g. status.
        try {
            setConfig();
        } catch (e) {
            console.log("Caught exception " + e);
        }
    };
    try {
        xhr.send();
    } catch (e) {
        console.log("Request failed to send.  Error: ", e);
    }
    xhr.ontimeout = function (e) {
        // XMLHttpRequest timed out.
        console.log("request to fetch env.json file timed out ", e);
    };
}

export function getEnv(key) {
    //window application global variables
    if (window["appConfig"] && window["appConfig"][key])
        return window["appConfig"][key];
    const envDefined = typeof process !== "undefined" && process.env;
    //enviroment variables as defined in Node
    if (envDefined && process.env[key]) return process.env[key];
    return "";
}

export function getEnvs() {
    const appConfig = window["appConfig"] ? window["appConfig"] : {};
    const processEnvs = process.env ? process.env : {};
    return {
        ...appConfig,
        ...processEnvs,
    };
}

/*
 * check is passed dateString is in the past
 * @param dateString in string
 * @return boolean
 */
export function dateInPast (dateString) {
    const dateToCompare = new Date(dateString);
    dateToCompare.setSeconds(0);
    dateToCompare.setMilliseconds(0);
    const today = new Date();
    today.setSeconds(0);
    today.setMilliseconds(0);
    return dateToCompare < today;
}
export const queryPatientIdKey = 'launch_queryPatientId';
