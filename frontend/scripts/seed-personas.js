#!/usr/bin/env node
/*
  Triggers the Supabase edge function `seed-personas`.
  Uses .env vars: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
*/

import 'dotenv/config';

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function main() {
  if (!url || !anonKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in environment.');
    process.exit(1);
  }

  const endpoint = `${url.replace(/\/$/, '')}/functions/v1/seed-personas`;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey,
        'Content-Type': 'application/json'
      }
    });

    const text = await res.text();
    if (!res.ok) {
      console.error(`Function call failed (${res.status}):`, text);
      process.exit(1);
    }

    try {
      const json = JSON.parse(text);
      console.log('Seed personas result:', json);
    } catch {
      console.log('Seed personas response:', text);
    }
  } catch (err) {
    console.error('Error invoking seed-personas function:', err);
    process.exit(1);
  }
}

main();


