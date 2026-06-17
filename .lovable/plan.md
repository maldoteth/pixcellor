## What we're building

Clicking any empty day cell (the dashed "Request" tile) in the customer portal Schedule tab opens a chooser modal with three cards, instead of the current "set availability" editor. Each card routes to an existing flow, prefilled with the clicked date.

```text
┌─ Request for [Thu 18 Jun] ────────────┐
│ [ Meeting ]  [ Work ]  [ Staff ]      │
└───────────────────────────────────────┘
```

## The three options

### 1. Request meeting — in-modal quick picker
A slim dialog (no name/email/company — the user is logged in). Fields:
- Date (prefilled from the cell, editable)
- Time (15-min slots, 09:00–18:00 London)
- Brief (optional)

On submit, insert into `call_bookings` using the logged-in customer's profile (name/email/phone pulled from `client_profiles` or `auth.user`). `source = 'customer-portal'`, `status = 'pending'`, `preference = 'specific'`. Toast on success + close. No edge function needed — direct insert with RLS.

### 2. Request work → KYC / candidate signup
Route to the existing `/jobs/apply` page with `?from=portal&date=YYYY-MM-DD`. This is the existing flow:
- `CandidateApply.tsx` collects name/email/phone + creates a `candidates` row
- After signup, candidate lands in `/candidate-portal` which already mounts `KycDocuments` (passport / right-to-work / trade tickets / qualifications / ID & address — UK)
- Backed by `candidate_documents` table with verified/pending/rejected review states

**UK only for now** per your decision. US compliance (I-9, W-9/W-8BEN, E-Verify) is a follow-up.

**Status of "is it built?":** Yes — passport upload + right-to-work + admin review queue all exist. It's compliant for UK pre-employment checks (Home Office right-to-work list A/B docs, store-and-show evidence). No changes needed for this ticket.

### 3. Request staff → vacancy intake
Open a slim "Tell us what staff you need" dialog (in-modal, no page nav). Fields:
- Role title
- Number needed (openings)
- Start date (prefilled from cell)
- Location
- Hours/shift pattern (free text)
- Notes

Submit creates a row in `vacancies` with `status = 'draft'`, `client_contact_id` resolved from the logged-in user's `client_profiles → contacts` link, `created_by_user_id = auth.uid()`. Admin sees it in `VacanciesPanel` and triages.

If the user has no linked contact, we fall back to creating a `contact_inquiries` row tagged `category = 'staff_request'` so nothing is lost.

## Files to change / add

- `src/components/portal/PortalScheduleAdminGrid.tsx` — replace `openEditor(dk)` on the empty-cell click with `setRequestChooser({ date: dk })`. Keep right-click context menu's "Edit availability" item (for candidate-side use) intact.
- `src/components/portal/RequestChooserDialog.tsx` *(new)* — the 3-card chooser, plus the meeting picker and staff request sub-dialogs.
- `src/pages/CandidateApply.tsx` — accept `?from=portal&date=…` query params for return-link UX (small touch-up, no behaviour change).

No DB migrations needed — `call_bookings`, `vacancies`, `contact_inquiries` already exist with appropriate RLS.

## Out of scope (call out explicitly)

- US KYC (I-9, W-9/W-8BEN, E-Verify) — separate ticket
- Replacing the candidate-side availability editor — still reachable via the right-click context menu so candidates keep their workflow
- Payment / deposit at request time