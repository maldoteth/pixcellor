## Goal

Turn the portal into a dual CRM: existing **Clients** workflow stays untouched, and a parallel **Candidates** workflow is added for recruitment. Pixcellor's chatbot ("Alex") will detect job seekers and route them into the candidates pipeline instead of the client database. The Alerts tab is removed.

## 1. Database — new `candidates` schema

New tables (all in `public`, with GRANTs + RLS scoped to admins only via `has_role(auth.uid(), 'admin')`):

- **`candidates`** — one row per person seeking work:
  - Identity: `full_name`, `email`, `phone`, `location`, `right_to_work` (enum: uk_citizen / settled / visa_required / unknown), `linkedin_url`, `portfolio_url`, `cv_url`
  - Profile: `headline` (e.g. "Senior React dev"), `summary`, `years_experience`, `current_role`, `current_employer`, `notice_period_weeks`, `availability_date`
  - Compensation: `desired_salary_min`, `desired_salary_max`, `salary_currency` (default GBP), `desired_work_type` (enum: permanent / contract / temp / freelance), `desired_arrangement` (enum: onsite / hybrid / remote)
  - Skills/targeting: `skills` (text[]), `industries` (text[]), `preferred_locations` (text[])
  - Pipeline: `status` (enum: new / screening / shortlisted / submitted / interviewing / offer / placed / rejected / on_hold / archived), `rating` (1–5), `source` (chatbot / manual / referral / website / linkedin / job_board / other), `assigned_to_user_id`
  - Free-form: `notes`, `tags` (text[])
  - Audit: `created_by_user_id`, `created_by_email`, timestamps

- **`candidate_events`** — timeline (mirrors `contact_events`): call, email, interview, note, status_change, callback. Fields: `candidate_id`, `event_type`, `title`, `description`, `callback_at`, `completed_at`, `created_by_*`.

- **`candidate_documents`** — CVs and attachments: `candidate_id`, `kind` (cv / cover_letter / portfolio / right_to_work / other), `file_url`, `filename`, `size_bytes`, `uploaded_by_*`. Files go in a new private Storage bucket `candidate-files`.

- **`candidate_applications`** — links a candidate to a job/role they applied for: `candidate_id`, `role_title`, `client_contact_id` (optional FK to `contacts` so a placement can tie back to the client), `applied_at`, `stage`, `outcome`, `notes`.

Plus security-definer RPCs that mirror the contacts pattern:
`portal_create_candidate`, `portal_update_candidate`, `portal_create_candidate_event`, `portal_complete_candidate_callback`, `portal_add_candidate_document`, `portal_update_candidate_status`, `portal_create_candidate_from_chat` (used by the bot, callable via service role). All with input validation matching the contact RPCs.

## 2. Portal UI — Candidates tab

In `src/pages/Portal.tsx`:

- Remove the **Alerts** tab trigger and its `TabsContent`, plus the `loadAlerts` query and realtime subscription.
- Add a **Candidates** tab in the same slot with `Users` icon.
- New component `src/components/portal/CandidatesPanel.tsx` modeled on the existing contacts panel:
  - Filter bar: status, source, skill search, rating, assigned-to.
  - List/table view with quick status change, rating stars, last-activity, next callback.
  - Detail drawer: identity, profile, skills (chips), compensation, documents, timeline of events, applications.
  - "Add candidate" dialog modeled on the New Contact dialog, with all the fields above, file upload for CV.
  - Bulk actions: change status, archive, export CSV.
  - Realtime subscription on `candidates` + `candidate_events`.

## 3. Bot → candidates routing

In `supabase/functions/sales-chat/index.ts`:

- Update `SYSTEM_PROMPT` so Alex recognises job-seeker intent ("looking for work", "have a CV", "any developer roles", etc.) and, instead of pushing toward a website quote, gathers: name, email/phone, current role, years of experience, skills, desired work type, location, right to work.
- Add a tool `save_candidate` (alongside whatever lead-capture tool exists) that calls `portal_create_candidate_from_chat` via service role with the collected fields and `source = 'chatbot'`. Bot confirms "Thanks, our recruitment team will be in touch".
- Heuristic guardrail in the function: if user message matches job-seeker regex and no candidate row yet for that email/phone in this conversation, auto-prompt Alex with the candidate-intake flow.
- Log a `candidate_events` row of type `chat_intake` with the conversation transcript snippet.

## 4. Three additional improvements

1. **Candidate ↔ client matching panel** — on a client/contact detail, a "Matching candidates" section runs a server function `portal_match_candidates_for_contact` that ranks candidates by overlap of `skills`, `preferred_locations`, and `desired_work_type` against the client's stored role brief. Lets you shortlist directly from the client view.
2. **Pipeline kanban view** — toggle on the Candidates tab to switch from list to a drag-and-drop kanban grouped by `status` (new → screening → shortlisted → submitted → interviewing → offer → placed). Drag updates status via `portal_update_candidate_status` and writes a `status_change` event.
3. **Public candidate intake page** — new route `/jobs/apply` (lazy in `App.tsx`) with a clean branded form (name, email, phone, CV upload, skills, work preferences, right to work). Submits via a new edge function `candidates-apply` that re-uses `portal_create_candidate_from_chat`. Link it from the footer as "Looking for work?" so the agency captures applicants outside the chatbot too.

## Out of scope (call out, don't build)

- Email/SMS templates for candidate comms (existing transactional pipeline can be reused later; not wired this round).
- Migrating historical contacts that were actually job seekers — would need a manual pass.
- Calendar/interview scheduling integration.

## Technical notes

- Two migrations: (a) enums + tables + GRANTs + RLS + RPCs, (b) Storage bucket `candidate-files` (private) with admin-only policies.
- One new edge function (`candidates-apply`) + one updated function (`sales-chat`).
- New files: `CandidatesPanel.tsx`, `CandidateDetailDrawer.tsx`, `NewCandidateDialog.tsx`, `CandidateKanban.tsx`, `pages/CandidateApply.tsx`.
- Removed: alerts UI block + queries in `Portal.tsx` (table `admin_alerts` left intact in DB to avoid destructive change; can be dropped in a later cleanup migration if you confirm).
- Types regenerate automatically after the schema migration runs.

Confirm and I'll start with the schema migration, then UI, then bot + extras.
