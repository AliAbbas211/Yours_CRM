import LegalPage, { H } from '@/components/LegalPage';

export const metadata = { title: 'Data Deletion - Yours CRM' };

export default function DataDeletionPage() {
  return (
    <LegalPage title="Data Deletion Instructions" updated="October 2026">
      <p>
        You can ask us to delete the data Yours CRM holds about you or your business at any time.
      </p>
      <H>Clients (businesses)</H>
      <p>
        Email info@yourstechhub.com from the address registered on your account with the subject "Delete my data".
        We will delete your account, connected WhatsApp Business Account details and access tokens, and the conversations,
        contacts and other data stored in your CRM.
      </p>
      <H>Customers of a client</H>
      <p>
        If you messaged a business that uses Yours CRM and want your phone number and messages removed, email
        info@yourstechhub.com with the phone number you used and the business you contacted. You can also ask the business directly.
      </p>
      <H>Disconnecting Facebook / WhatsApp</H>
      <p>
        You can remove the app at any time in your Facebook settings (Settings → Business Integrations), and disconnect WhatsApp
        from the CRM's WhatsApp page. Disconnecting stops all data flowing to the CRM.
      </p>
      <H>Timing</H>
      <p>We process verified requests within 30 days and confirm by email once the data has been deleted.</p>
    </LegalPage>
  );
}
