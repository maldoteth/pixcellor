## Goal
For every vacancy, surface filterable AI-ranked candidate recommendations (top 10–100), let admins one-click email selected candidates with a confirm-attendance link, and have the system auto-assign + email a confirmation when the candidate clicks "Confirm".

## 1. Database
New migration:
- `vacancy_invitations` table: `id`, `vacancy_id`, `candidate_id`, `token` (unique, random 32-byte), `status` enum (`sent`/`confirmed`/`declined`/`expired`), `sent_at`, `responded_at`, `sent_by_user_id`, `sent_by_email`. RLS admin-only + GRANTs. `service_role` full access (edge function reads token publicly via SECURITY DEFINER RPC).
- RPC `vacancy_invitation_respond(_token, _response)` SECURITY DEFINER: validates token, marks `confirmed`/`declined`, on confirm inserts/updates `vacancy_assignments` (stage `confirmed`) and enqueues confirmation email. Public-callable (no admin check).
- RPC `portal_rank_candidates_for_vacancy(_vacancy_id, _limit)` SECURITY DEFINER: returns candidates scored by skill overlap, location match, work-type/arrangement match, availability, right-to-work — same shape as existing `portal_match_candidates_for_contact`. Used as the baseline; AI re-ranks on top.

## 2. Edge functions
- `rank-vacancy-candidates` (new): admin-only. Loads vacancy + top ~100 baseline candidates via RPC, sends compact JSON to Lovable AI (`google/gemini-3-flash-preview`) asking for a ranked list with reason per candidate. Returns ranked array `{candidate_id, score, reason}`.
- `send-vacancy-invitations` (new): admin-only. Input: `vacancy_id`, `candidate_ids[]`, optional custom message. Creates `vacancy_invitations` rows, enqueues a transactional email per candidate via existing email queue with confirm/decline links `${SITE_URL}/vacancy/respond?token=...&action=confirm|decline`.
- `vacancy-respond` (new, public): handles GET from email link. Calls RPC, on confirm enqueues "you're booked" confirmation email to candidate + admin notification. Returns a small branded HTML page.
- New transactional templates: `vacancy-invitation.tsx`, `vacancy-confirmed.tsx` registered in templates registry.

## 3. UI — VacanciesPanel
In the vacancy detail/expanded view add a **"AI Recommendations"** section:
- Filters: min score slider, skills multi-select (from vacancy.required_skills + free input), location text, work type, arrangement, right-to-work toggle, status (exclude placed/archived), result count (10/25/50/100).
- "Refresh AI ranking" button → calls `rank-vacancy-candidates`.
- Table: checkbox, name, headline, location, score, AI reason, status, last invited.
- Bulk actions: "Email selected to invite" → opens dialog with editable subject/message → calls `send-vacancy-invitations`.
- Shows invitation status badges (sent/confirmed/declined) per candidate, realtime subscription on `vacancy_invitations`.

## 4. Public response page
New lazy route `/vacancy/respond` in `App.tsx` → `src/pages/VacancyRespond.tsx`. Reads `token` + `action` from URL, calls `vacancy-respond` edge function, shows confirmation/decline UI with vacancy summary.

## 5. Technical notes
- AI call uses existing `LOVABLE_API_KEY` pattern; baseline RPC ensures we never send more than 100 candidates to the model.
- Confirmation auto-creates a `vacancy_assignments` row (stage `confirmed`) so the candidate immediately sees the shift in their `/me` calendar (existing `candidate_my_schedule`).
- Tokens are single-use; 30-day expiry.
- Email templates reuse the existing Pixcellor branded shell.

## Out of scope
- SMS invitations (email only this round).
- Calendar .ics attachments (can add later).
- Candidate-side decline reason capture beyond a single click.

Confirm and I'll ship the migration first, then edge functions, then UI + public page.