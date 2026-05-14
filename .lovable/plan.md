Add a "Latest update" sort tab to the Clients section in the Portal.

## What
A new sort tab next to "Oldest first" that reorders the client list by the most recently edited contacts first (using the `contacts.updated_at` timestamp).

## How
1. **State type** — Extend the `clientsSort` union in `src/pages/Portal.tsx` from `"newest" | "oldest" | "hot" | "cold"` to also include `"latest_update"`.
2. **Tab UI** — Add a new button `{ value: "latest_update", label: "Latest update" }` into the sort tabs array inside the clients section.
3. **Sort logic** — In the `clientBookContacts` `useMemo`, add a branch for `clientsSort === "latest_update"` that sorts by `updated_at` descending (most recent edits first).