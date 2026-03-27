export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL || window.location.origin;
  const appId = import.meta.env.VITE_APP_ID || "";
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  // If no OAuth portal URL is configured, use the current origin as fallback
  const baseUrl = oauthPortalUrl.startsWith("http") ? oauthPortalUrl : window.location.origin;

  try {
    const url = new URL(`${baseUrl}/app-auth`);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");
    return url.toString();
  } catch {
    // Fallback: return a simple auth URL using current origin
    return `/api/oauth/login?redirectUri=${encodeURIComponent(redirectUri)}`;
  }
};
