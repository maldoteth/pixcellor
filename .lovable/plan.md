## Plan

Fix the domain pricing so the customer is never shown a generic £8 price for domains that are actually expensive or premium.

### What I’ll change

1. **Use exact domain checks for displayed results**
   - For each visible suggestion, call the registrar availability/price endpoint for that exact domain.
   - Use the returned `price` / `regularPrice` for that specific domain, not the generic TLD price list.

2. **Handle premium domains safely**
   - If the registrar marks a domain as premium, show it as unavailable to buy through this flow unless a real price is returned and intentionally supported.
   - Prevent selecting domains whose exact price is unknown.

3. **Keep fallback pricing only as fallback**
   - Generic TLD pricing can still be used only when generating/sorting options before exact checks, not as the final price shown to the buyer.

4. **Verify the UI output**
   - Test searches with cheap normal domains and likely premium/high-cost domains.
   - Confirm the domain rows display varied, exact prices and no longer default expensive domains to £8.