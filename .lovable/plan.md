
# Pixcellor Client Portal ("BYOW")

A white-label portal where each Pixcellor client can chat-prompt updates to the Lovable-built site you made for them, see a live side-by-side preview, and never see Lovable branding.

## Reality check first

Lovable has **no public chat API**. The only programmatic way to drive an existing project is the **Lovable MCP Server** (research preview):
- https://docs.lovable.dev/integrations/lovable-mcp-server
- Designed for MCP clients (Claude Desktop, Cursor, etc.) but it's just an HTTP MCP endpoint — our edge function can act as a client too.
- Auth is tied to *your* Lovable account, so the portal runs all prompts as you. (That's fine — clients only ever touch their own project; we just gate by project ID.)
- It's a **research preview** — could change. We isolate it behind one `lovable-mcp-bridge` edge function so a future swap (e.g. official API, or fallback to a manual queue) is a one-file change.

If MCP turns out to be too restrictive in practice, the same portal degrades gracefully to **Tier 2**: prompts get queued and you action them (or we commit an `INSTRUCTIONS.md` via GitHub sync). UI stays identical for the client.

## Architecture

```text
Client browser  ── login (magic link)
   │
   ├─ /portal/:siteId
   │     ├─ Chat pane (AI Elements)
   │     ├─ Preview LEFT  = iframe of published site (their live URL)
   │     └─ Preview RIGHT = iframe of Lovable preview URL (post-edit)
   │
   └─ Edge functions:
        ├─ byow-chat            → calls lovable-mcp-bridge with prompt + project_id
        ├─ lovable-mcp-bridge   → MCP client → Lovable MCP Server (server-side only)
        ├─ byow-stripe-checkout → starts subscription
        └─ byow-check-sub       → gates portal access
```

All MCP credentials, Lovable session/token, and project mappings stay server-side. Clients never see Lovable URLs, project IDs, or branding.

## Data model

- `byow_sites` — id, owner_user_id, display_name, lovable_project_id, lovable_preview_url, published_url, created_at
- `byow_messages` — id, site_id, role (user/assistant/system), content, mcp_run_id?, status (pending/streaming/done/error), created_at
- `byow_subscriptions` — user_id, site_id, stripe_customer_id, stripe_subscription_id, status, current_period_end, prompts_used_this_period, prompt_quota

RLS: clients only read/write rows where `owner_user_id = auth.uid()`. Service role for the edge functions.

## Surfaces

1. **`/portal/login`** — magic-link auth. New clients get an invite email from you containing a one-click link tied to their `byow_sites` row.
2. **`/portal`** — dashboard listing the client's sites (most clients = 1), plan status, prompts left this month, "Manage subscription" button → Stripe Customer Portal.
3. **`/portal/:siteId`** — the builder:
   - Left column: chat (AI Elements `Conversation`/`Message`/`PromptInput`, Pixcellor theme, no Lovable mention)
   - Right column tabs: **Live** (current published site iframe) ↔ **Preview** (Lovable preview URL iframe, cache-busted) ↔ **Split** (both)
   - Top bar: site name, prompts remaining, "Publish" button (triggers MCP "publish" command on their project)
4. **Admin `/admin/byow`** (you only): create a site row, paste the Lovable project URL, send invite to client, view all prompts/usage, kill switch per site.

## Edit-scope guardrails

Client chose "Copy/text/images" *and* "Anything goes" — so we expose both as **modes** in the composer:

- **Safe mode** (default): system prompt to the MCP bridge forces "only edit copy, images, and obvious text content. Do not change layout, components, routes, or structure." Cheaper, lower risk.
- **Full mode**: pass-through. Same power as you'd have in Lovable. Higher prompt cost.

Toggle is per-message. Safe mode is the default for every new site so a client can't accidentally nuke their layout on day one.

## Billing

Stripe subscription per site (monthly). Two tiers, both seamless Stripe (no key needed):

| Tier | Price/mo | Prompts/mo | Mode |
|---|---|---|---|
| Care | TBD | 30 | Safe only |
| Studio | TBD | 150 | Safe + Full |

Quota enforced server-side in `byow-chat` before the MCP call. Overage = friendly "upgrade or wait until {date}" message. Standard `create-checkout` + `check-subscription` + `customer-portal` edge functions, gated by `site_id`.

## Phasing

**Phase 1 — Foundation (this build)**
- Tables + RLS + GRANTs
- Magic-link auth for clients
- Admin page to create site rows + send invites
- `/portal` dashboard
- `/portal/:siteId` chat + dual iframe preview (preview URLs entered by you for now)
- `lovable-mcp-bridge` edge function (single MCP "send prompt" tool, returns assistant text + new preview URL)
- `byow-chat` edge function with quota check
- Stripe subscription wiring + customer portal

**Phase 2**
- "Publish" button (MCP publish command if available, else triggers your manual step)
- Version history / restore (mirror Lovable's checkpoints by tagging messages)
- File/image upload → injected into the prompt
- Per-site activity log + email digest to you

**Phase 3**
- Fallback queue mode (if MCP rate limits hit, prompts go into a queue you action in bulk)
- Per-client subdomain `clientname.pixcellor.app/portal`
- Whitelabel theming per client (their logo in the chrome)

## Risks & mitigations

- **MCP is research preview** → all calls go through one bridge function; swap is isolated.
- **MCP runs as your Lovable account** → strict server-side mapping of `auth.uid()` → allowed `lovable_project_id`s; client can never specify which project to hit.
- **Rate limits / slow edits** → optimistic chat UI ("Working on it…" shimmer), queue fallback in Phase 3.
- **Client breaks their site in Full mode** → Safe mode default + restore from Lovable's own version history (we surface a "Restore last working version" button that triggers MCP rollback if/when supported).
- **Lovable ToS** → MCP is the official integration path, so this is sanctioned. We just hide the Lovable name in *our* UI; we don't impersonate Lovable.

---

## Open questions before I build

1. Do you want me to start Phase 1 now using the MCP bridge as the engine, accepting the "research preview" risk?
2. What are the actual prices for **Care** and **Studio** tiers (or should I leave placeholders for you to set in Stripe)?
3. For the invite flow — should the magic link create a Supabase user on click, or should you pre-create the user account and just send them a login link?

Approve and I'll build Phase 1 end-to-end.
