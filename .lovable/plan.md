## Add "Help" scripts panel to Sales tab

### Where
In `src/pages/Portal.tsx`, inside the `sales` TabsContent (around line 2274), add a new **Help** button next to the existing **Stats** button. Clicking it opens a themed dialog with call script ideas for the sales team.

### Button
```
[Create note] [Create client] [Stats] [Help]
```
- Icon: `HelpCircle` (lucide-react, already common)
- Opens `helpDialogOpen` state → Dialog component

### Dialog content
Title: "Call scripts"
Sub: "Quick openers for sales calls. Tap a script to copy."

Two script cards, each with a copy-to-clipboard button (reusing existing `copyToClipboard` helper):

**1. Free sample offer**
> Hi, I'm calling with a free sample offer from pixcellor.com.
>
> After studying the brand a bit, I've built you a sample website and design document I think you're going to love.
>
> Want to see?

**2. Cold outreach**
> Hi, I'm just calling about your website — I work for pixcellor.com.
>
> Do you like it?

Each card: bordered, `rounded-none`, monospace-ish quote block, "Copy" button top-right.

### Future-proof
Scripts stored as a local `const SALES_SCRIPTS = [{ id, title, body }, ...]` array at top of file so Erica can ask to add more later without schema changes. No DB / backend work in this pass.

### Files touched
- `src/pages/Portal.tsx` — add state, button, dialog, scripts array.

No backend, no migrations.