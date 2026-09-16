import Axios, { type AxiosRequestConfig } from "axios";

export const AXIOS_INSTANCE = Axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { "Content-Type": "application/json" },
});

AXIOS_INSTANCE.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

AXIOS_INSTANCE.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/auth";
    }
    return Promise.reject(error);
  }
);

export const customInstance = <T>(
  configOrUrl: AxiosRequestConfig | string,
  options?: AxiosRequestConfig
): Promise<T> => {
  let mergedConfig: any;

  if (typeof configOrUrl === "string") {
    mergedConfig = { url: configOrUrl, ...options };
  } else {
    mergedConfig = { ...configOrUrl, ...options };
  }

  // TRANSLATE FETCH TO AXIOS
  if (mergedConfig.body) {
    mergedConfig.data =
      typeof mergedConfig.body === "string"
        ? JSON.parse(mergedConfig.body)
        : mergedConfig.body;

    delete mergedConfig.body;
  }

  return AXIOS_INSTANCE(mergedConfig).then(({ data }) => data);
};
