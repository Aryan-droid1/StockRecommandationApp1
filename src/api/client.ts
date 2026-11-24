import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() ||
  'https://carton-undaunted-reverse.ngrok-free.dev';

let authToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export interface ApiErrorShape {
  message: string;
  status?: number;
  isNetworkError: boolean;
  raw?: unknown;
}

export class ApiClientError extends Error {
  status?: number;
  isNetworkError: boolean;
  raw?: unknown;

  constructor(details: ApiErrorShape) {
    super(details.message);
    this.name = 'ApiClientError';
    this.status = details.status;
    this.isNetworkError = details.isNetworkError;
    this.raw = details.raw;
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    config.headers.set('ngrok-skip-browser-warning', 'true');
    if (authToken) {
      config.headers.set('Authorization', `Bearer ${authToken}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<Record<string, unknown>>) => {
    const status = error.response?.status;
    const responseData = error.response?.data;

    if (status === 401 && unauthorizedHandler) {
      unauthorizedHandler();
    }

    const isNetworkError = !error.response;
    let message = 'Request failed.';

    if (responseData && typeof responseData === 'object') {
      const serverMsg =
        (typeof responseData.message === 'string' && responseData.message) ||
        (typeof responseData.error === 'string' && responseData.error) ||
        (typeof responseData.detail === 'string' && responseData.detail);
      if (serverMsg) {
        message = serverMsg;
      }
    } else if (isNetworkError) {
      message = `Unable to reach backend at ${API_BASE_URL}. Confirm the Express server is running and CORS is enabled.`;
    } else if (error.message) {
      message = error.message;
    }

    return Promise.reject(
      new ApiClientError({
        message,
        status,
        isNetworkError,
        raw: responseData,
      })
    );
  }
);

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred.';
}
