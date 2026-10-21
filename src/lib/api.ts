let csrfTokenPromise: Promise<string> | null = null;

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

async function getCsrfToken() {
  if (!csrfTokenPromise) {
    csrfTokenPromise = fetch("/api/csrf", {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to initialize CSRF protection.");
        }
        const data = await response.json();
        if (typeof data.csrfToken !== "string") {
          throw new Error("Invalid CSRF response.");
        }
        return data.csrfToken;
      })
      .catch((error) => {
        csrfTokenPromise = null;
        throw error;
      });
  }

  return csrfTokenPromise;
}

export async function secureFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers);

  if (MUTATING_METHODS.has(method)) {
    headers.set("x-csrf-token", await getCsrfToken());
  }

  const doFetch = async () => {
    return fetch(input, {
      ...init,
      method,
      headers,
      credentials: "same-origin",
    });
  };

  let response: Response;
  try {
    response = await doFetch();
  } catch (netErr) {
    // Retry once after 600ms on transient connection failure (e.g. server restart)
    await new Promise((r) => setTimeout(r, 600));
    response = await doFetch();
  }

  // If 403 returned on mutating method (e.g. expired or invalid CSRF session), refresh token and retry once
  if (response.status === 403 && MUTATING_METHODS.has(method)) {
    csrfTokenPromise = null;
    try {
      const freshToken = await getCsrfToken();
      headers.set("x-csrf-token", freshToken);
      response = await doFetch();
    } catch {
      // Return original response if refresh fails
    }
  }

  return response;
}
