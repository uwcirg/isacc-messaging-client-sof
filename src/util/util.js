export const getEnv = (key) => {
  if (!process || !process.env) return "";
  return process.env[key];
};

export const queryPatientIdKey = 'launch_queryPatientId';
