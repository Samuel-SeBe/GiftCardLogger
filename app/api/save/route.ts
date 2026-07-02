import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureSpreadsheet } from "@/lib/provisioning";
import { appendRow } from "@/lib/google";

const MAX_CARDS = 25;
const MAX_FIELD_LENGTH = 200;

// Writes approved cards to the user's spreadsheet, one append per card.
// Each card succeeds or fails independently; the response reports both.
// Card data is never stored server-side — it goes straight to the sheet.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!Array.isArray(body?.cards) || body.cards.length === 0) {
    return NextResponse.json({ error: "No cards received" }, { status: 400 });
  }
  if (body.cards.length > MAX_CARDS) {
    return NextResponse.json({ error: "Too many cards" }, { status: 400 });
  }

  // The date comes from the phone so it reflects the user's own time zone.
  const date = /^\d{2}\/\d{2}\/\d{4}$/.test(body.date)
    ? (body.date as string)
    : formatToday();

  const cards = body.cards.map((card: Record<string, unknown>) => ({
    vendor: asField(card?.vendor),
    card_number: asField(card?.card_number),
    pin: asField(card?.pin),
    value: asField(card?.value),
  }));

  let provisioned;
  try {
    provisioned = await ensureSpreadsheet(user.id);
  } catch (e) {
    console.error("Provisioning before save failed:", e);
    return NextResponse.json(
      { error: "Could not reach Google Sheets. Please try again." },
      { status: 502 }
    );
  }
  if (provisioned.status === "reauth") {
    return NextResponse.json({ error: "reauth" }, { status: 409 });
  }

  const results: { ok: boolean }[] = [];
  for (const card of cards) {
    try {
      await appendRow(provisioned.accessToken, provisioned.spreadsheetId, [
        date,
        card.vendor,
        card.card_number,
        card.pin,
        card.value,
      ]);
      results.push({ ok: true });
    } catch (e) {
      console.error("Row append failed:", e);
      results.push({ ok: false });
    }
  }

  return NextResponse.json({ results });
}

function asField(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, MAX_FIELD_LENGTH) : "";
}

function formatToday(): string {
  return new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}
