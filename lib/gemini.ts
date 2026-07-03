import "server-only";

// Reads gift cards out of a photo using Google Gemini.
//
// This is the only file that knows which AI provider we use — swapping
// providers later means rewriting only this file.

export type ExtractedCard = {
  vendor: string;
  card_number: string;
  pin: string;
  value: string;
  expiration: string;
};

const MODEL = "gemini-2.5-flash";

const PROMPT = `This photo contains one or more gift cards — store gift cards (e.g. Amazon, Best Buy, Home Depot) and/or network-branded prepaid gift cards (Visa, Mastercard, American Express). Extract every visible card.

For each card return:
- vendor: the brand name shown on the card (e.g. "Amazon", "Best Buy", "Home Depot", "DoorDash", "Vanilla Visa", "Mastercard"). Unknown brands are fine — use whatever the card shows.
- card_number: the card's primary redemption number or code. This is usually the longest number printed on the card, or, for cards redeemed with a single gift/claim code (Amazon, DoorDash, and similar), the redemption code found in the scratch-off area.
- pin: the SEPARATE PIN or security code — usually a short code, often under a scratch-off panel, or a CVV/4-digit code on network-branded (Visa/Mastercard/Amex) cards.
- value: the card's dollar amount as a plain number string without a currency symbol (e.g. "25" or "26.50"). If no amount is shown, use an empty string.
- expiration: the expiration date exactly as printed (e.g. "12/28"). Most store gift cards have none — use an empty string.

Critical rules:
- card_number and pin must be DIFFERENT values. Never copy the same code into both fields.
- Many gift cards have only ONE redeemable code (no separate PIN). In that case, put that single code in card_number and leave pin as an empty string.
- Only use a value for pin when there is genuinely a distinct second code separate from the card number.
- If a code is hidden behind unscratched material or on a side not shown, use an empty string for it.

Only include cards that are actually visible in the photo. If there are no gift cards, return an empty array.`;

const RESPONSE_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      vendor: { type: "STRING" },
      card_number: { type: "STRING" },
      pin: { type: "STRING" },
      value: { type: "STRING" },
      expiration: { type: "STRING" },
    },
    required: ["vendor", "card_number", "pin", "value", "expiration"],
  },
};

export async function extractCardsFromImage(
  image: Buffer,
  mimeType: string
): Promise<ExtractedCard[]> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inlineData: { mimeType, data: image.toString("base64") } },
              { text: PROMPT },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0,
        },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini request failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const text: string =
    data.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("") ?? "";

  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    throw new Error("Unexpected model output: not an array");
  }

  return parsed.map((card) => {
    const cardNumber = asTrimmedString(card?.card_number);
    let pin = asTrimmedString(card?.pin);
    // Safety net: some single-code cards (e.g. DoorDash) tempt the model
    // into echoing the redemption code into the PIN too. A PIN identical
    // to the card number is never real — drop it.
    if (pin && sameCode(pin, cardNumber)) {
      pin = "";
    }
    return {
      vendor: asTrimmedString(card?.vendor),
      card_number: cardNumber,
      pin,
      value: asTrimmedString(card?.value),
      expiration: asTrimmedString(card?.expiration),
    };
  });
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

// Compares two codes ignoring case and spacing/dashes.
function sameCode(a: string, b: string): boolean {
  const norm = (s: string) => s.replace(/[\s-]/g, "").toLowerCase();
  return norm(a) === norm(b) && norm(a).length > 0;
}
