import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata = { title: "Privacy Policy — Gift Card Snapper" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-6 py-12">
      <div className="flex items-center gap-2">
        <Logo size={28} />
        <span className="font-bold">Gift Card Snapper</span>
      </div>
      <h1 className="text-2xl font-bold">Privacy Policy</h1>
      <p className="text-sm opacity-60">Last updated: July 3, 2026</p>

      <Section title="The short version">
        Gift Card Snapper reads gift card details out of your photos and
        writes them into a Google Sheet in your own Google Drive. Your photos
        and card details are never stored by us — they pass through our
        servers in memory only, on their way to your spreadsheet.
      </Section>

      <Section title="What we store">
        Your account information: the email address and name from your Google
        account, the ID of the spreadsheet the app created for you, your
        subscription status, your free-trial upload count, and referral
        relationships (who invited whom). That&apos;s all.
      </Section>

      <Section title="What we never store">
        Your photos. Your gift card numbers, PINs, security codes, values,
        and expiration dates. These exist on our servers only for the seconds
        needed to process them, then they are gone. The only lasting copy is
        the one in your own Google Sheet, which you control.
      </Section>

      <Section title="Google Drive access">
        The app requests the narrowest Google Drive permission that exists
        (&quot;drive.file&quot;): it can only see and edit files it created
        itself — your Gift Card Inventory spreadsheet. It cannot see anything
        else in your Drive.
      </Section>

      <Section title="Services we rely on">
        Supabase (account database and sign-in), Google (sign-in, Sheets, and
        Gemini, which processes your photos to read the cards), Stripe
        (payments — we never see your credit card number), and Vercel
        (hosting). Each processes only what is needed for its role.
      </Section>

      <Section title="Your choices">
        You can delete the spreadsheet at any time (the app will offer to
        create a fresh one). You can revoke the app&apos;s Google access at{" "}
        <a
          href="https://myaccount.google.com/permissions"
          className="underline"
        >
          myaccount.google.com/permissions
        </a>
        . To delete your account and its stored data entirely, email{" "}
        <a href="mailto:support@giftcardsnapper.com" className="underline">
          support@giftcardsnapper.com
        </a>{" "}
        and we&apos;ll take care of it.
      </Section>

      <Link href="/" className="mt-4 text-sm underline opacity-60">
        Back to Gift Card Snapper
      </Link>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="font-semibold">{title}</h2>
      <p className="text-sm leading-relaxed opacity-80">{children}</p>
    </section>
  );
}
