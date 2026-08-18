# Pilot testing plan

I cannot do this part. Everything else in this project I could build and
verify myself — real Postgres, a real running server, real HTTP requests,
real cryptographic signing. This one requires an actual phone, in an
actual guard's hand, in actual weather and actual cell coverage. There's
no substitute for it, and I'd be lying if I implied otherwise. What
follows is the checklist I'd want run before trusting this beyond a
one-site pilot.

## Before you start

- Pick one real site, 1-3 guards, one full shift cycle (a week minimum).
- Tell the guards this is a pilot and you want their honest complaints,
  not politeness. The bugs that matter most are the ones a guard shrugs
  off as "the app being weird" instead of reporting.
- Have a fallback plan for the shift if the app fails outright (paper
  checklist, radio check-ins) — don't let a pilot bug leave a post
  actually uncovered.

## Specific things to test, and why each one matters

**Cell coverage dead zones.** Basements, parking structures, stairwells,
and metal-heavy mechanical rooms are exactly where checkpoints tend to
be, and exactly where signal drops. Confirm: does a checkpoint scan
attempted with no signal show a clear error (not a silent failure), and
does it succeed once signal returns? Right now, a scan just fails with a
toast if it can't reach the server — check whether that's actually
visible to a guard mid-round, not just in a quiet office.

**Battery drain over a full shift.** GPS polling every 15 seconds for an
8+ hour shift is real, continuous battery load. Test on the actual phone
models your guards use, not a flagship test device. If it meaningfully
drains a guard's phone by hour 6, that's a real operational problem, not
a minor one.

**Backgrounding behavior.** On iOS Safari (installed as a home-screen
PWA) and Android Chrome, what happens to GPS tracking and the live SSE
connection when a guard locks their phone, or switches to answer a call
mid-shift? Browsers throttle or suspend background JavaScript
differently across platforms — this determines whether the Command
Portal's live map is actually live or shows stale positions after a
guard's phone sleeps.

**Camera/mic permission flows on a real device.** The simulate-capture
fallback exists specifically because sandboxed environments can't test
this — a real phone can, and should. Confirm the permission prompt
appears at a sensible moment (not immediately on page load), and that
denying it once and changing your mind later actually works (varies by
browser).

**The SOS button under stress.** Have a guard press it during a
deliberately busy moment — mid-checkpoint-round, phone half in a pocket —
and time how long it takes for the alert to land on the Command Portal.
This is the one feature where "basically works" isn't good enough.

**Multi-guard conflicts.** Two guards clocking in within the same minute,
two guards scanning the same checkpoint back-to-back, a guard's shift
still open when their replacement clocks in for the same post. None of
these are exotic edge cases in real operations — they're Tuesday.

**A guard who's never used the app before, with zero instructions.**
Hand someone the login screen and watch, silently, for ten minutes. What
they get stuck on is the actual onboarding problem, not what you assume
it'll be.

## What "passed" looks like

Not zero bugs — a full week of real use will surface things. What
matters is: no incident went unrecorded, no guard was left unable to
prove they completed a round, and the SOS button worked every single
time it was tested. Everything else is a backlog item, not a blocker.

## After the pilot

Come back with what broke. I can fix code issues quickly once they're
described concretely ("checkpoint scan silently failed in the basement
stairwell, no error shown" is fixable; "the app was weird sometimes" is
not, until it's narrowed down). What I can't do is discover those issues
myself — that part is now in your hands.
