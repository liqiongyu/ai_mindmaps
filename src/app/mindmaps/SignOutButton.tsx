"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [submitting, setSubmitting] = useState(false);

  return (
    <button
      className="rounded-md border border-zinc-200 px-3 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
      disabled={submitting}
      onClick={async () => {
        setSubmitting(true);
        try {
          await supabase.auth.signOut();
        } finally {
          setSubmitting(false);
          router.push("/login");
          router.refresh();
        }
      }}
      type="button"
    >
      {submitting ? "Signing out…" : "Sign out"}
    </button>
  );
}
