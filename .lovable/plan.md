## Problem

The Vision Studio currently stacks two sections vertically:
1. **Visitor AI generations** — visitors' AI samples
2. **All previews** — admin-generated previews

The user wants them side-by-side under tabs instead of on top/below.

## Plan

1. **Replace stacked layout with `Tabs`** inside `src/components/portal/VisionStudio.tsx`.
   - Tab list at the top of the studio section: "Visitor generations" | "Our previews"
   - Both tabs sit in the same horizontal space, side-by-side.

2. **Tab 1 — Visitor AI generations**
   - Move the existing visitor generations grid into `<TabsContent value="visitors">`.
   - Keep the refresh button, the count, and the grid styling exactly as-is.

3. **Tab 2 — Our previews**
   - Move the existing "Latest preview" card + "All previews" grid into `<TabsContent value="ours">`.
   - Keep the send/resend buttons, copy link, open, and delete actions.

4. **Shared elements stay outside tabs**
   - Search bar: filters both sections simultaneously, stays above tabs.
   - Generate preview CTA card: stays at the very top (above search).
   - Wizard dialog: remains unchanged.

5. **Styling**
   - Use existing `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` from `@/components/ui/tabs`.
   - Keep rounded-none, border-border, bg-card/40 style tokens.
   - No new colors.

## Technical details

- Import `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` from `@/components/ui/tabs` (already used elsewhere in the app).
- Add a small local state `activeTab` defaulted to `"visitors"` or `"ours"`.
- Wrap the two existing content blocks in tabs; no logic changes.

## Out of scope
- No changes to the wizard, search, or card internals.
- No backend changes.
