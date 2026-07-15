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

  const response = await fetch(input, {
    ...init,
    method,
    headers,
    credentials: "same-origin",
  });

  if (response.status === 403 && MUTATING_METHODS.has(method)) {
    csrfTokenPromise = null;
  }

  return response;
}
