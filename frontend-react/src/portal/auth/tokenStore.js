// Deliberately separate from ../auth/tokenStore.js — a staff member and a
// portal user (student/guardian) could be signed in simultaneously in the
// same browser (different tabs, different cookie paths), and mixing their
// tokens in one module-level variable would let one silently clobber the
// other's session.
let currentToken = null;

export function getPortalAccessToken() {
  return currentToken;
}

export function setPortalAccessToken(token) {
  currentToken = token || null;
}
