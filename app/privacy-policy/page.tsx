import Link from "next/link";
import { ArrowLeft, ShieldCheck, Database, Eye, UserCheck, Trash2, Globe, Mail, AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | Mabuhay Homes",
  description:
    "How Mabuhay Homes collects, uses, and protects your personal information.",
};

const sections = [
  {
    id: "what-we-collect",
    icon: Database,
    title: "What Personal Information We Collect",
    content: [
      "When you register for a Mabuhay Homes account, we collect your full name, email address, and password (stored in hashed form). We do not store your plaintext password.",
      "If you complete your resident profile, we may collect additional information such as your contact number, home address within the subdivision, and your resident role (e.g., homeowner, tenant, non-resident).",
      "When you submit a property listing, we collect the property details you provide, including address, description, photos, pricing, and availability.",
      "When you book an amenity or schedule a viewing, we record the details of that request, including the date, time, and associated property or facility.",
      "When you submit payments or dues records through the platform, we collect the payment information and supporting documents you upload. We do not collect or store credit card or payment account numbers.",
      "We may collect your email address if you subscribe to the community newsletter.",
      "Usage data such as pages visited and actions taken within the platform may be collected for operational and improvement purposes.",
    ],
  },
  {
    id: "how-we-use",
    icon: Eye,
    title: "Why We Collect It & How We Use It",
    content: [
      "To create and manage your Mabuhay Homes account and verify your identity as a community member.",
      "To display your property listings to other users browsing the platform.",
      "To process amenity bookings, viewing requests, and dues records on your behalf.",
      "To send you transactional communications such as email verification, password reset instructions, and booking confirmations.",
      "To send community announcements and newsletter updates (only if you have subscribed or if required for official community communication).",
      "To allow HOA administrators to manage resident accounts, property listings, and community records within the system.",
      "To improve the functionality, performance, and user experience of the platform over time.",
    ],
  },
  {
    id: "account-data",
    icon: UserCheck,
    title: "Account, Listings, Payments & Documents",
    content: [
      "Your account data is accessible only to you and to authorized HOA administrators for community management purposes.",
      "Property listings you publish are visible to other registered users of the platform and, depending on listing settings, may be visible to the public.",
      "Payment records and uploaded documents related to dues are visible to you and to authorized HOA administrators. Other residents cannot access your financial records.",
      "Amenity bookings and viewing requests are accessible to you, the property owner (where applicable), and HOA administrators.",
      "Uploaded documents such as proof of payment are stored within the platform and are accessible only to authorized users.",
    ],
  },
  {
    id: "data-protection",
    icon: ShieldCheck,
    title: "Data Access, Protection & Retention",
    content: [
      "Access to personal data within the platform is restricted based on user roles. Only authorized administrators can access sensitive resident information.",
      "Passwords are stored using secure hashing algorithms and are never stored in plaintext.",
      "We retain your account data for as long as your account is active. If you request account deletion, we will remove your personal data in accordance with applicable data privacy laws.",
      "Data retention for transaction records (dues, bookings, listings) may be subject to legal and HOA recordkeeping requirements.",
      "We do not guarantee any specific level of encryption or security infrastructure beyond standard web application practices. Users are advised not to share sensitive personal or financial information beyond what is necessary for platform use.",
    ],
  },
  {
    id: "third-party",
    icon: Globe,
    title: "Third-Party Integrations & Data Sharing",
    content: [
      "The platform uses third-party services for email delivery (such as Gmail SMTP or similar providers) to send notifications and confirmations to users.",
      "We do not sell, trade, or rent your personal information to third parties for marketing purposes.",
      "Data may be shared with service providers who assist in operating the platform (e.g., hosting, email services) strictly for those purposes and subject to confidentiality.",
      "We may disclose personal information if required to do so by law or in response to valid legal requests from government authorities.",
    ],
  },
  {
    id: "your-rights",
    icon: UserCheck,
    title: "Your Privacy Rights",
    content: [
      "Under the Philippine Data Privacy Act of 2012 (Republic Act No. 10173), you have the right to be informed about how your personal data is collected and used.",
      "You have the right to access your personal data held within the platform at any time by logging into your account.",
      "You have the right to request corrections to inaccurate personal information in your account.",
      "You have the right to request the deletion of your personal data, subject to legal and HOA recordkeeping requirements.",
      "You have the right to object to or restrict certain uses of your personal data by contacting the HOA administrator.",
      "To exercise any of these rights, please contact us using the contact information provided below.",
    ],
  },
  {
    id: "contact",
    icon: Mail,
    title: "Contact & Data Controller",
    content: [
      "The data controller for the Mabuhay Homes platform is the Mabuhay Homes 2000 Phase 5 Homeowners' Association.",
      "For privacy-related questions, requests, or concerns, please contact the HOA at: mabuhay2000phase5@gmail.com",
      "This Privacy Policy may be updated from time to time to reflect changes in the platform or applicable law. Significant changes will be communicated to users through the platform or via email.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#f8faf7]">
      {/* Hero Banner */}
      <div className="bg-[#0e3020] px-4 py-14 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#54b868]/30 bg-[#54b868]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#86efac]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Data Privacy
          </div>
          <h1 className="font-serif text-3xl font-bold text-white sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/60 sm:text-base">
            How Mabuhay Homes collects, uses, and protects your personal information.
          </p>
          <p className="mt-2 text-xs text-white/40">
            In accordance with the Philippine Data Privacy Act of 2012 (R.A. 10173)
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {/* Notice */}
        <div className="mb-10 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p>
            <strong>Note:</strong> This Privacy Policy reflects current practices within the Mabuhay
            Homes platform. It does not imply guarantees beyond what the system currently implements.
            Contact the HOA for questions about specific data handling practices.
          </p>
        </div>

        <div className="space-y-8">
          {sections.map((section, i) => {
            const Icon = section.icon;
            return (
              <div
                key={section.id}
                id={section.id}
                className="rounded-3xl border border-[#123f2a]/10 bg-white p-6 shadow-[0_4px_20px_-2px_rgba(18,63,42,0.05)] scroll-mt-24"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#e8f3ec]">
                    <Icon className="h-4 w-4 text-[#123f2a]" />
                  </div>
                  <h2 className="font-serif text-lg font-bold text-[#123f2a] sm:text-xl">
                    {section.title}
                  </h2>
                </div>
                <ul className="space-y-2.5">
                  {section.content.map((item, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-[#5e6e62]">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#54b868]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Back link */}
        <div className="mt-12 flex items-center justify-between border-t border-[#d1e7dd] pt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-[#123f2a]/20 bg-white px-5 py-2.5 text-sm font-semibold text-[#123f2a] shadow-xs transition-all duration-200 hover:border-[#123f2a] hover:bg-[#123f2a] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <p className="text-xs text-[#5e6e62]">
            Effective for the Mabuhay Homes Platform
          </p>
        </div>
      </div>
    </div>
  );
}
