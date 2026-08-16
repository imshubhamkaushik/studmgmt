// Access tokens are kept only in this module-level variable — never in
// localStorage or sessionStorage. A page reload wipes it, which is the
// point: a short-lived in-memory token gives a successful XSS payload
// nothing persistent to steal. Sessions survive reloads via the HttpOnly
// refresh-token cookie (see AuthProvider's silent-refresh-on-mount) rather
// than by persisting the access token itself.
let currentToken = null;

export function getAccessToken() {
  return currentToken;
}

export function setAccessToken(token) {
  currentToken = token || null;
}
