## Problem

Email and phone were converted to `<a>` JSX elements, but the surrounding code still calls `.filter(Boolean).join(" · ")` on the array. Joining a JSX element to a string coerces it via `String(element)` → `"[object Object]"`, so the links never render and show as literal text.

## Fix

In `src/pages/Portal.tsx` (around lines 3264–3288), replace the `[ ...].join(" · ")` pattern with a proper React render that:

1. Builds an array of React nodes (email link, phone link, location string, industry string), filtering out empty ones.
2. Renders them with a `·` separator between each, using `React.Fragment` keyed by index — no string coercion.
3. Falls back to `"No details on file"` when the array is empty.

Roughly:

```tsx
{(() => {
  const parts: React.ReactNode[] = [];
  if (c.email) parts.push(
    <a key="email" href={`mailto:${c.email}`} className="text-primary underline-offset-4 hover:underline" onClick={(e) => e.stopPropagation()}>{c.email}</a>
  );
  if (c.phone) parts.push(
    <a key="phone" href={formatPhoneHref(c.phone) || undefined} className="text-primary underline-offset-4 hover:underline" onClick={(e) => e.stopPropagation()}>{c.phone}</a>
  );
  if (c.location) parts.push(<span key="loc">{c.location}</span>);
  if (c.industry) parts.push(<span key="ind">{c.industry}</span>);
  if (parts.length === 0) return "No details on file";
  return parts.map((node, i) => (
    <React.Fragment key={i}>
      {i > 0 && <span className="mx-1">·</span>}
      {node}
    </React.Fragment>
  ));
})()}
```

No other logic changes; purely the render of the contact-detail line.
