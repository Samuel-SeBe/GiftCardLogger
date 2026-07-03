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
};

const MODEL = "gemini-2.5-flash";

const PROMPT = `This photo contains one or more retail gift cards. Extract every visible gift card.

For each card return:
- vendor: the brand name shown on the card (e.g. "Amazon", "Best Buy", "Home Depot"). Unknown brands are fine — use whatever the card shows.
- card_number: the card's main number, with spaces or dashes exactly as printed. For Amazon cards use the claim code as the card number.
- pin: the PIN or security code if one is visible. Amazon cards have no PIN — use an empty string. If a PIN exists but is hidden behind scratch-off material, use an empty string.
- value: the card's dollar amount as a plain number string without a currency symbol (e.g. "25" or "26.50"). If no amount is shown, use an empty string.

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
    },
    required: ["vendor", "card_number", "pin", "value"],
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

  return parsed.map((card) => ({
    vendor: asTrimmedString(card?.vendor),
    card_number: asTrimmedString(card?.card_number),
    pin: asTrimmedString(card?.pin),
    value: asTrimmedString(card?.value),
  }));
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
