## Goal

Keep the word "grant" (you like it for conversion) but always qualify it as **"Pixcellor's private SME grant"** so the headline claim is self-contained and not misleading under ASA/CAP rules and the DMCC Act 2024. Apply the other agreed compliance fixes around the pricing badges and call/SMS scripts.

## 1. Customer-facing wording swaps

### Marketing scripts (SMS + call)
**Files:** `src/pages/Portal.tsx` (line 34-35), `src/components/SmsBroadcasts.tsx` (line 37-40)

- Rename script title: "Grant Script" → "Private SME Grant Script"
- Replace `"a digital grant"` → `"Pixcellor's private SME grant"` in the script body
- Replace `"apply now by texting back YES"` → `"reply YES to check eligibility"`
- Remove pre-allocation phrasing `"I have your details here for (say company name)"` → `"I'm calling UK SMEs like (say company name)"`

### Pricing cards (Packages dialog, Customer portal, Vision flow, Chatbot)
**Files:** `src/components/PackagesDialog.tsx`, `src/pages/CustomerPortal.tsx`, `src/components/ChatBot.tsx`, `supabase/functions/sales-chat/index.ts`

- Badge text: `"SME Subsidy — {n}% off"` → `"Pixcellor private SME grant — {n}% off"`
- Add a small one-line microcopy directly under the badge: *"Privately funded by Pixcellor. Not a government grant."* (rendered as a `text-[10px] text-muted-foreground` line so it sits with the headline claim, not buried in T&Cs).

### RRP / strike-through prices (DMCC Act 2024 compliance)
**Files:** `PackagesDialog.tsx` (lines 780, 841, 935, 1282, 1314, 1385), `CustomerPortal.tsx` (585), `VisionPurchaseFlow.tsx` (168), `ChatBot.tsx` (179), `sales-chat/index.ts` (1882)

The DMCC Act bans struck-through "RRP" claims unless the product was actually sold at that price for a meaningful period. Two options — pick one in the plan:

- **Option A (safer):** drop the strike-through styling; relabel as **"Standard price £1,500"** with no line-through. The grant discount % still does the conversion work.
- **Option B:** keep the strike-through but change `RRP` → `Standard list price` and add a tooltip / asterisk pointing to a new clause confirming the package has been sold at that list price.

Default to **Option A** unless you say otherwise.

## 2. Legal page (Section 20)

**File:** `src/pages/Legal.tsx` (lines 270–334)

- Rename heading: `"20. SME Subsidy / Pixcellor Digital Grant Programme"` → `"20. Pixcellor Private SME Grant Programme"`
- First sentence: define the term once as *"the 'Pixcellor Private SME Grant', also referred to as the 'SME Grant' or 'Grant Script'"* — keeps all existing references valid.
- Body wording stays as-is (it already says "privately funded", "not a government grant", funding pool £250k, eligibility, clawback, tax). Just swap stray uses of "Subsidy" → "Grant" inside the section so terminology is consistent with the marketing copy.
- Leave Section 21 (Contact) unchanged.

## 3. Internal-only names (NOT changed)

- DB column names, migration files, enum values, analytics event keys, and the `checkoutTracking.ts` constants stay as they are — they're not customer-visible and renaming them would require a migration with no compliance benefit.
- `FalloffConsentBanner.tsx` uses the word "grant" only in the GDPR-consent sense ("grant permission") — left untouched.

## Out of scope

- No business-logic changes (pricing, discount maths, eligibility checks, Stripe products).
- No DB migrations.
- No new pages or components.

## Files touched

1. `src/pages/Portal.tsx`
2. `src/components/SmsBroadcasts.tsx`
3. `src/components/PackagesDialog.tsx`
4. `src/pages/CustomerPortal.tsx`
5. `src/components/VisionPurchaseFlow.tsx`
6. `src/components/ChatBot.tsx`
7. `supabase/functions/sales-chat/index.ts` (Alex's spoken/written copy + recommendation string)
8. `src/pages/Legal.tsx` (Section 20 heading + terminology pass)
