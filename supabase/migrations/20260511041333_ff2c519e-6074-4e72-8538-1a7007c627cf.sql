UPDATE contacts
SET notes = NULLIF(
  trim(both E'\n' FROM regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(notes,
              'Vision generator — [a-z_]+ \(\d{4}-\d{2}-\d{2}\)( · visitor [a-z0-9-]+)?\n?', '', 'g'),
            '(Free Sample Request|Let''s Talk submission) via [a-z_]+\.\n?', '', 'g'),
          'Company / brand: [^\n]*\n?', '', 'g'),
        'Requested a callback\.\n?', '', 'g'),
      'Requested info by email\.\n?', '', 'g'),
    '\n{2,}', E'\n', 'g')),
  '')
WHERE notes ILIKE '%Vision generator —%'
   OR notes ILIKE '%Let''s Talk submission%'
   OR notes ILIKE '%Free Sample Request via%'
   OR notes ILIKE '%Requested a callback%'
   OR notes ILIKE '%Requested info by email%'
   OR notes ILIKE '%Company / brand:%';