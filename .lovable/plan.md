Plan to fix the Inbox email reader bento sizing:

1. Adjust the Inbox tab layout so the message list and email reader use the same bounded height as the other portal bento sections.
   - Keep the two-column layout on desktop.
   - Keep a single-column layout on mobile.
   - Prevent the reader card from growing beyond the visible portal area.

2. Make the email reader card internally scroll instead of pushing/cutting off the page.
   - The selected email body will scroll inside its own section.
   - The reply textarea/buttons will remain within the card layout.
   - Long emails will no longer stretch the whole page.

3. Match the sizing style already used by the other bento panels above.
   - Use consistent max-height behavior.
   - Keep spacing, borders, and card styling aligned with the existing portal design.

Technical details:
- Update `src/pages/Portal.tsx` only.
- Focus on the `TabsContent value="mailbox"` area around the inbox list and reader card.
- Replace the current reader card sizing with a fixed/bounded flex layout and internal overflow handling.