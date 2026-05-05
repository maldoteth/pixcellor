## Goal
Make Google (and all browsers) display the new black/white "P" Pixcellor favicon.

## Changes

### 1. Delete the stale `public/favicon.ico`
It came back into the repo and is overriding the new PNG because browsers auto-request `/favicon.ico`.

### 2. Add proper favicon link tags to `index.html`
Replace the single outdated `apple-touch-icon` line with a complete, correct set:

```html
<!-- Favicon -->
<link rel="icon" type="image/png" sizes="512x512" href="/favicon.png">
<link rel="shortcut icon" type="image/png" href="/favicon.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
```

This guarantees:
- Browsers use `/favicon.png` (the new black/white P)
- iOS uses `/apple-touch-icon.png`
- The legacy `/favicon.ico` request no longer returns the stale image

### 3. (Optional but recommended) Generate a real `favicon.ico`
Some crawlers and old browsers strictly want an `.ico` at the root. We can generate a fresh multi-size `favicon.ico` from the new PNG and place it at `public/favicon.ico` so every client gets the new icon — including ones that ignore `<link>` tags.

## After deploying

Google won't update instantly. To speed it up:
1. Re-publish the site.
2. In **Google Search Console** → **URL Inspection** → enter `https://pixcellor.com` → click **Request Indexing**.
3. Google typically refreshes the search-result favicon within a few days of re-crawl.

Nothing else (sitemap, robots, structured data) needs to change — those are already correct.