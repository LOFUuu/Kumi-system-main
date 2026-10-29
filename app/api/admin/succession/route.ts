import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { User, RoleAuditLog } from "@/models";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { updateUserById, getUserById, userFilter } from "@/lib/db";
import * as maria from "@/lib/mariadb-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser || authUser.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized. Only the active Administrator or Association President can execute a leadership transfer." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { successorUserId, outgoingAdminRole = "resident", reason } = body;

    if (!successorUserId) {
      return NextResponse.json(
        { error: "Please select an authorized successor account." },
        { status: 400 }
      );
    }

    if (!["resident", "counselor", "admin"].includes(outgoingAdminRole)) {
      return NextResponse.json(
        { error: "Invalid outgoing administrator role specified ('resident', 'counselor', or 'admin')." },
        { status: 400 }
      );
    }

    await dbConnect();

    // 1. Verify successor account
    const successor = await getUserById(successorUserId);
    if (!successor) {
      return NextResponse.json(
        { error: "The selected successor user account was not found in the database." },
        { status: 404 }
      );
    }

    if (String(successor.id) === String(authUser.id)) {
      return NextResponse.json(
        { error: "Cannot transfer leadership to yourself. Please select another authorized officer or resident." },
        { status: 400 }
      );
    }

    const handoverReason = typeof reason === "string" && reason.trim()
      ? reason.trim()
      : "Association President and Administrator Succession Transfer";

    // 2. Promote successor to Admin
    const oldSuccessorRole = successor.role;
    const updatedSuccessor = await updateUserById(successor.id, {
      role: "admin",
      isActive: true,
      needsReview: false,
      needsReviewReason: undefined,
    });

    try {
      await maria.updateUserByIdMariaDB(successor.id, {
        role: "admin",
        isActive: true,
      });
    } catch {}

    // 3. Log successor promotion in RoleAuditLog
    await RoleAuditLog.create({
      userId: successor.id,
      userEmail: successor.email,
      oldRole: oldSuccessorRole,
      newRole: "admin",
      source: "admin",
      timestamp: new Date(),
      performedBy: authUser.email || authUser.id,
      details: `Administrative succession: Handed over HOA President / Admin authority from ${authUser.fullName} (${authUser.email}) to ${successor.fullName} (${successor.email}). Reason: ${handoverReason}`,
    });

    // 4. Update outgoing admin if stepping down
    let updatedOutgoing = authUser;
    if (outgoingAdminRole !== "admin") {
      const outgoingResult = await updateUserById(authUser.id, {
        role: outgoingAdminRole as any,
      });
      if (outgoingResult) {
        updatedOutgoing = outgoingResult;
      }

      try {
        await maria.updateUserByIdMariaDB(authUser.id, {
          role: outgoingAdminRole as any,
        });
      } catch {}

      await RoleAuditLog.create({
        userId: authUser.id,
        userEmail: authUser.email,
        oldRole: "admin",
        newRole: outgoingAdminRole,
        source: "admin",
        timestamp: new Date(),
        performedBy: authUser.email || authUser.id,
        details: `Outgoing administrator stepped down to '${outgoingAdminRole}' following succession handover to ${successor.fullName}.`,
      });
    }

    return NextResponse.json({
      ok: true,
      message: `Administrative responsibility successfully transferred to ${successor.fullName}. They can now sign in with their own credentials.`,
      successor: {
        id: successor.id,
        fullName: successor.fullName,
        email: successor.email,
        role: "admin",
      },
      outgoingAdmin: {
        id: authUser.id,
        fullName: authUser.fullName,
        email: authUser.email,
        role: outgoingAdminRole,
      },
    });
  } catch (err: any) {
    console.error("[Succession] Transfer error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to process administrative succession." },
      { status: 500 }
    );
  }
}
