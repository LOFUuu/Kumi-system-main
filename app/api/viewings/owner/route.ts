import { NextRequest, NextResponse } from "next/server";
import { getListings, getPropertyViewings } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { isHowaRole } from "@/lib/role";

export const dynamic = "force-dynamic";

// GET /api/viewings/owner — fetch viewing requests for listings owned by the logged-in user
export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  // Retrieve all listings
  const allListings = await getListings();

  // Find listings owned by this user (whether uploadedBy or ownerId matches)
  const isHowa = isHowaRole(user.role);
  const myListings = allListings.filter(
    (l) =>
      !l.isArchived &&
      Boolean(
        user.id &&
          (l.uploadedBy === user.id || l.ownerId === user.id)
      )
  );

  const hasListings = myListings.length > 0;
  const ownedListingIds = new Set(myListings.map((l) => l.id));

  // Retrieve viewings
  const allViewings = await getPropertyViewings();

  // Filter viewings:
  // If user is admin/howa, they can view all, but for homeowner viewings page,
  // return viewings belonging to user's listings (or all if admin requested without user listings)
  const ownerViewings = allViewings.filter((v) => ownedListingIds.has(v.listingId));

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status");
  const summaryMode = searchParams.get("summary") === "true";

  let filtered = ownerViewings;
  if (statusFilter && statusFilter !== "all") {
    filtered = filtered.filter((v) => v.status === statusFilter);
  }

  const pendingCount = ownerViewings.filter((v) => v.status === "viewing_requested").length;

  const headers = {
    "X-Has-Listings": String(hasListings),
    "X-Pending-Count": String(pendingCount),
  };

  if (summaryMode) {
    return NextResponse.json(
      {
        viewings: filtered,
        pendingCount,
        hasListings,
        listingCount: myListings.length,
      },
      { headers }
    );
  }

  return NextResponse.json(filtered, { headers });
}
