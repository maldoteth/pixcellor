## Goal

1. Keep the existing **Clients** tab (the one backed by `client_profiles`, currently showing 52).
2. Delete the second **Clients** tab (backed by `contacts`, currently showing only Jim).
3. Make sure people who submit the contact form (enquiries) get saved into the **contacts** table — but since that tab is being removed from the portal UI, surface them inside the kept Clients (`client_profiles`) flow instead.

Re-read of your message: "people who make enquiries should be saved as contacts in our actual contacts tab" — the kept tab (`client_profiles`) becomes the single Clients/contacts hub. Jim and any other entries from the old `contacts` table that you actually want to keep can be migrated into `client_profiles`. If that's not what you meant (e.g. you actually want to keep the `contacts` tab and just rename the labels), tell me and I'll adjust before building.

## Changes

### Portal UI (`src/pages/Portal.tsx`)
- Remove the `<TabsTrigger value="contacts" …>` (line 1756) and its entire `<TabsContent value="contacts">` block (around line 2304+).
- Remove related state, queries, memos and helpers that only the contacts tab used: `filteredContacts`, contact search/sort/filter state, `contactEvents` UI usage, `contactOrderStatsByEmail` if unused elsewhere, etc. Keep anything still referenced by other tabs.
- Adjust `TabsList` grid from `xl:grid-cols-10` → `xl:grid-cols-9`.
- Drop unused icon imports (`UserPlus`) if no longer referenced.

### Inquiry → contacts persistence
- The contact form already inserts into `contact_inquiries`. Add a lightweight upsert into `client_profiles` (by email) at the same time so every enquirer shows up in the kept Clients tab with their name, email, and the message stored in `notes`/`requirements`.
- Realtime subscription on `client_profiles` already exists, so the Clients tab will refresh automatically.

### Optional cleanup (ask before doing)
- The `contacts`, `contact_events`, and `lead_search_history` tables and the `find-local-leads` edge function become unused. Leave them in place for now (safe), or confirm you want them dropped in a follow-up.

## Out of scope
- Migrating Jim from `contacts` into `client_profiles` — say the word and I'll copy him over before deleting the tab.
- Renaming the kept tab label (currently "Clients"). Happy to rename to "Clients & contacts" or similar if you prefer.

## Technical notes
- The two count badges come from `filteredProfiles.length` (52, kept) and `filteredContacts.length` (1, removed).
- Inquiry insert happens in the public contact form component; I'll mirror the insert with a `client_profiles` upsert keyed on lowercased email so duplicates merge cleanly.
