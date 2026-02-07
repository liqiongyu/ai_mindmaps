import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Set it in .env.local (see .env.example).`);
  }
  return value;
}

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const tables = ["mindmaps", "mindmap_nodes"];
let allOk = true;

for (const table of tables) {
  const { error } = await supabase.from(table).select("*").limit(1);
  if (!error) {
    console.log(`${table}: OK`);
    continue;
  }

  allOk = false;
  const code = error.code ?? "unknown";
  console.error(`${table}: ERROR ${code} - ${error.message}`);
}

process.exit(allOk ? 0 : 1);
