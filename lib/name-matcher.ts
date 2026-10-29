import dbConnect from "./mongoose";
import { User, ResidentMasterList, RoleAuditLog } from "@/models";
import { updateUserById, userFilter, getUserById } from "./db";
import { isOnlineMode } from "./db-router";
import * as maria from "./mariadb-service";

const SUFFIXES = new Set([
  "jr",
  "jr.",
  "sr",
  "sr.",
  "ii",
  "iii",
  "iv",
  "v",
  "vi",
  "2nd",
  "3rd",
  "4th",
]);

/**
 * Normalizes a resident's name for matching:
 * - Removes accents and diacritics
 * - Detects "Last, First" format and rearranges to "First Last"
 * - Converts to lowercase
 * - Strips all non-alphanumeric punctuation
 * - Strips middle initials (single character tokens) and common suffixes (Jr, Sr, III)
 * - Trims and collapses multiple spaces
 */
export function normalizeResidentName(rawName: string): string {
  if (!rawName || typeof rawName !== "string") return "";

  let cleaned = rawName.trim();
  if (!cleaned) return "";

  // Handle "Last, First" format if comma is present
  if (cleaned.includes(",")) {
    const parts = cleaned.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const lastName = parts[0];
      const firstNamePart = parts.slice(1).join(" ");
      cleaned = `${firstNamePart} ${lastName}`;
    }
  }

  // Strip diacritics/accents (e.g. é -> e, ñ -> n)
  cleaned = cleaned.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Lowercase
  cleaned = cleaned.toLowerCase();

  // Replace punctuation & symbols with space
  cleaned = cleaned.replace(/[^a-z0-9\s]/g, " ");

  // Tokenize
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return "";

  // Filter out suffixes and middle initials (single letters)
  const filtered = tokens.filter((t) => {
    if (SUFFIXES.has(t)) return false;
    if (t.length === 1) return false; // Ignore single-character middle initial
    return true;
  });

  const finalTokens = filtered.length > 0 ? filtered : tokens;
  return finalTokens.join(" ");
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface MatchResult {
  matched: boolean;
  promoted: boolean;
  needsReview: boolean;
  reason?: string;
  record?: any;
}

/**
 * Matches a user against the resident master list and performs server-side promotion if eligible.
 * Guaranteed to never fail the calling auth flow (safely wrapped).
 * Guaranteed to never downgrade admin or counselor accounts.
 *
 * Matching Priority Order:
 * 1. Verified Email Address against ResidentMasterList.email
 * 2. Exact Normalized Name match against ResidentMasterList.normalizedName
 *    (Disambiguated by block/lot if multiple records exist)
 * 3. Partial/Middle name variation heuristic (flagged for admin review)
 */
export async function matchAndPromoteUser(
  userId: number | string,
  fullName: string,
  source: "signup" | "google" | "import" | "admin"
): Promise<MatchResult> {
  try {
    const online = await isOnlineMode();
    if (!online) {
      return { matched: false, promoted: false, needsReview: false, reason: "Offline mode" };
    }

    await dbConnect();

    // Fetch user from DB using resilient multi-field filter
    const filter = userFilter(userId);
    let userDoc: any = await User.findOne(filter as any).lean();
    if (!userDoc) {
      try {
        userDoc = await maria.getUserByIdMariaDB(userId);
      } catch {}
    }

    if (!userDoc) {
      return { matched: false, promoted: false, needsReview: false, reason: "User not found" };
    }

    // Safety rule: Admin and super admin accounts must never be downgraded or changed by this feature
    if (userDoc.role === "admin" || userDoc.role === "counselor") {
      return { matched: false, promoted: false, needsReview: false, reason: "Protected administrative role" };
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PRIORITY 1: EMAIL MATCHING
    // ──────────────────────────────────────────────────────────────────────────
    const userEmail = typeof userDoc.email === "string" ? userDoc.email.trim().toLowerCase() : "";
    if (userEmail) {
      const escapedEmail = escapeRegex(userEmail);
      const emailMatches = await ResidentMasterList.find({
        email: { $regex: new RegExp(`^\\s*${escapedEmail}\\s*$`, "i") },
      }).lean();

      if (emailMatches.length >= 1) {
        // Find unclaimed or already linked to this user
        const targetMatch =
          emailMatches.find(
            (m) =>
              m.status === "unclaimed" ||
              String(m.linkedUserId) === String(userDoc._id ?? userId)
          ) || emailMatches[0];

        if (
          targetMatch.status === "unclaimed" ||
          String(targetMatch.linkedUserId) === String(userDoc._id ?? userId)
        ) {
          const updateData: Record<string, unknown> = {
            role: "resident",
            needsReview: false,
            needsReviewReason: null,
          };

          if (targetMatch.block && !userDoc.blockNo) updateData.blockNo = targetMatch.block;
          if (targetMatch.lot && !userDoc.lotNo) updateData.lotNo = targetMatch.lot;
          if (targetMatch.phone && !userDoc.phone) updateData.phone = targetMatch.phone;

          await User.updateOne(filter as any, { $set: updateData });

          await ResidentMasterList.updateOne(
            { _id: targetMatch._id },
            {
              $set: {
                status: "claimed",
                linkedUserId: userDoc._id ?? userId,
              },
            }
          );

          await RoleAuditLog.create({
            userId: userDoc._id ?? userId,
            userEmail: userDoc.email,
            oldRole: userDoc.role || "non_resident",
            newRole: "resident",
            matchedRecordId: targetMatch._id,
            matchedName: targetMatch.fullName,
            source,
            timestamp: new Date(),
            details: `Automatically promoted by verified master list email match ("${targetMatch.email}")`,
          });

          try {
            maria.updateUserByIdMariaDB(userId, {
              role: "resident",
              blockNo: (updateData.blockNo as string) || userDoc.blockNo,
              lotNo: (updateData.lotNo as string) || userDoc.lotNo,
              phone: (updateData.phone as string) || userDoc.phone,
            }).catch(() => {});
          } catch {}

          return {
            matched: true,
            promoted: true,
            needsReview: false,
            record: targetMatch,
          };
        }
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PRIORITY 2: EXACT NAME MATCHING
    // ──────────────────────────────────────────────────────────────────────────
    const norm = normalizeResidentName(fullName || userDoc.fullName);
    if (!norm) {
      return { matched: false, promoted: false, needsReview: false, reason: "Empty normalized name" };
    }

    // Search residentmasterlist by normalizedName
    let exactMatches = await ResidentMasterList.find({ normalizedName: norm }).lean();

    // If multiple records match by name, check if block & lot disambiguates them
    if (exactMatches.length > 1 && (userDoc.blockNo || userDoc.lotNo)) {
      const narrowed = exactMatches.filter((m) => {
        const blockMatch = !userDoc.blockNo || String(m.block).trim() === String(userDoc.blockNo).trim();
        const lotMatch = !userDoc.lotNo || String(m.lot).trim() === String(userDoc.lotNo).trim();
        return blockMatch && lotMatch;
      });
      if (narrowed.length === 1) {
        exactMatches = narrowed;
      }
    }

    if (exactMatches.length === 1) {
      const match = exactMatches[0];

      if (match.status === "unclaimed" || String(match.linkedUserId) === String(userDoc._id ?? userId)) {
        // EXACT SINGLE UNCLAIMED MATCH -> PROMOTE TO RESIDENT
        const updateData: Record<string, unknown> = {
          role: "resident",
          needsReview: false,
          needsReviewReason: null,
        };

        // Copy block & lot if present in master list and not already set on user
        if (match.block && !userDoc.blockNo) {
          updateData.blockNo = match.block;
        }
        if (match.lot && !userDoc.lotNo) {
          updateData.lotNo = match.lot;
        }
        if (match.phone && !userDoc.phone) {
          updateData.phone = match.phone;
        }

        // Apply update in Mongo
        await User.updateOne(filter as any, { $set: updateData });

        // Claim the master list record
        await ResidentMasterList.updateOne(
          { _id: match._id },
          {
            $set: {
              status: "claimed",
              linkedUserId: userDoc._id ?? userId,
            },
          }
        );

        // Record in audit log
        await RoleAuditLog.create({
          userId: userDoc._id ?? userId,
          userEmail: userDoc.email,
          oldRole: userDoc.role || "non_resident",
          newRole: "resident",
          matchedRecordId: match._id,
          matchedName: match.fullName,
          source,
          timestamp: new Date(),
          details: `Automatically promoted by name match ("${match.fullName}" -> "${norm}")`,
        });

        // Mirror update to MariaDB if active
        try {
          maria.updateUserByIdMariaDB(userId, {
            role: "resident",
            blockNo: (updateData.blockNo as string) || userDoc.blockNo,
            lotNo: (updateData.lotNo as string) || userDoc.lotNo,
            phone: (updateData.phone as string) || userDoc.phone,
          }).catch(() => {});
        } catch {}

        return {
          matched: true,
          promoted: true,
          needsReview: false,
          record: match,
        };
      } else {
        // Record was already claimed by another user!
        // Do NOT promote, keep non_resident, and flag needsReview
        await User.updateOne(filter as any, {
          $set: {
            needsReview: true,
            needsReviewReason: `Master list record "${match.fullName}" is already claimed by another user.`,
          },
        });

        return {
          matched: true,
          promoted: false,
          needsReview: true,
          reason: "Record already claimed by another account",
          record: match,
        };
      }
    } else if (exactMatches.length > 1) {
      // 2 or more matches in master list -> Ambiguous!
      // Do NOT promote, flag for admin manual review
      await User.updateOne(filter as any, {
        $set: {
          needsReview: true,
          needsReviewReason: `Multiple matching records (${exactMatches.length}) found in the master list for "${norm}".`,
        },
      });

      return {
        matched: true,
        promoted: false,
        needsReview: true,
        reason: "Multiple matching records found",
      };
    }

    // Zero exact matches: check secondary heuristic for partial/middle name variations
    const tokens = norm.split(" ").filter(Boolean);
    if (tokens.length >= 2) {
      const first = tokens[0];
      const last = tokens[tokens.length - 1];
      const candidateRegex = new RegExp(`^${escapeRegex(first)}\\s+.*\\b${escapeRegex(last)}$`, "i");

      const partialMatches = await ResidentMasterList.find({
        normalizedName: candidateRegex,
      }).lean();

      if (partialMatches.length > 0) {
        // Flag for manual review so admin can easily link
        const candidateNames = partialMatches.map((m) => m.fullName).slice(0, 3).join(", ");
        await User.updateOne(filter as any, {
          $set: {
            needsReview: true,
            needsReviewReason: `Potential master-list match (${candidateNames}) with name variation.`,
          },
        });

        return {
          matched: false,
          promoted: false,
          needsReview: true,
          reason: `Potential match with variation: ${candidateNames}`,
        };
      }
    }

    // No match found — stays non_resident without review flag
    return {
      matched: false,
      promoted: false,
      needsReview: false,
    };
  } catch (err: any) {
    console.error("[NameMatcher] Error during name matching:", err?.message || err);
    // Fail safely: never throw or break calling process
    return {
      matched: false,
      promoted: false,
      needsReview: false,
      reason: err?.message || "Matching error",
    };
  }
}

/**
 * Retroactively scans all non-resident users and attempts to match them against the master list.
 */
export async function retroactiveMatchAllNonResidents(
  importedBy = "admin"
): Promise<{ checked: number; promoted: number; flaggedForReview: number }> {
  let checked = 0;
  let promoted = 0;
  let flaggedForReview = 0;

  try {
    const online = await isOnlineMode();
    if (!online) return { checked, promoted, flaggedForReview };

    await dbConnect();

    // Find all active non-resident users who are not archived
    const nonResidents = await User.find({
      role: "non_resident",
      $or: [{ isArchived: false }, { isArchived: { $exists: false } }],
    }).lean();

    checked = nonResidents.length;

    for (const u of nonResidents) {
      const res = await matchAndPromoteUser(
        (u as any)._id,
        (u as any).fullName,
        "import"
      );
      if (res.promoted) {
        promoted++;
      } else if (res.needsReview) {
        flaggedForReview++;
      }
    }
  } catch (err: any) {
    console.error("[NameMatcher] Retroactive matching error:", err?.message || err);
  }

  return { checked, promoted, flaggedForReview };
}
