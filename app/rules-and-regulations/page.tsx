import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  Trash2,
  Volume2,
  Users,
  Home,
  Lock,
  AlertTriangle,
  Ban,
  Clock,
  VolumeX,
  Bike,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

export const metadata = {
  title: "HOA Rules & Regulations | Mabuhay Homes",
  description:
    "Official HOA community rules and regulations for Mabuhay Homes 2000 in coordination with Barangay Salawag, City of Dasmariñas.",
};

// Official 10 posted HOA Rules from the physical community signage
const officialHoarules = [
  {
    number: "01",
    rule: "NO DRINKING SESSION IN PUBLIC PLACES",
    tagline: "Public Order & Decorum",
    description:
      "Drinking alcoholic beverages along subdivision streets, sidewalks, parks, and other open public areas is strictly prohibited to maintain peace, safety, and order.",
    note: "Bawal ang uminom ng alak sa mga pampublikong lugar at kalsada.",
    icon: Ban,
  },
  {
    number: "02",
    rule: "NO ROAMING AROUND SHIRTLESS",
    tagline: "Community Decency",
    description:
      "All residents, tenants, and visitors are required to be decently dressed in public spaces. Roaming shirtless outside private premises is not permitted.",
    note: "Bawal magpagala-gala nang walang damit pang-itaas (nakahubad) sa loob ng subdivision.",
    icon: Users,
  },
  {
    number: "03",
    rule: "NO URINATING IN PUBLIC PLACES",
    tagline: "Sanitation & Hygiene",
    description:
      "Urinating in open lots, streets, walls, gutters, or public areas is strictly prohibited. Violators will face immediate sanitary citation.",
    note: "Mahigpit na ipinagbabawal ang pag-ihi sa pampublikong lugar, pader, at bakanteng lote.",
    icon: ShieldAlert,
  },
  {
    number: "04",
    rule: "NO LITTERING AND DUMPING OF GARBAGE ANYWHERE",
    tagline: "Environmental Cleanliness",
    description:
      "Garbage must be properly bagged and disposed of only during scheduled collection days. Throwing trash or construction debris on sidewalks, canals, or vacant lots is forbidden.",
    note: "Bawal magtapon ng basura kahit saan. Panatilihing malinis ang ating kapaligiran.",
    icon: Trash2,
  },
  {
    number: "05",
    rule: "NO VANDALISM",
    tagline: "Property Protection",
    description:
      "Defacing, scratching, or spray-painting community walls, guard posts, street signs, and private properties will be penalized and subjected to restoration expenses.",
    note: "Mahigpit na ipinagbabawal ang pagsusulat, pagpintas, o pagsira sa mga pasilidad.",
    icon: ShieldAlert,
  },
  {
    number: "06",
    rule: "NO USING OF VIDEOKE AND LOUD MUSIC BEYOND 10PM",
    tagline: "Noise Curfew",
    description:
      "Videoke sessions, sound systems, and excessive noise must cease promptly by 10:00 PM to respect neighbors and comply with local quiet hour ordinances.",
    note: "Bawal gumamit ng videoke at magpatugtog nang malakas lampas 10:00 PM.",
    icon: VolumeX,
  },
  {
    number: "07",
    rule: "NO ILLEGAL STRUCTURE AND OBSTRUCTION ARE SUBJECT TO ROAD CLEARING",
    tagline: "Road Safety & Access",
    description:
      "Sidewalks, streets, and road rights-of-way must remain clear for vehicles, pedestrians, and emergency responders. Unauthorized structures, fences, and parked obstructions are subject to road clearing.",
    note: "Ang lahat ng sagabal at ilegal na istruktura sa kalsada ay sasailalim sa road clearing.",
    icon: AlertTriangle,
  },
  {
    number: "08",
    rule: "NO OPEN MUFFLER ARE ALLOWED INSIDE OUR SUBDIVISION",
    tagline: "Noise Pollution Control",
    description:
      "Vehicles and motorcycles equipped with open pipes, modified noisy exhausts, or open mufflers that cause noise disturbance are strictly prohibited within subdivision premises.",
    note: "Bawal ang maingay o open muffler na motor at sasakyan sa loob ng subdivision.",
    icon: Volume2,
  },
  {
    number: "09",
    rule: "NO WEARING OF HELMET FOR RIDERS INSIDE OUR SUBDIVISION",
    tagline: "Security & Identification",
    description:
      "Motorcycle riders must remove their full-face helmets upon entering the subdivision gate and keep them off while driving inside for facial recognition and community security monitoring.",
    note: "Tanggalin ang helmet pagpasok sa gate para sa pagkakakilanlan at seguridad.",
    icon: Bike,
  },
  {
    number: "10",
    rule: "NO MINORS ARE ALLOWED OUTSIDE THEIR HOMES BEYOND CURFEW HOURS (10PM)",
    tagline: "Youth Protection & Curfew",
    description:
      "Children and teenagers below 18 years old must be inside their homes by 10:00 PM unless accompanied by a parent, legal guardian, or in case of an authorized emergency.",
    note: "Bawal lumabas ang mga menor de edad lampas ng 10:00 PM alinsunod sa curfew ordinance.",
    icon: Clock,
  },
];

// Supplementary community guidelines
const sections = [
  {
    id: "amenities",
    icon: ShieldCheck,
    title: "Subdivision Amenities & Facility Usage",
    items: [
      "Community amenities such as the clubhouse, basketball court, and shared recreational facilities are available for registered residents and authorized guests.",
      "Advance booking must be requested through the Mabuhay Homes platform or coordinated directly with the HOA administration office.",
      "Users are required to leave facilities clean, turn off lights, and dispose of their trash properly after reservations.",
      "Damage caused to community facilities during events will be charged to the reserving resident.",
      "Minors using amenity areas must always be supervised by a parent or responsible adult.",
    ],
  },
  {
    id: "property",
    icon: Home,
    title: "Property Alterations & Home Guidelines",
    items: [
      "Major structural renovations, house extensions, or exterior repainting require prior HOA review and municipal building permits.",
      "Construction materials must be kept within the owner's property line and not obstruct public roads or drainage.",
      "House listings for sale or lease on the Mabuhay Homes platform must contain accurate, up-to-date, and truthful details.",
    ],
  },
  {
    id: "security",
    icon: Lock,
    title: "Subdivision Gates & Visitor Protocol",
    items: [
      "All visitors and delivery riders must register with security guards at the subdivision entrance gates.",
      "Residents should advise the guard post in advance when expecting multiple visitors or delivery trucks.",
      "Pets must be kept on a leash in common areas, and pet owners are strictly required to clean up any waste immediately.",
      "Suspicious activities, unauthorized prowlers, or emergencies should be reported to security personnel immediately.",
    ],
  },
  {
    id: "violations",
    icon: AlertTriangle,
    title: "Enforcement & Penalties",
    items: [
      "Violations of HOA rules are subject to written warning notices, mediation conferences, and corresponding administrative penalties.",
      "Unresolved or severe violations will be formally endorsed to the Barangay Salawag Lupon Tagapamayapa or local authorities for appropriate action.",
      "Residents have the right to respond and present their case through official HOA grievance procedures.",
      "All rules are strictly enforced to preserve safety, peace, cleanliness, and harmony for every family in Mabuhay Homes 2000.",
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
            Mabuhay Homes 2000 • Barangay Salawag
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            HOA Rules & Regulations
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">
            Official community standards and subdivision guidelines enforced for the safety,
            peace, cleanliness, and security of all residents and guests.
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {/* Signboard Notice Header */}
        <div className="mb-10 overflow-hidden rounded-3xl border border-red-200 bg-gradient-to-br from-red-500/10 via-red-50/60 to-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-white shadow-md shadow-red-600/30">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <span className="inline-block text-[11px] font-bold tracking-wider uppercase text-red-700">
                  Official Community Signage
                </span>
                <h2 className="font-serif text-xl font-bold text-red-950 sm:text-2xl">
                  HOA Rules & Regulations
                </h2>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white/80 px-3.5 py-1 text-xs font-semibold text-red-800">
              <Sparkles className="h-3.5 w-3.5 text-red-600" />
              10 Core Subdivision Rules
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-red-900/80 sm:text-sm">
            These 10 official regulations are actively posted and enforced throughout the subdivision
            by the Homeowners' Association (HOA) in partnership with Barangay Salawag, City of
            Dasmariñas, Cavite. All residents, tenants, and visitors are required to strictly comply.
          </p>
        </div>

        {/* 10 Official Rules Cards */}
        <div className="space-y-4">
          {officialHoarules.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.number}
                className="group relative overflow-hidden rounded-2xl border border-[#123f2a]/10 bg-white p-5 shadow-[0_4px_20px_-2px_rgba(18,63,42,0.05)] transition-all duration-200 hover:border-red-300 hover:shadow-md sm:p-6"
              >
                <div className="flex items-start gap-4">
                  {/* Number Badge */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-base font-extrabold text-white shadow-sm shadow-red-600/25 group-hover:scale-105 transition-transform duration-200">
                    {item.number}
                  </div>

                  {/* Rule Details */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base font-bold uppercase tracking-tight text-red-700 sm:text-lg">
                        {item.number}. {item.rule}
                      </h3>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-700 border border-red-200/60">
                        <Icon className="h-3 w-3" />
                        {item.tagline}
                      </span>
                    </div>

                    <p className="mt-2 text-sm leading-relaxed text-[#4b574f]">
                      {item.description}
                    </p>

                    <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-100">
                      <span className="font-semibold text-red-700">Paalala:</span>
                      <span>{item.note}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Supplementary Guidelines Section */}
        <div className="mt-14">
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-widest text-[#54b868]">
              Additional Policies
            </span>
            <h2 className="font-serif text-2xl font-bold text-[#123f2a]">
              Community Guidelines & Administration
            </h2>
            <p className="mt-1 text-sm text-[#5e6e62]">
              Supplemental policies covering subdivision operations, property listings, and HOA services.
            </p>
          </div>

          <div className="space-y-6">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <div
                  key={section.id}
                  id={section.id}
                  className="rounded-3xl border border-[#123f2a]/10 bg-white p-6 shadow-[0_4px_20px_-2px_rgba(18,63,42,0.05)] scroll-mt-24"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#e8f3ec]">
                      <Icon className="h-4.5 w-4.5 text-[#123f2a]" />
                    </div>
                    <h3 className="font-serif text-lg font-bold text-[#123f2a] sm:text-xl">
                      {section.title}
                    </h3>
                  </div>
                  <ul className="space-y-2.5">
                    {section.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-sm text-[#5e6e62]">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#54b868]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info & navigation */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[#d1e7dd] pt-8 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-[#123f2a]/20 bg-white px-5 py-2.5 text-sm font-semibold text-[#123f2a] shadow-xs transition-all duration-200 hover:border-[#123f2a] hover:bg-[#123f2a] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <div className="text-center sm:text-right">
            <p className="text-xs font-semibold text-[#123f2a]">
              Mabuhay Homes 2000 Homeowners' Association
            </p>
            <p className="text-xs text-[#5e6e62]">
              In coordination with Barangay Salawag, City of Dasmariñas, Cavite
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
