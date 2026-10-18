import mongoose, { Schema, model, models } from "mongoose";

export interface ResidentMasterListRecord {
  _id?: any;
  id?: string | number;
  fullName: string;
  normalizedName: string;
  block?: string;
  lot?: string;
  email?: string;
  phone?: string;
  status: "unclaimed" | "claimed";
  linkedUserId?: any;
  importedBy?: string | number;
  importedAt?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface RoleAuditLogRecord {
  _id?: any;
  userId: any;
  userEmail?: string;
  oldRole: string;
  newRole: string;
  matchedRecordId?: any;
  matchedName?: string;
  source: "import" | "signup" | "google" | "admin";
  timestamp: Date | string;
  details?: string;
  performedBy?: string | number;
}

const residentMasterListSchema = new Schema<ResidentMasterListRecord>(
  {
    fullName: { type: String, required: true },
    normalizedName: { type: String, required: true, index: true },
    block: { type: String, default: null },
    lot: { type: String, default: null },
    email: { type: String, default: null },
    phone: { type: String, default: null },
    status: {
      type: String,
      enum: ["unclaimed", "claimed"],
      default: "unclaimed",
      required: true,
      index: true,
    },
    linkedUserId: { type: Schema.Types.Mixed, default: null, index: true },
    importedBy: { type: Schema.Types.Mixed, default: "admin" },
    importedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: "residentmasterlist",
  }
);

// Compound index to help identify exact duplicates upon import
residentMasterListSchema.index(
  { normalizedName: 1, block: 1, lot: 1 },
  { unique: false }
);

const roleAuditLogSchema = new Schema<RoleAuditLogRecord>(
  {
    userId: { type: Schema.Types.Mixed, required: true, index: true },
    userEmail: { type: String, default: null },
    oldRole: { type: String, required: true },
    newRole: { type: String, required: true },
    matchedRecordId: { type: Schema.Types.Mixed, default: null },
    matchedName: { type: String, default: null },
    source: {
      type: String,
      enum: ["import", "signup", "google", "admin"],
      required: true,
      index: true,
    },
    timestamp: { type: Date, default: Date.now },
    details: { type: String, default: null },
    performedBy: { type: Schema.Types.Mixed, default: null },
  },
  {
    timestamps: true,
    collection: "roleauditlogs",
  }
);

export const ResidentMasterList =
  (models.ResidentMasterList as mongoose.Model<ResidentMasterListRecord>) ||
  model<ResidentMasterListRecord>("ResidentMasterList", residentMasterListSchema);

export const RoleAuditLog =
  (models.RoleAuditLog as mongoose.Model<RoleAuditLogRecord>) ||
  model<RoleAuditLogRecord>("RoleAuditLog", roleAuditLogSchema);
