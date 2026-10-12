import LegalPage, { H } from '@/components/LegalPage';

export const metadata = { title: 'Terms of Service - Yours CRM' };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="October 2026">
      <p>
        These terms govern use of Yours CRM, provided by YOURSTECHHUB. By using the service, the client agrees to them.
      </p>
      <H>The service</H>
      <p>
        Yours CRM provides a web inbox and tools for businesses to manage WhatsApp conversations, leads, orders and follow-ups,
        connected to the client's own WhatsApp Business Account through the WhatsApp Business Platform.
      </p>
      <H>Client responsibilities</H>
      <ul className="list-disc pl-6 space-y-1">
        <li>Use the service only for lawful business purposes and comply with the WhatsApp Business Messaging and Commerce Policies and Meta's platform terms.</li>
        <li>Message only people who have a relationship with the business and have not opted out, and honor opt-out requests.</li>
        <li>Keep login credentials confidential and tell us promptly about any unauthorized use.</li>
      </ul>
      <H>Subscription</H>
      <p>Access is provided for the subscription period agreed with the client. Access may be paused if a subscription expires or the terms are breached.</p>
      <H>Data</H>
      <p>The client owns the data it puts into or receives through the CRM. How we handle it is described in the <a className="text-blue-600 underline" href="/privacy">Privacy Policy</a>.</p>
      <H>Availability and liability</H>
      <p>The service depends on third-party platforms (including Meta) and is provided "as is". We do not guarantee uninterrupted availability and are not liable for losses caused by third-party outages or policy changes.</p>
      <H>Contact</H>
      <p>info@yourstechhub.com</p>
    </LegalPage>
  );
}
