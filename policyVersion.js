// Bump this whenever the GPS/photo tracking disclosure text materially
// changes. Guards are then asked to re-accept, and there's a clean audit
// trail (see the `consents` table) of who agreed to which version, when.
// See COMPLIANCE.md for what this disclosure should say and why that
// needs a real legal review, not just this code.
module.exports = { CONSENT_POLICY_VERSION: '2026-08-v1' };
