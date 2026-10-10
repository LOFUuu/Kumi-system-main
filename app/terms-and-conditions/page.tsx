import Link from "next/link";
import { ArrowLeft, FileText, UserCheck, Home, Calendar, ShieldOff, Gavel, Mail, AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Terms & Conditions | Mabuhay Homes",
  description:
    "Terms and conditions for using the Mabuhay Homes community platform.",
};

const sections = [
  {
    id: "acceptance",
    icon: FileText,
    title: "Acceptance of Terms",
    content: [
      "By accessing or using the Mabuhay Homes platform, you agree to be bound by these Terms and Conditions.",
      "If you do not agree to these terms, please do not register for or use the platform.",
      "These terms apply to all users of the platform, including residents, tenants, non-resident users, and administrators.",
      "These Terms and Conditions may be updated from time to time. Continued use of the platform after changes are posted constitutes your acceptance of the updated terms.",
    ],
  },
  {
    id: "accounts",
    icon: UserCheck,
    title: "Account Registration & User Responsibilities",
    content: [
      "You must provide accurate and truthful information when registering for an account. Providing false information may result in account suspension or termination.",
      "You are responsible for maintaining the confidentiality of your account credentials (email and password). Do not share your login details with others.",
      "You are responsible for all activities that occur under your account. If you believe your account has been compromised, contact the HOA administrator immediately.",
      "Users must be at least 18 years of age to register for a Mabuhay Homes account.",
      "Accounts are personal and non-transferable. You may not create accounts for or on behalf of other individuals without proper authorization.",
      "The HOA administrator reserves the right to approve, restrict, or deactivate accounts based on community membership and role verification.",
    ],
  },
  {
    id: "listings",
    icon: Home,
    title: "Property Listings & Accuracy",
    content: [
      "Registered users may publish property listings for sale or rent through the platform, subject to HOA guidelines.",
      "All property information submitted in a listing must be accurate, complete, and up to date. Misleading, false, or fraudulent listings are prohibited.",
      "Property owners are responsible for updating their listings to reflect changes in availability, pricing, or property condition.",
      "Mabuhay Homes does not verify the accuracy of listing information. Users browsing listings are encouraged to conduct their own due diligence before making any property decisions.",
      "The HOA and platform administrators reserve the right to remove listings that violate community guidelines, contain false information, or are otherwise inappropriate.",
      "The Mabuhay Homes platform is a community tool and does not act as a real estate broker, agent, or legal representative in any property transaction.",
    ],
  },
  {
    id: "viewing",
    icon: Calendar,
    title: "Viewing Schedules & Reservations",
    content: [
      "Users may request viewing schedules for available properties through the platform. Viewing requests are subject to the property owner's availability and confirmation.",
      "Users may book community amenities through the platform subject to availability, HOA rules, and applicable fees set by the HOA.",
      "Confirmed bookings and viewing schedules are binding commitments. Cancellations should be made in advance and in accordance with HOA policies.",
      "Mabuhay Homes is not responsible for disputes arising between users related to viewing schedules or amenity bookings. Such disputes should be raised with the HOA for resolution.",
      "No-shows or repeated cancellations may result in temporary restrictions on booking privileges, as determined by the HOA.",
    ],
  },
  {
    id: "prohibited",
    icon: ShieldOff,
    title: "Prohibited Activities & Misuse",
    content: [
      "You may not use the platform for any unlawful purpose or in violation of applicable Philippine laws and regulations.",
      "Unauthorized access to other users' accounts, data, or private information is strictly prohibited.",
      "You may not attempt to interfere with, disrupt, or damage the platform's systems, servers, or databases.",
      "Spamming, phishing, or any form of fraudulent communication through the platform is prohibited.",
      "Publishing offensive, defamatory, or inappropriate content in listings, announcements, or any other platform feature is not allowed.",
      "Attempting to bypass role-based access restrictions or gain access to administrator features without authorization is prohibited.",
      "Commercial advertising, multi-level marketing promotion, or any unsolicited solicitation through the platform is not permitted.",
    ],
  },
  {
    id: "restrictions",
    icon: Gavel,
    title: "Account Restrictions & Termination",
    content: [
      "The HOA administrator reserves the right to suspend or terminate any account found to be in violation of these Terms and Conditions.",
      "Violations that may result in account action include providing false information, prohibited activities, misuse of platform features, and community rule violations.",
      "In the event of account suspension or termination, you will be notified by the HOA administrator. You may appeal the decision by contacting the HOA.",
      "Users who have their accounts terminated forfeit access to their listings, booking history, and other account-related data.",
      "Mabuhay Homes is not liable for any loss of data or content resulting from account termination due to violations of these terms.",
    ],
  },
  {
    id: "limitations",
    icon: AlertTriangle,
    title: "Limitations & Disclaimers",
    content: [
      "The Mabuhay Homes platform is provided on an as-is basis for community management purposes. We do not guarantee uninterrupted or error-free service.",
      "We are not responsible for inaccuracies in user-submitted content, including property listings, profile information, or documents.",
      "We are not responsible for the outcome of any property transaction, amenity booking dispute, or agreement made between users through the platform.",
      "The platform may be temporarily unavailable due to maintenance, updates, or technical issues. We will make reasonable efforts to minimize downtime.",
      "Links to third-party websites or services, if any, are provided for convenience only. We are not responsible for the content or practices of third-party services.",
    ],
  },
  {
    id: "contact-terms",
    icon: Mail,
    title: "Contact & Questions",
    content: [
      "For questions, concerns, or requests related to these Terms and Conditions, please contact the Mabuhay Homes HOA Administration.",
      "Email: mabuhay2000phase5@gmail.com",
      "Address: Mabuhay Homes 2000 Phase 5, Philippines",
      "You may also use the Contact page on this platform to submit inquiries directly to the HOA.",
    ],
  },
];

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-[#f8faf7]">
      {/* Hero Banner */}
      <div className="bg-[#0e3020] px-4 py-14 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#54b868]/30 bg-[#54b868]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#86efac]">
            <FileText className="h-3.5 w-3.5" />
            Platform Terms
          </div>
          <h1 className="font-serif text-3xl font-bold text-white sm:text-4xl">
            Terms & Conditions
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/60 sm:text-base">
            Please read these terms carefully before using the Mabuhay Homes community platform.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {/* Notice */}
        <div className="mb-10 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p>
            <strong>Note:</strong> These Terms and Conditions govern the use of the Mabuhay Homes
            digital platform. They are separate from any formal HOA legal agreements or deed
            restrictions. Contact the HOA for official community governance documents.
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
            Mabuhay Homes Platform — Community Use
          </p>
        </div>
      </div>
    </div>
  );
}
