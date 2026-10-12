import LegalPage, { H } from '@/components/LegalPage';

export const metadata = { title: 'Privacy Policy - Yours CRM' };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="October 2026">
      <p>
        Yours CRM is a web-based WhatsApp sales CRM operated by YOURSTECHHUB ("we", "us"). It lets businesses
        ("clients") manage conversations with their own customers on WhatsApp. This policy explains what data we
        handle and why.
      </p>
      <H>Data we handle</H>
      <ul className="list-disc pl-6 space-y-1">
        <li>Client account data: owner name, company name, email, phone number, address and login credentials (passwords are stored hashed).</li>
        <li>WhatsApp data received from Meta on a client's behalf: customer phone numbers, names, message content and media, message status, and the client's WhatsApp Business Account and phone number IDs.</li>
        <li>Data the client adds to the CRM: leads, orders, products, knowledge-base content and notes.</li>
        <li>Facebook Login data: when a client connects WhatsApp through Meta's Embedded Signup we receive the client's public profile and the access token needed to operate their WhatsApp Business Account.</li>
      </ul>
      <H>How we use it</H>
      <p>
        We use this data only to provide the service to the client who owns it: showing incoming customer messages in the
        client's inbox, sending replies the client (or an assistant the client configures) writes, tracking leads, orders and
        follow-ups, and keeping the connection to the client's WhatsApp Business Account working.
        Each client can only see its own data. We do not sell Platform Data or share it with third parties for their own use.
      </p>
      <H>Service providers</H>
      <p>
        We use infrastructure and AI/automation providers to run the service (hosting, database, and language-model processing
        of message text when the client enables automated replies). These providers process data only on our instructions.
      </p>
      <H>Retention and deletion</H>
      <p>
        We keep data while the client's account is active. Clients, and their customers, can request deletion at any time;
        see our <a className="text-blue-600 underline" href="/data-deletion">Data Deletion</a> page.
      </p>
      <H>Security</H>
      <p>Data is transmitted over HTTPS, access to client data is restricted by account, and access tokens are stored server-side only.</p>
      <H>Contact</H>
      <p>Questions or requests: info@yourstechhub.com.</p>
    </LegalPage>
  );
}
