import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login") &&
      !window.location.pathname.startsWith("/signup")
    ) {
      localStorage.removeItem("token");
      localStorage.setItem("session_expired", "1");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(err: unknown): string {
  if (!axios.isAxiosError(err)) {
    return "An unexpected error occurred. Please try again.";
  }
  if (!err.response) {
    return "Connection error. Check your internet and try again.";
  }
  const detail = err.response.data?.detail;
  if (typeof detail === "object" && detail?.message) {
    const msg = detail.message as string;
    if (detail.error === "ocr_failed") return "Could not read handwriting. Please upload a clearer image.";
    if (detail.error === "grading_failed") return "Grading failed. Please try again.";
    return msg;
  }
  if (typeof detail === "string") return detail;
  if (err.response.status === 413) return "Image upload failed. Check file format and size.";
  if (err.response.status >= 500) return "Something went wrong on the server. Please try again.";
  return "An error occurred. Please try again.";
}

export default apiClient;
