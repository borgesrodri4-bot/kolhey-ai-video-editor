export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL pointing to the Supabase Google OAuth route
export const getLoginUrl = () => {
  return "/api/auth/login";
};
