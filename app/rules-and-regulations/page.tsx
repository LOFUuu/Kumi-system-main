import Link from "next/link";
import { ArrowLeft, ShieldCheck, Trash2, Volume2, Users, Home, Lock, AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Rules & Regulations | Mabuhay Homes",
  description:
    "Community rules and regulations for Mabuhay Homes 2000 Phase 5 residents and visitors.",
};

const sections = [
  {
    id: "general-conduct",
    icon: Users,
    title: "General Community Guidelines & Resident Conduct",
    items: [
      "All residents, tenants, and guests are expected to conduct themselves with respect and courtesy toward neighbors and community staff at all times.",
      "Any form of harassment, discrimination, or verbal and physical abuse directed at fellow residents, HOA officers, or community personnel is strictly prohibited.",
      "Residents are responsible for the behavior of their household members, tenants, and visitors within the subdivision.",
      "Disputes between residents should be resolved peacefully and, when necessary, reported to the Homeowners' Association (HOA) for proper mediation.",
      "Unauthorized commercial activities, soliciting, or canvassing within the subdivision without HOA approval is not allowed.",
      "All vehicles must be driven at a safe speed within the subdivision at all times. Reckless driving endangers the community.",
    ],
  },
  {
    id: "cleanliness",
    icon: Trash2,
    title: "Cleanliness, Waste Disposal & Shared Spaces",
    items: [
      "Residents must maintain the cleanliness of their lots, including the sidewalk and drainage areas immediately adjacent to their property.",
      "Garbage must be placed in properly sealed bags and set out only on scheduled collection days designated by local government ordinance.",
      "Dumping of waste, rubble, construction materials, or any debris in common areas, drainage canals, and vacant lots is strictly prohibited.",
      "Open burning of waste materials within the subdivision is not allowed.",
      "Residents are encouraged to practice waste segregation in accordance with applicable local ordinances.",
      "Common areas such as parks, walkways, and open spaces must be kept clean. Any damage to community property must be reported to the HOA immediately.",
    ],
  },
  {
    id: "noise",
    icon: Volume2,
    title: "Noise Control & Respect for Neighbors",
    items: [
      "Loud music, parties, or any activity that creates excessive noise must be kept within reasonable levels, especially during nighttime hours (10:00 PM to 6:00 AM).",
      "Residents planning gatherings that may produce noise should inform nearby neighbors as a courtesy and ensure events end at a reasonable hour.",
      "Use of power tools, construction equipment, and similar noisy activities should only be done during permitted hours (generally 8:00 AM to 5:00 PM on weekdays). Residents are advised to check local ordinances for specific guidelines.",
      "Burning of firecrackers or similar devices within the subdivision is subject to local government regulations and HOA guidelines.",
      "Persistent noise complaints will be addressed by the HOA, and repeat violations may be subject to further action.",
    ],
  },
  {
    id: "amenities",
    icon: ShieldCheck,
    title: "Use of Subdivision Amenities & Facilities",
    items: [
      "Community amenities such as the clubhouse, basketball court, and other shared facilities are available for use by registered residents and their authorized guests.",
      "Advance booking for facility use must be done through the Mabuhay Homes platform or by coordinating directly with the HOA.",
      "Amenity reservations are subject to availability and HOA-approved scheduling.",
      "Users of amenities are responsible for keeping the facilities clean and in good condition after use.",
      "Damage caused to community facilities during a reservation period may be subject to repair costs.",
      "Alcohol consumption and smoking in amenity areas may be subject to restrictions set by the HOA. Please confirm current rules with the association.",
      "Residents must supervise minors using community facilities at all times.",
    ],
  },
  {
    id: "property",
    icon: Home,
    title: "Property & House Listing Guidelines",
    items: [
      "Residents who wish to sell or rent their property are encouraged to use the Mabuhay Homes platform to list their property for the community.",
      "All property listings must contain accurate and truthful information, including property details, pricing, and availability.",
      "Listings that contain false, misleading, or fraudulent information will be removed and the account may be suspended.",
      "Structural renovations, extensions, or major alterations to a property may require prior HOA approval and compliance with local building regulations.",
      "The HOA is not a party to any private property transaction. Residents are advised to conduct their own due diligence and seek legal advice for property transactions.",
    ],
  },
  {
    id: "security",
    icon: Lock,
    title: "Security, Safety & Community Responsibilities",
    items: [
      "All visitors must register at the subdivision entrance. Residents are responsible for authorizing their guests.",
      "Residents must report any suspicious activity, unauthorized persons, or security concerns to the community guard or HOA as soon as possible.",
      "The keeping of pets must be done responsibly. Pets must be kept on a leash in common areas and pet waste must be cleaned up immediately.",
      "Residents are responsible for ensuring that their property structures are safe and do not pose hazards to adjacent lots or common areas.",
      "In case of fire or other emergencies, residents should follow proper emergency protocols and assist in alerting the community.",
      "The HOA reserves the right to update and enforce additional security measures for the safety and well-being of all residents.",
    ],
  },
  {
    id: "violations",
    icon: AlertTriangle,
    title: "Violations & Enforcement",
    items: [
      "Violations of these rules and regulations will be addressed by the HOA through appropriate notices and procedures.",
      "Residents found in violation may receive a written notice, be required to attend a hearing, or be subject to other remedies available to the HOA.",
      "Persistent or serious violations may be referred to appropriate local government authorities.",
      "Residents have the right to respond to and appeal any violation notice through the HOA's established procedures.",
      "These rules are intended to foster a safe, orderly, and harmonious community for all. The HOA appreciates the cooperation and good faith of all residents.",
    ],
  },
];

export default function RulesAndRegulationsPage() {
  return (
    <div className="min-h-screen bg-[#f8faf7]">
      {/* Hero Banner */}
      <div className="bg-[#0e3020] px-4 py-14 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#54b868]/30 bg-[#54b868]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#86efac]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Community Standards
          </div>
          <h1 className="font-serif text-3xl font-bold text-white sm:text-4xl">
            Rules & Regulations
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/60 sm:text-base">
            Guidelines for maintaining a safe, clean, and harmonious community at Mabuhay Homes 2000 Phase 5.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {/* Notice banner */}
        <div className="mb-10 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p>
            <strong>Note:</strong> These guidelines represent general community standards. Specific
            fees, penalties, and formal HOA resolutions are subject to approval and official
            publication by the Mabuhay Homes Homeowners' Association. Please contact the HOA for the
            most current official policies.
          </p>
        </div>

        {/* Section list */}
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
                    <Icon className="h-4.5 w-4.5 text-[#123f2a]" />
                  </div>
                  <h2 className="font-serif text-lg font-bold text-[#123f2a] sm:text-xl">
                    {section.title}
                  </h2>
                </div>
                <ul className="space-y-2.5">
                  {section.items.map((item, j) => (
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
            Last reviewed by the HOA Administration
          </p>
        </div>
      </div>
    </div>
  );
}
