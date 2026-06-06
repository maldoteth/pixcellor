## Goal

Turn `/me` (CandidatePortal) into a unified portal that serves two audiences from the same place, with the calendar styled exactly like the admin `ShiftPlannerGrid`:

- **Candidates** (logged in by candidate email) — see only vacancies they've been assigned/confirmed for, with confirm/cancel actions per shift.
- **Clients** (logged in by an email that matches `contacts.email` OR any `contact_persons.email`) — see all vacancies whose `client_contact_id` belongs to their company, with the same admin-style grid (open slots, assigned candidates, shift dates) read-only plus a "Re-invite" action.

A logged-in user can be both at once — both groups of vacancies show up in their own tabs.

## UI

Tabs on `/me`:
1. **Schedule** — the new ShiftPlannerGrid-style calendar (rows = openings, columns = days), filtered to the user's vacancies.
2. **My Jobs** (candidates) — list of vacancies they're assigned/invited to, with Confirm/Decline buttons for pending invitations.
3. **Vacancies** (clients only) — list of their company's open vacancies and assigned candidates, mirroring admin `VacanciesPanel` read-only.
4. **Documents** — existing `KycDocuments` (candidates only).

Tabs appear conditionally: a pure candidate sees Schedule + My Jobs + Documents; a pure client sees Schedule + Vacancies; a person who is both sees all four.

## Data access (RPCs)

New SECURITY DEFINER RPCs in DB, all keyed on `auth.uid()` → email:

- `portal_my_vacancy_ids()` → returns `{ as_candidate uuid[], as_client uuid[] }` by matching the auth email against candidates.email, contacts.email, contact_persons.email.
- `portal_my_shifts(_from date, _to date)` → vacancy_shifts rows for those vacancy_ids, with vacancy meta (title, client name, slot_index).
- `portal_my_vacancies()` → vacancies + assignments + open slot counts, scoped to the two id lists.
- `candidate_confirm_invitation(_invitation_id)` / `candidate_decline_invitation(_invitation_id)` — same as the public token flow but auth'd.

The first-accept-wins rule (per whole vacancy) is enforced inside the existing `vacancy_invitation_respond` DB function: on confirm, set this invitation to `confirmed` AND mark all other `sent` invitations for the same vacancy as `expired` ("position filled"); set the vacancy `status = 'filled'`. Wrapped in a transaction with `SELECT ... FOR UPDATE` on the vacancy row.

## Invitations & email

- Existing `send-vacancy-invitations` edge function already sends `vacancy-invitation` template with confirm/decline tokens. Leave it as-is.
- Existing `vacancy-respond` edge function already calls `vacancy_invitation_respond`. We update the SQL function to enforce first-wins and broadcast "filled" emails to losers via a new `vacancy-position-filled` template.
- A new in-portal "Confirm" button calls `candidate_confirm_invitation` which internally runs the same RPC, then triggers the `vacancy-confirmed` email to the winner.

## Client auth

No new role. Same magic-link flow as candidates (`signInWithOtp` to `/me`). On portal load, `portal_my_vacancy_ids()` decides what they see based on which tables their email matches. Nothing to configure per user.

## Files

New / edited:
- `src/pages/CandidatePortal.tsx` — replace month grid with tabs + new components.
- `src/components/portal/PortalScheduleGrid.tsx` — new, reuses the visual structure of `ShiftPlannerGrid` but read-mostly and driven by `portal_my_shifts`.
- `src/components/portal/PortalMyJobs.tsx` — invitations + assignments list with Confirm/Decline.
- `src/components/portal/PortalClientVacancies.tsx` — client read-only vacancies list.
- New migration: RPCs above + update `vacancy_invitation_respond` + add `expired_reason` text col on `vacancy_invitations` (optional, for "position filled").
- New email template `vacancy-position-filled.tsx` + registry entry.
- `supabase/functions/vacancy-respond/index.ts` — after confirm, fetch losers and queue position-filled emails.

## Out of scope (this round)

- Client login link button on a separate page — they use the same `/me` magic link flow.
- Editing shifts as a client (read-only this round).
- Per-slot race rule (you chose per-whole-vacancy).

Approve and I'll build it.