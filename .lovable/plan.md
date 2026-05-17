
# Fix items 5, 6, 12

Three focused changes from the CRM audit. Independent — can be shipped in any order, but P12 first makes 5 + 6 land in much smaller files.

---

## 12. Split `src/pages/Portal.tsx` (3,886 lines → ~9 files)

Pure refactor, **zero behaviour change**. Just moves JSX + handlers into per-tab components so the next two features (and everything after) land safely.

**New structure**
```text
src/pages/Portal.tsx                 ← shell only: auth gate, tabs frame, shared state
src/components/portal/PortalContext.tsx  ← React context for snapshot, filters, drawers
src/components/portal/tabs/
  SalesTab.tsx
  OrdersTab.tsx
  CompletedTab.tsx
  FalloffsTab.tsx
  CampaignsTab.tsx
  ChatsTab.tsx
  ClientsTab.tsx
  StudioTab.tsx
  AlertsTab.tsx
src/components/portal/drawers/
  ContactDetailDrawer.tsx
  OrderDetailDrawer.tsx
  FalloffDetailDrawer.tsx
```

**Rules**
- All shared state (snapshot, realtime subscriptions, filters, active drawer ids) lives in `PortalContext`.
- Each tab is a self-contained component that reads from context — no prop drilling.
- Existing tab keys (`sales|orders|completed|falloffs|campaigns|chats|profiles|studio|alerts`) and the `localStorage.portal_active_tab` value are preserved.
- All Tailwind classes, drawer behaviour, realtime channels, and AI tool wiring stay identical.

---

## 5. Auto-create contact from chat

When a visitor types an email or phone number into the live chat, upsert a `contacts` row and link the conversation.

**Schema change** (one migration)
- `chat_conversations.contact_id uuid NULL` — link conversation to the contact it produced.
- Index on `lower(contacts.email)` and on `contacts.phone` (only if not already present) for the upsert lookup.

**Edge function: `supabase/functions/sales-chat/index.ts`**
In the request handler, just before the existing `hasUserMessage` block:
1. Take the latest `user` message content.
2. Extract:
   - email — RFC-lite regex
   - phone — UK + international, min 9 digits after stripping non-numerics
3. If either found AND visitor has no `contact_id` on the conversation yet:
   - Look up existing contact by `lower(email)` then by normalised phone.
   - If found: update `name` if currently empty/"Unknown", append a note "Shared contact via live chat on YYYY-MM-DD", set `status='warm'` only if currently `cold`/`aware`.
   - If not found: insert `contacts` row with `source='chat'`, `status='warm'`, `name = visitor-supplied name or "Chat visitor"`, `notes = "Shared from live chat on <date>"`.
   - Write `chat_conversations.contact_id`.
   - Insert a `contact_events` row (`event_type='communication'`, title `"Started live chat"`).
4. Never auto-set `hot` — that follows the guardrails decided in the audit.

**Idempotency**
- Only runs when `chat_conversations.contact_id IS NULL` for that conversation, so re-pastes don't create duplicates.

**Portal UI**
- `ChatsTab` shows a small "Linked contact" chip on each conversation row when `contact_id` is set, click → opens `ContactDetailDrawer`.

---

## 6. Dedup / merge contacts

Two parts: a UI panel that surfaces likely duplicates, and a `merge_contacts` action (admin button + AI tool).

**Detection rule** (no schema change needed)
A normalised key per contact:
- `email_key` = `lower(trim(email))`
- `phone_key` = digits-only phone, last 10 digits
- `name_company_key` = `lower(trim(name))` + `lower(trim(coalesce(website,'')))`

Two contacts are "likely duplicates" if they share a non-empty `email_key` OR `phone_key`, OR (`name_company_key` matches AND one of email/phone is null on either side).

Computed client-side in `ClientsTab` from the already-loaded snapshot — no extra query.

**UI**
- New collapsible "Possible duplicates" panel at the top of `ClientsTab`, grouped by match key.
- Each group shows 2–4 candidate rows side-by-side with: name, email, phone, source, status, lead_score, last_seen.
- Two actions per group:
  - **Merge into…** (pick the survivor) — opens a confirm modal previewing the merged record.
  - **Not a duplicate** — adds match key to `localStorage.portal_dedup_dismissed` so it stays hidden for that admin.

**Backend: new RPC + edge function**
- Postgres function `merge_contacts(survivor_id uuid, duplicate_ids uuid[])` (security definer, admin-only via `has_role`):
  - Re-parents `contact_events.contact_id`, `contact_persons.contact_id`, `chat_conversations.contact_id`, `ai_sample_generations.contact_id` to the survivor.
  - Merges fields: survivor wins on non-null collisions; missing fields filled from duplicates (prefer most recent `updated_at`).
  - Appends a note: `"Merged from <duplicate names/ids> on <date>."`
  - Picks max `lead_score`, max status temperature (`gold > hot > warm > aware > cold > archived`).
  - Deletes the duplicate `contacts` rows.
- Expose via `sales-chat` as a tool:
  ```ts
  { name: "merge_contacts",
    description: "Merge duplicate contacts into one survivor. Only call when the dev explicitly confirms a merge or asks to dedupe specific records.",
    parameters: { survivor_id: string, duplicate_ids: string[] (max 5) } }
  ```

**Safety**
- Hard-cap merges at 5 duplicates per call.
- Always logs a `contact_events` row on the survivor with `event_type='note'`, title `"Merged duplicates"`, description listing the old IDs + key fields so it can be audited / partially un-done by hand.

---

## Order of work

```text
1. P12 Portal split          (refactor, no behaviour change)
2. P5  chat → contact        (migration + sales-chat edit + ChatsTab chip)
3. P6  merge_contacts        (RPC migration + ClientsTab panel + AI tool)
```

## Files touched (summary)

- **New:** 9 tab components, 3 drawer components, `PortalContext.tsx`
- **Migrations:** add `chat_conversations.contact_id`, indexes, `merge_contacts()` RPC
- **Edited:** `supabase/functions/sales-chat/index.ts` (contact extraction + new tool), `src/pages/Portal.tsx` (shrunk to shell)

## Questions before building

1. For #6 merge: should the AI ever auto-merge (when it's confident), or always require a human click? Default in this plan: human click only — AI can suggest but not execute without explicit "merge X into Y".
2. For #5: if the visitor shares only a phone (no email, no name), still create the contact? Default: yes, `name = "Chat visitor • <last4digits>"`.
