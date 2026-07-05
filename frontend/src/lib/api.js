import { addToQueue } from "./offlineSync.js";

const BASE = import.meta.env.VITE_BACKEND_URL || "/api";

// ✅ Try to refresh the access token silently using the httpOnly cookie
async function tryRefreshToken() {
  try {
    const res = await fetch(`${BASE}/auth/refresh-token`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.accessToken || null;
  } catch {
    return null;
  }
}

let isRefreshing = false;
let refreshQueue = [];

async function request(method, path, body) {
  try {
    const headers = {};
    if (body) headers["Content-Type"] = "application/json";
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include", // Important for httpOnly cookies
    });

    // ✅ On 401: try to silently refresh token once, then retry
    if (res.status === 401 && !path.startsWith("/auth")) {
      if (!isRefreshing) {
        isRefreshing = true;
        const newToken = await tryRefreshToken();
        isRefreshing = false;

        if (newToken) {
          localStorage.setItem("accessToken", newToken);
          // Retry the original request with new token
          const retryHeaders = {};
          if (body) retryHeaders["Content-Type"] = "application/json";
          retryHeaders["Authorization"] = `Bearer ${newToken}`;
          const retryRes = await fetch(`${BASE}${path}`, {
            method,
            headers: retryHeaders,
            body: body ? JSON.stringify(body) : undefined,
            credentials: "include",
          });
          if (!retryRes.ok) {
            const err = await retryRes.json().catch(() => ({ error: retryRes.statusText }));
            throw new Error(err.error || retryRes.statusText);
          }
          if (retryRes.status === 204) return null;
          return await retryRes.json();
        } else {
          // Refresh failed — clear session and redirect
          localStorage.removeItem("accessToken");
          sessionStorage.removeItem("unlocked");
          window.location.href = "/";
          return;
        }
      }
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    if (res.status === 204) return null;
    return await res.json();
  } catch (err) {
    // If it's a network error (TypeError: Failed to fetch) and it's a modifying request, queue it
    if ((err instanceof TypeError || err.message === "Failed to fetch") && method !== "GET") {
      console.warn(`Network error detected. Queuing ${method} ${path} for offline sync.`);
      await addToQueue(method, path, body);
      // Return a mock success response so the UI proceeds smoothly
      return { _offline: true, _id: "offline-" + Date.now(), success: true };
    }
    throw err;
  }
}

export const api = {
  get:    (path)       => request("GET",    path),
  post:   (path, body) => request("POST",   path, body),
  patch:  (path, body) => request("PATCH",  path, body),
  delete: (path)       => request("DELETE", path),
};
