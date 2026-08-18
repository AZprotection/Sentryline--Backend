# Compliance checklist

**This is not legal advice.** I'm an AI, not a lawyer, and employment law
varies by state and country. This document exists so you walk into a
conversation with an actual employment lawyer knowing what to ask about,
not so you can skip that conversation. Budget for it before your first
real employee uses this app — not after.

## What this app collects about employees, and why it matters legally

| Data | Where it's used | Why it needs legal review |
|---|---|---|
| GPS location while clocked in | Live fleet map, checkpoint verification | Many states require advance written notice and/or consent for employer location tracking of employees. A few (e.g., California) have specific statutory requirements. |
| A photo of the guard's face at clock-in | Identity verification | **Biometric data** if any facial-recognition-style matching is ever added (this app currently just stores the photo — it does not run facial recognition). Illinois' BIPA, Texas' CUBI, and Washington's biometric law all impose specific notice, consent, and retention-limit requirements on biometric data specifically, with real financial penalties for getting it wrong. |
| Voice/video attachments on incident reports | Evidence | Some states require notifying people that they're being recorded (two-party consent recording laws), which matters if a guard's incident recording happens to capture a bystander or coworker without them knowing. |
| Timestamped activity logs | Daily activity report | Generally fine, but factors into how long you're required (or allowed) to retain employee monitoring data. |

## What this build already does

- Guards must actively check a box acknowledging GPS and photo tracking before their first clock-in (`consents` table, `/consent/accept` route) — this is the *mechanism* for consent, not proof that the specific disclosure text satisfies your state's requirements.
- The consent disclosure text in `index.html` (search for "Location & photo tracking") is a **placeholder**. Replace it with language your lawyer approves before rolling this out to real employees.
- Consent is versioned (`policyVersion.js`) — if you change the disclosure text later, bump `CONSENT_POLICY_VERSION` and guards will be asked to re-accept, with a timestamped record of who agreed to what.

## What still needs a real lawyer, specifically

1. **Review and rewrite the consent disclosure text** for your state(s) of operation. A generic disclosure is not the same as one that satisfies a specific state's notice requirements.
2. **Confirm whether GPS tracking requires advance written notice**, not just in-app consent, in every state you operate in — some jurisdictions require notice before deployment, not just a checkbox at first login.
3. **Set a data retention policy** — how long you keep location history, photos, and incident recordings — and add the deletion logic to match it. This app currently keeps everything indefinitely, which is very likely wrong for at least one of your states' laws.
4. **Confirm biometric-law applicability.** As shipped, this app stores a photo but does not run facial recognition against it. If you ever add face-matching (e.g., automated identity verification instead of a supervisor eyeballing the photo), that almost certainly triggers biometric-specific law and a materially different compliance bar.
5. **Two-party recording consent** if incident voice/video attachments could capture other people, not just the reporting guard.
6. **Multi-state operation** — if guards work across state lines, you need the strictest applicable state's rules to apply everywhere, not a patchwork.
7. **Data breach notification obligations** — if this data is ever exposed, most states require notifying affected employees within a specific timeframe. Know that timeframe before you need it.

## A reasonable order of operations

Don't block your pilot on this — a 1-3 guard pilot at one site, with guards
who are informed and comfortable, is a reasonable way to validate the
product while you get the legal review done in parallel. Do block wider
rollout on it. The consent mechanism above gives your lawyer something
concrete to review rather than starting from a blank page.
