import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { User, ResidentMasterList, RoleAuditLog } from "@/models";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { isHowaRole } from "@/lib/role";
import * as maria from "@/lib/mariadb-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser || !isHowaRole(authUser.role)) {
      return NextResponse.json({ error: "HOWA access only" }, { status: 403 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      // Return all unclaimed master list records
      const unclaimed = await ResidentMasterList.find({ status: "unclaimed" })
        .sort({ fullName: 1 })
        .limit(100)
        .lean();
      return NextResponse.json({ records: unclaimed });
    }

    const user = await User.findOne({
      $or: [{ _id: Number(userId) }, { _id: userId }, { id: Number(userId) }],
    } as any).lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { normalizeResidentName } = await import("@/lib/name-matcher");
    const norm = normalizeResidentName((user as any).fullName);

    // Find exact or partial matches in ResidentMasterList
    const exact = await ResidentMasterList.find({ normalizedName: norm }).lean();
    const tokens = norm.split(" ").filter(Boolean);
    let partial: any[] = [];
    if (tokens.length >= 2) {
      const first = tokens[0];
      const last = tokens[tokens.length - 1];
      partial = await ResidentMasterList.find({
        normalizedName: new RegExp(`^${first}\\s+.*\\b${last}$`, "i"),
      }).lean();
    }

    const allCandidates = [...exact, ...partial];
    // Deduplicate candidates by _id
    const seen = new Set<string>();
    const uniqueCandidates = allCandidates.filter((c) => {
      const idStr = String(c._id);
      if (seen.has(idStr)) return false;
      seen.add(idStr);
      return true;
    });

    return NextResponse.json({
      user: {
        id: (user as any)._id,
        fullName: (user as any).fullName,
        email: (user as any).email,
        role: (user as any).role,
        needsReview: (user as any).needsReview,
        needsReviewReason: (user as any).needsReviewReason,
      },
      candidates: uniqueCandidates,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch review data" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser || !isHowaRole(authUser.role)) {
      return NextResponse.json({ error: "HOWA access only" }, { status: 403 });
    }

    await dbConnect();
    const body = await req.json().catch(() => ({}));
    const { userId, action, masterListRecordId } = body;

    if (!userId || !["approve", "dismiss"].includes(action)) {
      return NextResponse.json(
        { error: "userId and a valid action ('approve' | 'dismiss') are required" },
        { status: 400 }
      );
    }

    const numId = Number(userId);
    const filter = Number.isFinite(numId)
      ? { $or: [{ _id: numId }, { id: numId }, { _id: String(userId) }] }
      : { _id: userId };

    const user = await User.findOne(filter as any).lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (action === "approve") {
      const updateData: Record<string, unknown> = {
        role: "resident",
        needsReview: false,
        needsReviewReason: null,
      };

      let matchedRecord: any = null;
      if (masterListRecordId) {
        matchedRecord = await ResidentMasterList.findById(masterListRecordId);
        if (matchedRecord) {
          if (matchedRecord.block && !(user as any).blockNo) updateData.blockNo = matchedRecord.block;
          if (matchedRecord.lot && !(user as any).lotNo) updateData.lotNo = matchedRecord.lot;

          await ResidentMasterList.updateOne(
            { _id: masterListRecordId },
            { $set: { status: "claimed", linkedUserId: (user as any)._id } }
          );
        }
      }

      await User.updateOne(filter as any, { $set: updateData });

      // Audit log entry
      await RoleAuditLog.create({
        userId: (user as any)._id,
        userEmail: (user as any).email,
        oldRole: (user as any).role || "non_resident",
        newRole: "resident",
        matchedRecordId: matchedRecord?._id || null,
        matchedName: matchedRecord?.fullName || null,
        source: "admin",
        timestamp: new Date(),
        details: `Manually approved by admin ${authUser.email || authUser.fullName}${
          matchedRecord ? ` and linked to record "${matchedRecord.fullName}"` : ""
        }`,
        performedBy: authUser.email || authUser.id,
      });

      try {
        maria.updateUserByIdMariaDB(userId, {
          role: "resident",
          blockNo: (updateData.blockNo as string) || (user as any).blockNo,
          lotNo: (updateData.lotNo as string) || (user as any).lotNo,
        }).catch(() => {});
      } catch {}

      const updatedUser = await User.findOne(filter as any).lean();
      return NextResponse.json({
        ok: true,
        message: `User ${(user as any).fullName} is now approved as Resident.`,
        user: updatedUser,
      });
    } else {
      // Dismiss review flag without promoting
      await User.updateOne(filter as any, {
        $set: {
          needsReview: false,
          needsReviewReason: null,
        },
      });

      return NextResponse.json({
        ok: true,
        message: `Review flag dismissed for ${(user as any).fullName}.`,
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to process review" },
      { status: 500 }
    );
  }
}
