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
export function dateInPast(dateString) {
  const dateToCompare = new Date(dateString);
  dateToCompare.setSeconds(0);
  dateToCompare.setMilliseconds(0);
  const today = new Date();
  today.setSeconds(0);
  today.setMilliseconds(0);
  return dateToCompare < today;
}

export function isFutureDate(date) {
  const today = new Date();
  if (!(date instanceof Date)) {
    return (new Date(date)) > today;
  }
  return date > today;
}

/*
 * @param objDate of type Date object
 * @returns text display of time ago as string e.g. < 50 seconds, < 1 hour, 1 day 2 hours, 3 hours, 3 days
 */
export function getTimeAgoDisplay(objDate) {
  if (!objDate || isNaN(objDate)) return null;
  const today = new Date();
  const total = today - objDate;
  if (isFutureDate(objDate)) return "";
  const seconds = Math.floor((today - objDate) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (seconds < 5) {
    return "now";
  } else if (seconds < 60) {
    return `< ${seconds} second${seconds > 1 ? "s" : ""}`;
  } else if (minutes < 60) {
    return `< 1 hour`;
  } else if (hours < 24) {
    return `${hours} hour${hours > 1 ? "s" : ""}`.trim();
  } else {
    if (days >= 1) {
      const hoursRemain = Math.floor((total / (1000 * 60 * 60)) % 24);
      return `${days} day${days > 1 ? "s" : ""} ${
        hoursRemain > 0
          ? hoursRemain + " hour" + (hoursRemain > 1 ? "s" : "")
          : ""
      }`.trim();
    }
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  }
}
export const queryPatientIdKey = "launch_queryPatientId";
