import axios from "axios";

export function api(token) {
  const instance = axios.create({
    baseURL: "/api",
  });
  if (token) {
    instance.interceptors.request.use((config) => {
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }
  return instance;
}
