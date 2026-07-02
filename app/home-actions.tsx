"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function HomeActions() {
  const router = useRouter();

  // Step 3 wires these buttons to the camera and photo library.
  function notYetBuilt() {
    alert("Photo capture arrives in Step 3 — login is working!");
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex w-full max-w-xs flex-col gap-4">
      <button
        onClick={notYetBuilt}
        className="w-full rounded-2xl bg-blue-600 px-6 py-5 text-lg font-semibold text-white shadow-md transition active:scale-[0.98]"
      >
        Take Photo
      </button>
      <button
        onClick={notYetBuilt}
        className="w-full rounded-2xl border border-black/15 px-6 py-4 text-base font-medium transition active:scale-[0.98] dark:border-white/20"
      >
        Choose Existing Photo
      </button>

      {/* Temporary while building: lets us test with multiple accounts. */}
      <button
        onClick={signOut}
        className="mt-8 text-center text-xs opacity-50 underline"
      >
        Sign out
      </button>
    </div>
  );
}
