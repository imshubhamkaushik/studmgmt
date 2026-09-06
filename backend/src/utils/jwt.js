// Re-exports the canonical implementation in shared/jwt.mjs — see that
// file for why this isn't defined here directly.
export { signAccessToken, verifyAccessToken } from "../../../shared/jwt.mjs";
