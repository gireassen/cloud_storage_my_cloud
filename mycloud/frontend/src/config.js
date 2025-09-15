const fromEnv =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_ADMIN_EMAIL) ||
  (typeof process !== "undefined" && process.env && process.env.REACT_APP_ADMIN_EMAIL);

export const ADMIN_EMAIL = fromEnv || "admin@example.com";