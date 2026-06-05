## Goal
Show how far each candidate is from the vacancy site **in miles** as a badge pinned to the **top-right** of each candidate row in the AI Recommendations panel.

## Changes

**File:** `src/components/portal/AIRecommendationsPanel.tsx`

1. Restructure the header row of each candidate result so the name/score/status badges sit on the left and the distance badge sits flush right (`ml-auto`, `shrink-0`) — visible "top right of the thumbnail".
2. Convert `distance_km` to miles for display: `Math.round(distance_km * 0.621371)` with a `mi` suffix. The underlying data stays in km (DB, ranking, filters), only the display label changes.
3. Optionally update the existing "Max distance (km)" filter label to "Max distance (mi)" and convert the input value to km internally, so the filter UX matches the badge. *(Confirm if you want this; otherwise filter stays in km.)*

No backend, RPC, or edge-function changes — distance is already returned by `portal_rank_candidates_for_vacancy`.

## Question for you
Do you want the **Max distance filter** also switched to miles for consistency, or leave it in km?
