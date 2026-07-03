import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata = { title: "Terms of Service — Gift Card Snapper" };

export default function TermsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-6 py-12">
      <div className="flex items-center gap-2">
        <Logo size={28} />
        <span className="font-bold">Gift Card Snapper</span>
      </div>
      <h1 className="text-2xl font-bold">Terms of Service</h1>
      <p className="text-sm opacity-60">Last updated: July 3, 2026</p>

      <Section title="The service">
        Gift Card Snapper converts photographs of gift cards into rows in a
        Google Sheet in your own Google Drive. Your spreadsheet is the record
        of your inventory; the service is the conveyor belt, not the vault.
      </Section>

      <Section title="Accuracy is yours to confirm">
        Card details are read by AI and can be wrong. The app shows you every
        extracted field for review before saving — by tapping Approve &amp;
        Save you confirm the details yourself. We are not responsible for
        losses caused by incorrectly read or entered card information.
      </Section>

      <Section title="Subscription and billing">
        After the free trial (a limited number of image uploads), continued
        use requires the monthly subscription, billed through Stripe. You can
        cancel anytime via Manage Subscription; access continues to the end
        of the period you&apos;ve paid for. Referral rewards are granted as
        account credit and have no cash value.
      </Section>

      <Section title="Acceptable use">
        Use the service only for gift cards you lawfully possess. Don&apos;t
        abuse, probe, or disrupt the service, and don&apos;t use it for any
        unlawful purpose. We may suspend accounts that do.
      </Section>

      <Section title="Trademarks">
        Amazon, Best Buy, The Home Depot, Visa, Mastercard, American Express,
        and other brand names belong to their owners. Gift Card Snapper is
        not affiliated with or endorsed by any of them.
      </Section>

      <Section title="No warranties; limits on liability">
        The service is provided &quot;as is.&quot; To the maximum extent the
        law allows, our total liability for any claim is limited to the
        amount you paid us in the three months before the claim arose.
      </Section>

      <Section title="Changes">
        We may update these terms; material changes will be reflected on this
        page. Questions:{" "}
        <a href="mailto:support@giftcardsnapper.com" className="underline">
          support@giftcardsnapper.com
        </a>
        .
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
