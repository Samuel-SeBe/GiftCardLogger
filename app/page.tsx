import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HomeActions from "./home-actions";

// Home screen: exactly one primary action (Take Photo) and one secondary
// action (Choose Existing Photo). Nothing else, per the spec.
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      <HomeActions />
    </main>
  );
}
