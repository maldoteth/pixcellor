# Pixcellor

The Pixcellor website and client platform: service and package pages, a customer and candidate portal, invoices, lead capture, a website builder, calls and messaging, and an admin dashboard.

## Tech stack

- React + TypeScript, built with Vite
- Tailwind CSS and shadcn/ui
- Supabase (Postgres, auth, storage, edge functions in `supabase/functions`)

## Getting started

```sh
git clone <this repo>
cd pixcellor
cp .env.example .env   # fill in your own keys
npm install
npm run dev
```

Edge functions read their secrets from the Supabase project's function secrets; see `.env.example` for the names the code expects.

## License

[MIT](./LICENSE)
