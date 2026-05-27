import axios from "axios";
import { Platform } from "react-native";
import Constants from "expo-constants";

function getDevHost() {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.manifest2?.extra?.expoClient?.hostUri ??
    Constants.manifest?.debuggerHost;

  if (!hostUri) return null;
  return hostUri.split(":")[0];
}

function getApiBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, "");
  }

  if (Platform.OS === "web") {
    return "http://localhost:5000/api";
  }

  if (Platform.OS === "android") {
    const devHost = getDevHost();
    if (devHost) return `http://${devHost}:5000/api`;
    return "http://10.0.2.2:5000/api";
  }

  const devHost = getDevHost();
  if (devHost) return `http://${devHost}:5000/api`;

  return "http://localhost:5000/api";
}

export function getUploadsBaseUrl() {
  return getApiBaseUrl().replace(/\/api$/, "");
}

const API = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
});

export { getApiBaseUrl };
export default API;
