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

const tables = ["mindmaps", "mindmap_nodes", "mindmap_ui_state", "chat_threads", "chat_messages"];
let allOk = true;

for (const table of tables) {
  const { error } = await supabase.from(table).select("*").limit(1);
  if (!error) {
    console.log(`${table}: OK`);
    continue;
  }

  const code = error.code ?? "unknown";

  if (code === "PGRST205") {
    allOk = false;
    console.error(`${table}: ERROR ${code} - ${error.message}`);
    continue;
  }

  if (
    code === "42501" ||
    /permission denied/i.test(error.message) ||
    /row-level security/i.test(error.message)
  ) {
    console.log(`${table}: OK (exists, but not readable without auth)`);
    continue;
  }

  allOk = false;
  console.error(`${table}: ERROR ${code} - ${error.message}`);
}

process.exit(allOk ? 0 : 1);
