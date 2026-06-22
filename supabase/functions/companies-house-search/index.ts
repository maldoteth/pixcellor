// Companies House proxy: search companies + fetch registered office address.
// Keeps the API key server-side.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const API_KEY = Deno.env.get('COMPANIES_HOUSE_API_KEY');
const BASE = 'https://api.company-information.service.gov.uk';

function authHeader() {
  // Companies House uses HTTP Basic with the API key as username, blank password.
  return 'Basic ' + btoa(`${API_KEY}:`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (!API_KEY) {
    return new Response(JSON.stringify({ error: 'COMPANIES_HOUSE_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') ?? '').trim();
    const number = (url.searchParams.get('number') ?? '').trim();

    // Fetch single company profile (with registered office address)
    if (number) {
      if (!/^[A-Z0-9]{6,10}$/i.test(number)) {
        return new Response(JSON.stringify({ error: 'invalid company number' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const [profileRes, officersRes] = await Promise.all([
        fetch(`${BASE}/company/${encodeURIComponent(number)}`, { headers: { Authorization: authHeader() } }),
        fetch(`${BASE}/company/${encodeURIComponent(number)}/officers?register_type=directors&order_by=appointed_on`, { headers: { Authorization: authHeader() } }),
      ]);
      if (!profileRes.ok) {
        return new Response(JSON.stringify({ error: `companies house ${profileRes.status}` }), {
          status: profileRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const data = await profileRes.json();
      const a = data.registered_office_address ?? {};

      // "SMITH, John" → "John Smith"; "Christopher John KENNEDY" → "Christopher John Kennedy"
      const titleCase = (s: string) =>
        s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase());
      const formatName = (n: string) => {
        if (!n) return '';
        const parts = n.split(',').map((s) => s.trim()).filter(Boolean);
        const joined = parts.length === 2 ? `${parts[1]} ${parts[0]}` : n;
        return titleCase(joined.replace(/\s+/g, ' ').trim());
      };

      let directors: { name: string; role: string }[] = [];
      if (officersRes.ok) {
        const o = await officersRes.json();
        directors = (o.items ?? [])
          .filter((it: any) => !it.resigned_on && /director/i.test(it.officer_role ?? ''))
          .map((it: any) => ({ name: formatName(it.name ?? ''), role: it.officer_role ?? '' }))
          .filter((d: { name: string }) => d.name);
      }

      return new Response(JSON.stringify({
        company_number: data.company_number,
        company_name: data.company_name,
        status: data.company_status,
        address: {
          address_line1: [a.premises, a.address_line_1].filter(Boolean).join(' '),
          address_line2: a.address_line_2 ?? '',
          city: a.locality ?? '',
          region: a.region ?? '',
          postcode: a.postal_code ?? '',
          country: a.country ?? 'United Kingdom',
        },
        directors,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Typeahead search
    if (!q || q.length < 2) {
      return new Response(JSON.stringify({ items: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const r = await fetch(`${BASE}/search/companies?q=${encodeURIComponent(q)}&items_per_page=8`, {
      headers: { Authorization: authHeader() },
    });
    if (!r.ok) {
      return new Response(JSON.stringify({ error: `companies house ${r.status}`, items: [] }), {
        status: r.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const data = await r.json();
    const items = (data.items ?? []).map((it: any) => ({
      company_number: it.company_number,
      title: it.title,
      address_snippet: it.address_snippet ?? '',
      status: it.company_status,
    }));
    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
