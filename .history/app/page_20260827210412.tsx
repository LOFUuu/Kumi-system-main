import Link from "next/link";
import { ListingCard, StatBox } from "@/components/ui";
import Reveal from "@/components/Reveal";
import { MOCK_LISTINGS, MOCK_ANNOUNCEMENTS, MOCK_USERS } from "@/lib/mock-data";

export default function HomePage() {
  const featured = MOCK_LISTINGS.filter((l) => l.status === "available").slice(
    0,
    4,
  );
  const anns = MOCK_ANNOUNCEMENTS.filter((a) => a.status === "active").slice(
    0,
    3,
  );
  const totalResidents = MOCK_USERS.filter((u) => u.role === "resident").length;
  const totalHouses = MOCK_LISTINGS.filter(
    (l) => l.status === "available",
  ).length;

  return (
    <>
      {/* HERO */}
      <section className="relative flex min-h-[540px] items-center overflow-hidden bg-gradient-to-br from-green-deep via-green-dark to-green-mid">
        <div className="absolute right-[-80px] top-[-80px] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(244,196,48,.08),transparent_70%)]" />
        <div className="relative z-10 max-w-3xl px-8 py-16">
          <h1 className="font-serif text-6xl font-black leading-tight text-white">
            Welcome to <br />
            <em className="not-italic text-gold">Mabuhay Homes</em>
            <span className="mt-2 block text-2xl font-normal opacity-85">
              MABUHAY HOMES 2000 PHASE 5
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/70">
            Your community hub for house listings, amenity reservations, monthly
            dues tracking, and official announcements.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/house-listing" className="btn-gold">
              View Listings
            </Link>
            <Link href="/reservation" className="btn-outline-w">
              Book Amenity
            </Link>
          </div>
        </div>
      </section>

      {/* STATS */}
      <Reveal
        className="mx-auto grid max-w-5xl gap-5 px-4 sm:grid-cols-2 -mt-10"
        stagger
      >
        <StatBox icon="🏘️" value={totalResidents} label="Total Residents" />
        <StatBox icon="🏠" value={totalHouses} label="Total Houses" />
      </Reveal>

      {/* FEATURED */}
      <section className="section">
        <div className="section-head">
          <h2>Featured Listings</h2>
          <p>Premium homes available in Mabuhay Homes</p>
        </div>
        <Reveal className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4" stagger>
          {featured.map((h) => (
            <ListingCard key={h.id} listing={h} />
          ))}
        </Reveal>
      </section>

      {/* ANNOUNCEMENTS PREVIEW */}
      <section className="section !pt-0">
        <div className="section-head">
          <h2>Latest Announcements</h2>
          <p>Stay up to date with community news</p>
        </div>
        <Reveal className="grid gap-6 md:grid-cols-3" stagger>
          {anns.map((a) => (
            <div key={a.id} className="card">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-mid">
                {a.postDate}
              </div>
              <h3 className="font-serif text-xl font-bold text-green-dark">
                {a.title}
              </h3>
              <p className="mt-2 line-clamp-3 text-sm text-muted">
                {a.content}
              </p>
            </div>
          ))}
        </Reveal>
        <div className="mt-8 text-center">
          <Link href="/announcements" className="btn-ghost">
            View All Announcements →
          </Link>
        </div>
      </section>
    </>
  );
}
