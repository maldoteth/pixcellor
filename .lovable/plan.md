## Problem

Several admin/portal flows still use the browser's native `window.prompt`, `window.confirm`, and `alert` popups (the unstyled Chrome-default boxes). These break the black/glass-morphism theme — most visibly the "Send preview" flow on the Vision Studio (your generations preview email send button), but also others.

## Native popups found

1. **Vision Studio (`src/components/portal/VisionStudio.tsx`)** — the one you mentioned
   - Send preview: two `window.prompt`s (email, then client name)
   - Delete preview: `confirm("Delete this preview?")`

2. **Portal (`src/pages/Portal.tsx`)**
   - Move sample back to undelivered: `window.confirm`
   - Re-open delivered order: `window.confirm`
   - Send test "order complete" email: `window.prompt` for address

3. **Broadcast Campaigns (`src/components/BroadcastCampaigns.tsx`)**
   - Replace draft with template: `confirm`
   - Final send confirmation: `confirm("Send to N recipients?…")`

4. **Rich Email Editor (`src/components/email/RichEmailEditor.tsx`)**
   - Insert link: `window.prompt` for URL
   - Insert button: `window.prompt` for label, then URL

## Plan

Build two small reusable primitives in `src/components/ui/` using the existing shadcn `Dialog`, styled to match the portal's black + glass tokens:

- `PromptDialog` — title, optional description, one or more labelled inputs, Cancel / Confirm buttons. Returns the entered values via a promise-style hook (`usePromptDialog`) or controlled props.
- `ConfirmDialog` — title, description, Cancel / Confirm buttons (with optional destructive variant for deletes). Same hook pattern (`useConfirmDialog`).

Both render through a single mounted dialog instance per consumer, so call sites stay terse:

```ts
const ask = usePromptDialog();
const email = await ask({ title: "Send preview", fields: [{ name: "email", label: "Recipient email", type: "email", required: true }, { name: "name", label: "Client name (optional)" }] });
```

Then replace each call site above:

1. **VisionStudio.promptAndSend** → single `PromptDialog` with two fields (email + optional name) instead of two sequential native prompts. Better UX too — one step instead of two.
2. **VisionStudio.remove** → `ConfirmDialog` (destructive).
3. **Portal** sample/order confirms → `ConfirmDialog`. Test-email prompt → `PromptDialog`.
4. **BroadcastCampaigns** → `ConfirmDialog` for both (final send uses destructive styling for emphasis).
5. **RichEmailEditor** link/button inserts → `PromptDialog` (URL + optional label field).

## Styling

- Use existing `Dialog`, `DialogContent`, `DialogHeader`, `DialogFooter` from `src/components/ui/dialog.tsx` so they already get the project's bg/border/blur tokens.
- Primary button = default variant; destructive confirms use `variant="destructive"`.
- Inputs use the existing `Input` and `Label` components.
- No new colors — semantic tokens only.

## Out of scope

- No backend/data changes; this is purely a presentation swap.
- No changes to `BuyDetailsPrompt` (that's a custom themed component already, just shares the word "prompt").
