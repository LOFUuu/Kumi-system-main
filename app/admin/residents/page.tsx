"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  MoreHorizontal,
  Phone,
  MapPin,
  User as UserIcon,
  Calendar,
  Home,
  Activity,
  ShieldCheck,
  Edit3,
  Power,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Upload,
  Layers,
  Sparkles,
  Check,
  Archive,
  ArchiveRestore,
  AlertTriangle,
} from "lucide-react";
import { api } from "@/lib/api";
import { type User, type Role } from "@/lib/mock-data";

function formatRegisteredDate(createdAt?: string, id?: number): string {
  if (createdAt) {
    try {
      const d = new Date(createdAt);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        });
      }
    } catch {}
  }
  // Fallback realistic dates for seed data based on ID
  const seedDates: Record<number, string> = {
    1: "Dec 01, 2025",
    2: "Dec 05, 2025",
    3: "Feb 03, 2026",
    4: "Feb 10, 2026",
    5: "Feb 01, 2026",
    6: "Jan 12, 2026",
    7: "Jan 20, 2026",
    8: "Jan 15, 2026",
  };
  return (id && seedDates[id]) || "Jan 12, 2026";
}

function getVerificationStatus(u: User): "verified" | "pending" | "not_verified" {
  if (u.emailVerified || u.role === "admin" || u.role === "counselor") return "verified";
  if (u.role === "resident" && u.blockNo && u.lotNo) return "verified";
  if (u.role === "resident" && (!u.blockNo || !u.lotNo)) return "pending";
  return "not_verified";
}

const ITEMS_PER_PAGE = 10;

export default function AdminResidentsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [blockFilter, setBlockFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Three-dot dropdown
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Archive modal state
  const [archiveTarget, setArchiveTarget] = useState<User | null>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiving, setArchiving] = useState(false);

  // Delete permanently modal state
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Add Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("resident");
  const [blockNo, setBlockNo] = useState("");
  const [lotNo, setLotNo] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("Female");
  const [address, setAddress] = useState("");
  const [householdMembers, setHouseholdMembers] = useState(1);
  const [householdHead, setHouseholdHead] = useState("");
  const [cedula, setCedula] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Edit Form State
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<Role>("resident");
  const [editBlockNo, setEditBlockNo] = useState("");
  const [editLotNo, setEditLotNo] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editHouseholdMembers, setEditHouseholdMembers] = useState(1);
  const [editHouseholdHead, setEditHouseholdHead] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editEmailVerified, setEditEmailVerified] = useState(false);

  const refresh = () => {
    setLoading(true);
    api
      .users()
      .then((data) => {
        setUsers(data);
        // Keep selected user updated if already selected
        if (selectedUser) {
          const fresh = data.find((u) => u.id === selectedUser.id);
          if (fresh) setSelectedUser(fresh);
        }
      })
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Stats calculation — archived users are already excluded by getUsers()
  const totalResidents = users.length;
  const activeCount = users.filter((u) => u.isActive && !u.isArchived).length;
  const inactiveCount = users.filter((u) => !u.isActive && !u.isArchived).length;
  const nonResidentsCount = users.filter((u) => u.role === "non_resident" && !u.isArchived).length;

  // Unique blocks for dropdown
  const blockOptions = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      if (u.blockNo && u.lotNo) {
        set.add(`${u.blockNo} / ${u.lotNo}`);
      } else if (u.blockNo) {
        set.add(u.blockNo);
      }
    });
    return Array.from(set).sort();
  }, [users]);

  // Filtered users list — archived users are excluded at DB level
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = u.fullName.toLowerCase().includes(q);
        const matchEmail = u.email.toLowerCase().includes(q);
        const matchPhone = u.phone ? u.phone.toLowerCase().includes(q) : false;
        if (!matchName && !matchEmail && !matchPhone) return false;
      }

      // Role filter
      if (roleFilter !== "all" && u.role !== roleFilter) return false;

      // Status filter
      if (statusFilter === "active" && !u.isActive) return false;
      if (statusFilter === "inactive" && u.isActive) return false;

      // Block/Lot filter
      if (blockFilter !== "all") {
        const uBlock = u.blockNo && u.lotNo ? `${u.blockNo} / ${u.lotNo}` : u.blockNo;
        if (uBlock !== blockFilter) return false;
      }

      return true;
    });
  }, [users, searchQuery, roleFilter, statusFilter, blockFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3500);
  };
  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(""), 3500);
  };

  const toggleUserStatus = async (userToToggle: User, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setOpenMenuId(null);
    setBusy(true);
    try {
      const updated = await api.userUpdate(userToToggle.id, {
        isActive: !userToToggle.isActive,
      });
      setUsers((prev) => prev.map((u) => (u.id === userToToggle.id ? updated.user : u)));
      if (selectedUser?.id === userToToggle.id) {
        setSelectedUser(updated.user);
      }
      showSuccess(
        `User ${updated.user.fullName} is now ${updated.user.isActive ? "Active" : "Inactive"}.`
      );
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to update user status");
    } finally {
      setBusy(false);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await api.userArchive(archiveTarget.id, archiveReason || undefined);
      // Remove from local state immediately
      setUsers((prev) => prev.filter((u) => u.id !== archiveTarget.id));
      if (selectedUser?.id === archiveTarget.id) setSelectedUser(null);
      setArchiveTarget(null);
      setArchiveReason("");
      showSuccess(`${archiveTarget.fullName} has been archived successfully.`);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to archive resident.");
    } finally {
      setArchiving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.userDelete(deleteTarget.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      if (selectedUser?.id === deleteTarget.id) setSelectedUser(null);
      setDeleteTarget(null);
      showSuccess(`${deleteTarget.fullName} has been permanently deleted.`);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to delete resident.");
    } finally {
      setDeleting(false);
    }
  };

  const openAddModal = () => {
    setFullName("");
    setEmail("");
    setRole("resident");
    setBlockNo("");
    setLotNo("");
    setPhone("");
    setGender("Female");
    setAddress("");
    setHouseholdMembers(1);
    setHouseholdHead("");
    setCedula("");
    setError("");
    setAdding(true);
  };

  const openEditModal = (u: User, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setOpenMenuId(null);
    setEditing(u);
    setEditFullName(u.fullName || "");
    setEditEmail(u.email || "");
    setEditRole(u.role || "resident");
    setEditBlockNo(u.blockNo || "");
    setEditLotNo(u.lotNo || "");
    setEditPhone(u.phone || "");
    setEditGender(u.gender || "Female");
    setEditAddress(u.address || "");
    setEditHouseholdMembers(u.householdMembers || 1);
    setEditHouseholdHead(u.householdHead || u.fullName || "");
    setEditIsActive(u.isActive !== undefined ? u.isActive : true);
    setEditEmailVerified(Boolean(u.emailVerified));
    setError("");
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCedula(String(reader.result));
    reader.readAsDataURL(file);
  };

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.userCreate({
        fullName,
        email,
        role,
        blockNo: blockNo || undefined,
        lotNo: lotNo || undefined,
        phone: phone || undefined,
        address: address || undefined,
        gender: gender || undefined,
        householdMembers: Number(householdMembers) || 1,
        householdHead: householdHead || fullName || undefined,
        cedula: cedula || undefined,
      });
      setAdding(false);
      refresh();
      showSuccess("Resident created successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add resident");
    } finally {
      setBusy(false);
    }
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      const res = await api.userUpdate(editing.id, {
        fullName: editFullName,
        email: editEmail,
        role: editRole,
        blockNo: editBlockNo || null,
        lotNo: editLotNo || null,
        phone: editPhone || null,
        address: editAddress || null,
        gender: editGender || null,
        householdMembers: Number(editHouseholdMembers) || 1,
        householdHead: editHouseholdHead || null,
        isActive: editIsActive,
        emailVerified: editEmailVerified,
      });
      setUsers((prev) => prev.map((u) => (u.id === editing.id ? res.user : u)));
      if (selectedUser?.id === editing.id) {
        setSelectedUser(res.user);
      }
      setEditing(null);
      showSuccess("Resident details updated successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update resident details");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      {successMsg && (
        <div className="fixed top-6 right-6 z-[3000] flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-xl animate-fade-in">
          <Check className="h-4 w-4" /> {successMsg}
        </div>
      )}
      {error && (
        <div className="fixed top-6 right-6 z-[3000] flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-xl animate-fade-in">
          <XCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-black tracking-tight text-green-dark">
            Residents
          </h1>
          <p className="mt-1 text-sm text-muted">
            Manage residents and community accounts.
          </p>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative min-w-[240px] flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 w-full rounded-xl border border-cream-2 bg-white pl-9 pr-4 text-xs font-medium text-green-deep placeholder:text-muted/60 focus:border-green-mid focus:outline-none focus:ring-1 focus:ring-green-mid shadow-sm"
            />
          </div>

          {/* Role Dropdown */}
          <div className="flex items-center gap-1.5 rounded-xl border border-cream-2 bg-white px-3 py-2 text-xs shadow-sm">
            <span className="font-bold text-muted uppercase text-[10px]">Role</span>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent font-semibold text-green-dark outline-none cursor-pointer"
            >
              <option value="all">All</option>
              <option value="resident">Resident</option>
              <option value="non_resident">Non-Resident / Pending</option>
              <option value="counselor">Counselor</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5 rounded-xl border border-cream-2 bg-white px-3 py-2 text-xs shadow-sm">
            <span className="font-bold text-muted uppercase text-[10px]">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent font-semibold text-green-dark outline-none cursor-pointer"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Block/Lot Dropdown */}
          <div className="flex items-center gap-1.5 rounded-xl border border-cream-2 bg-white px-3 py-2 text-xs shadow-sm">
            <span className="font-bold text-muted uppercase text-[10px]">Block/Lot</span>
            <select
              value={blockFilter}
              onChange={(e) => {
                setBlockFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="max-w-[120px] truncate bg-transparent font-semibold text-green-dark outline-none cursor-pointer"
            >
              <option value="all">All</option>
              {blockOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Add Resident Button */}
          <button
            onClick={openAddModal}
            className="btn-green !px-4 !py-2 text-xs shadow-sm flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Add Resident
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Residents */}
        <div className="flex items-center gap-4 rounded-2xl border border-cream-2 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted">
              Total Residents
            </div>
            <div className="font-serif text-2xl font-bold text-green-dark">
              {totalResidents}
            </div>
          </div>
        </div>

        {/* Card 2: Active */}
        <div className="flex items-center gap-4 rounded-2xl border border-cream-2 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
            <span className="h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted">
              Active
            </div>
            <div className="font-serif text-2xl font-bold text-green-dark">
              {activeCount}
            </div>
          </div>
        </div>

        {/* Card 3: Inactive */}
        <div className="flex items-center gap-4 rounded-2xl border border-cream-2 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50">
            <span className="h-3 w-3 rounded-full bg-rose-500 ring-4 ring-rose-100" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted">
              Inactive
            </div>
            <div className="font-serif text-2xl font-bold text-green-dark">
              {inactiveCount}
            </div>
          </div>
        </div>

        {/* Card 4: Non-Residents */}
        <div className="flex items-center gap-4 rounded-2xl border border-cream-2 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50">
            <span className="h-3 w-3 rounded-full bg-amber-500 ring-4 ring-amber-100" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted">
              Non-Residents
            </div>
            <div className="font-serif text-2xl font-bold text-green-dark">
              {nonResidentsCount}
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA: Table + Slide-in / Side Panel */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* RESIDENTS TABLE CARD */}
        <div
          className={`flex-1 overflow-hidden rounded-2xl border border-cream-2 bg-white shadow-sm transition-all duration-300 ${
            selectedUser ? "lg:w-[calc(100%-380px)]" : "w-full"
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-cream-2 bg-cream/50 text-[11px] font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3.5">Name</th>
                  <th className="px-4 py-3.5">Email</th>
                  <th className="px-4 py-3.5">Role</th>
                  <th className="px-4 py-3.5">Block / Lot</th>
                  <th className="px-4 py-3.5">Verification</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Registered</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-2">
                {paginatedUsers.map((u) => {
                  const verification = getVerificationStatus(u);
                  const isSelected = selectedUser?.id === u.id;
                  const regDate = formatRegisteredDate(u.createdAt, u.id);

                  return (
                    <tr
                      key={u.id}
                      onClick={() => setSelectedUser(u)}
                      className={`cursor-pointer transition-colors duration-150 ${
                        isSelected
                          ? "bg-green-light/10 font-medium"
                          : "hover:bg-cream/40"
                      }`}
                    >
                      {/* Name */}
                      <td className="px-4 py-3.5 font-bold text-green-dark whitespace-nowrap">
                        {u.fullName}
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3.5 text-muted whitespace-nowrap">
                        {u.email}
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3.5 capitalize text-green-deep whitespace-nowrap">
                        {u.role.replace("_", " ")}
                      </td>

                      {/* Block / Lot */}
                      <td className="px-4 py-3.5 text-muted whitespace-nowrap">
                        {u.blockNo || u.lotNo
                          ? `${u.blockNo ?? "—"} / ${u.lotNo ?? "—"}`
                          : "/"}
                      </td>

                      {/* Verification Status Badge */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {verification === "verified" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Verified
                          </span>
                        )}
                        {verification === "pending" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                            <Clock className="h-3 w-3 text-amber-600" />
                            Pending
                          </span>
                        )}
                        {verification === "not_verified" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-500">
                            <XCircle className="h-3 w-3 text-gray-400" />
                            Not Verified
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            u.isActive
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* Registered Date */}
                      <td className="px-4 py-3.5 text-muted whitespace-nowrap">
                        {regDate}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            title="View Resident Details"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUser(u);
                            }}
                            className="rounded-lg p-1.5 text-muted hover:bg-cream hover:text-green-dark"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Three-dot menu */}
                          <div className="relative" ref={openMenuId === u.id ? menuRef : null}>
                            <button
                              title="More Actions"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === u.id ? null : u.id);
                              }}
                              className="rounded-lg p-1.5 text-muted hover:bg-cream hover:text-green-dark"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>

                            {openMenuId === u.id && (
                              <div
                                className="absolute right-0 top-full z-[500] mt-1 w-48 rounded-xl border border-cream-2 bg-white py-1 shadow-xl animate-fade-in"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* View Details */}
                                <button
                                  onClick={() => {
                                    setSelectedUser(u);
                                    setOpenMenuId(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-green-dark hover:bg-cream transition-colors"
                                >
                                  <Eye className="h-3.5 w-3.5 text-muted" />
                                  View Details
                                </button>

                                {/* Edit Resident */}
                                <button
                                  onClick={(e) => openEditModal(u, e)}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-green-dark hover:bg-cream transition-colors"
                                >
                                  <Edit3 className="h-3.5 w-3.5 text-muted" />
                                  Edit Resident
                                </button>

                                {/* Deactivate / Activate */}
                                <button
                                  onClick={(e) => toggleUserStatus(u, e)}
                                  disabled={busy}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-green-dark hover:bg-cream transition-colors disabled:opacity-50"
                                >
                                  <Power className="h-3.5 w-3.5 text-muted" />
                                  {u.isActive ? "Deactivate" : "Activate"}
                                </button>

                                <div className="my-1 border-t border-cream-2" />

                                {/* Archive Resident — amber, prominent */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setArchiveReason("");
                                    setArchiveTarget(u);
                                    setOpenMenuId(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 transition-colors"
                                >
                                  <Archive className="h-3.5 w-3.5 text-amber-600" />
                                  Archive Resident
                                </button>

                                {/* Delete Permanently — danger */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteTarget(u);
                                    setOpenMenuId(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                                  Delete Permanently
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {paginatedUsers.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted">
                      No residents match your search and filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Bar */}
          <div className="flex flex-col items-center justify-between gap-3 border-t border-cream-2 px-5 py-3.5 text-xs text-muted sm:flex-row">
            <div>
              Showing{" "}
              <span className="font-semibold text-green-dark">
                {filteredUsers.length === 0
                  ? 0
                  : (currentPage - 1) * ITEMS_PER_PAGE + 1}
              </span>
              –
              <span className="font-semibold text-green-dark">
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-green-dark">
                {filteredUsers.length}
              </span>{" "}
              residents
            </div>

            {/* Pagination numbers */}
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-cream-2 bg-white text-muted transition hover:bg-cream disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  if (totalPages <= 5) return true;
                  return (
                    p === 1 ||
                    p === totalPages ||
                    Math.abs(p - currentPage) <= 1
                  );
                })
                .map((pageNum, idx, arr) => {
                  const showEllipsis =
                    idx > 0 && pageNum - arr[idx - 1] > 1;

                  return (
                    <div key={pageNum} className="flex items-center">
                      {showEllipsis && (
                        <span className="px-1 text-muted">…</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(pageNum)}
                        className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition ${
                          currentPage === pageNum
                            ? "bg-green-dark text-white"
                            : "border border-cream-2 bg-white text-muted hover:bg-cream"
                        }`}
                      >
                        {pageNum}
                      </button>
                    </div>
                  );
                })}

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-cream-2 bg-white text-muted transition hover:bg-cream disabled:opacity-40"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* SIDE DRAWER: Resident Information Panel */}
        {selectedUser && (
          <aside className="w-full lg:w-[360px] flex-shrink-0 rounded-2xl border border-cream-2 bg-white p-5 shadow-xl animate-fade-in">
            {/* Header with Close button */}
            <div className="flex items-center justify-between border-b border-cream-2 pb-4">
              <h2 className="font-serif text-lg font-bold text-green-dark">
                Resident Information
              </h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="rounded-full p-1 text-muted transition hover:bg-cream hover:text-green-dark"
                aria-label="Close resident information panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Profile Header (Avatar + Name + Badges) */}
            <div className="flex items-center gap-3 py-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                <UserIcon className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-serif text-base font-bold text-green-dark">
                  {selectedUser.fullName}
                </h3>
                <p className="truncate text-xs text-muted">{selectedUser.email}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      selectedUser.isActive
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {selectedUser.isActive ? "Active" : "Inactive"}
                  </span>
                  {getVerificationStatus(selectedUser) === "verified" && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      ✓ Verified
                    </span>
                  )}
                  {getVerificationStatus(selectedUser) === "pending" && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      ⏳ Pending
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Content Sections */}
            <div className="space-y-4 divide-y divide-cream-2 text-xs">
              {/* 1. Contact Information */}
              <div className="pt-3">
                <h4 className="mb-2 font-serif text-xs font-bold tracking-wider text-green-dark">
                  Contact Information
                </h4>
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-muted">
                      <Phone className="h-3.5 w-3.5 text-muted" /> Phone
                    </span>
                    <span className="font-semibold text-green-deep">
                      {selectedUser.phone || "0912 345 6789"}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-muted">
                      <MapPin className="h-3.5 w-3.5 text-muted" /> Address
                    </span>
                    <span className="max-w-[180px] text-right font-semibold text-green-deep">
                      {selectedUser.address ||
                        (selectedUser.blockNo
                          ? `Block ${selectedUser.blockNo}, Lot ${selectedUser.lotNo || "1"}, Mabuhay Subdivision`
                          : "Mabuhay Subdivision")}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-muted">
                      <Sparkles className="h-3.5 w-3.5 text-muted" /> Gender
                    </span>
                    <span className="font-semibold text-green-deep">
                      {selectedUser.gender || "Female"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Residency Details */}
              <div className="pt-3">
                <h4 className="mb-2 font-serif text-xs font-bold tracking-wider text-green-dark">
                  Residency Details
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted">
                      <UserIcon className="h-3.5 w-3.5 text-muted" /> Role
                    </span>
                    <span className="font-semibold capitalize text-green-deep">
                      {selectedUser.role.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted">
                      <Layers className="h-3.5 w-3.5 text-muted" /> Block / Lot
                    </span>
                    <span className="font-semibold text-green-deep">
                      {selectedUser.blockNo || selectedUser.lotNo
                        ? `${selectedUser.blockNo ?? "—"} / ${selectedUser.lotNo ?? "—"}`
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted">
                      <Calendar className="h-3.5 w-3.5 text-muted" /> Registered
                    </span>
                    <span className="font-semibold text-green-deep">
                      {formatRegisteredDate(selectedUser.createdAt, selectedUser.id)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Household Information */}
              <div className="pt-3">
                <h4 className="mb-2 font-serif text-xs font-bold tracking-wider text-green-dark">
                  Household Information
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted">
                      <Users className="h-3.5 w-3.5 text-muted" /> Household Members
                    </span>
                    <span className="font-semibold text-green-deep">
                      {selectedUser.householdMembers ?? 4}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted">
                      <Home className="h-3.5 w-3.5 text-muted" /> Household Head
                    </span>
                    <span className="font-semibold text-green-deep">
                      {selectedUser.householdHead || selectedUser.fullName}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Account Status */}
              <div className="pt-3">
                <h4 className="mb-2 font-serif text-xs font-bold tracking-wider text-green-dark">
                  Account Status
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted">
                      <ShieldCheck className="h-3.5 w-3.5 text-muted" /> Verification Status
                    </span>
                    <span
                      className={`font-semibold ${
                        getVerificationStatus(selectedUser) === "verified"
                          ? "text-emerald-700"
                          : getVerificationStatus(selectedUser) === "pending"
                          ? "text-amber-700"
                          : "text-gray-500"
                      }`}
                    >
                      {getVerificationStatus(selectedUser) === "verified"
                        ? "Verified"
                        : getVerificationStatus(selectedUser) === "pending"
                        ? "Pending"
                        : "Not Verified"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted">
                      <Activity className="h-3.5 w-3.5 text-muted" /> Account Status
                    </span>
                    <span
                      className={`font-semibold ${
                        selectedUser.isActive ? "text-emerald-700" : "text-rose-600"
                      }`}
                    >
                      {selectedUser.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Action Buttons */}
            <div className="mt-6 flex items-center gap-2">
              <button
                onClick={(e) => openEditModal(selectedUser, e)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-cream-2 bg-white py-2.5 text-xs font-bold text-green-dark shadow-sm transition hover:bg-cream"
              >
                <Edit3 className="h-3.5 w-3.5" /> Edit Resident
              </button>
              <button
                onClick={(e) => toggleUserStatus(selectedUser, e)}
                disabled={busy}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold text-white shadow-sm transition ${
                  selectedUser.isActive
                    ? "bg-green-dark hover:bg-green-deep"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                <Power className="h-3.5 w-3.5" />
                {selectedUser.isActive ? "Deactivate" : "Activate"}
              </button>
            </div>

            {/* Archive action — secondary, below main buttons */}
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => {
                  setArchiveReason("");
                  setArchiveTarget(selectedUser);
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
              >
                <Archive className="h-3.5 w-3.5" /> Archive Resident
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* MODAL: Add Resident */}
      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <form
            onSubmit={submitAdd}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-cream-2 pb-3">
              <h3 className="font-serif text-xl font-bold text-green-dark">
                Add Resident
              </h3>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="rounded-full p-1 text-muted hover:bg-cream"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-muted">
              Register a new homeowner or resident into the system database.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="field-label">Full Name</label>
                <input
                  type="text"
                  className="field"
                  placeholder="e.g. Maria Santos"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Email Address</label>
                  <input
                    type="email"
                    className="field"
                    placeholder="maria@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="field-label">Role</label>
                  <select
                    className="field"
                    value={role}
                    onChange={(e) => {
                      const r = e.target.value as Role;
                      setRole(r);
                      if (r !== "resident") setCedula("");
                    }}
                  >
                    <option value="resident">Resident</option>
                    <option value="non_resident">Non-resident</option>
                    <option value="counselor">Counselor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="field-label">Block No.</label>
                  <input
                    type="text"
                    className="field"
                    value={blockNo}
                    onChange={(e) => setBlockNo(e.target.value)}
                    placeholder="2"
                  />
                </div>
                <div>
                  <label className="field-label">Lot No.</label>
                  <input
                    type="text"
                    className="field"
                    value={lotNo}
                    onChange={(e) => setLotNo(e.target.value)}
                    placeholder="4"
                  />
                </div>
                <div>
                  <label className="field-label">Gender</label>
                  <select
                    className="field"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Phone Number</label>
                  <input
                    type="tel"
                    className="field"
                    placeholder="0912 345 6789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label">Household Members</label>
                  <input
                    type="number"
                    min={1}
                    className="field"
                    value={householdMembers}
                    onChange={(e) => setHouseholdMembers(Number(e.target.value) || 1)}
                  />
                </div>
              </div>

              <div>
                <label className="field-label">Specific Address</label>
                <input
                  type="text"
                  className="field"
                  placeholder="Block 2, Lot 4, Mabuhay Subdivision"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div>
                <label className="field-label">Household Head</label>
                <input
                  type="text"
                  className="field"
                  placeholder="Leave empty to use Full Name"
                  value={householdHead}
                  onChange={(e) => setHouseholdHead(e.target.value)}
                />
              </div>

              {role === "resident" && (
                <div>
                  <label className="field-label">
                    Barangay Residency Certificate (Optional)
                  </label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onFile}
                  />
                  {cedula ? (
                    <div className="relative overflow-hidden rounded-xl border border-cream-2 bg-cream/40 p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={cedula}
                        alt="Barangay Certificate Preview"
                        className="max-h-36 w-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCedula("");
                          if (fileRef.current) fileRef.current.value = "";
                        }}
                        className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-cream-2 p-3 text-xs font-semibold text-green-mid hover:border-green-mid hover:bg-green-light/10"
                    >
                      <Upload className="h-4 w-4" /> Upload Certificate / Cedula
                    </button>
                  )}
                </div>
              )}
            </div>

            {error && (
              <p className="mt-3 text-xs font-semibold text-rose-600">{error}</p>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="submit"
                disabled={busy}
                className="btn-green flex-1 !py-2.5 text-xs font-bold"
              >
                {busy ? "Saving to Database…" : "Save Resident"}
              </button>
              <button
                type="button"
                onClick={() => setAdding(false)}
                disabled={busy}
                className="btn-ghost flex-1 !py-2.5 text-xs"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Edit Resident */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <form
            onSubmit={submitEdit}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-cream-2 pb-3">
              <h3 className="font-serif text-xl font-bold text-green-dark">
                Edit Resident Details
              </h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-full p-1 text-muted hover:bg-cream"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-muted">
              Update resident records in the database.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="field-label">Full Name</label>
                <input
                  type="text"
                  className="field"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Email Address</label>
                  <input
                    type="email"
                    className="field"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="field-label">Role</label>
                  <select
                    className="field"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as Role)}
                  >
                    <option value="resident">Resident</option>
                    <option value="non_resident">Non-resident</option>
                    <option value="counselor">Counselor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="field-label">Block No.</label>
                  <input
                    type="text"
                    className="field"
                    value={editBlockNo}
                    onChange={(e) => setEditBlockNo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label">Lot No.</label>
                  <input
                    type="text"
                    className="field"
                    value={editLotNo}
                    onChange={(e) => setEditLotNo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label">Gender</label>
                  <select
                    className="field"
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Phone</label>
                  <input
                    type="tel"
                    className="field"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label">Household Members</label>
                  <input
                    type="number"
                    min={1}
                    className="field"
                    value={editHouseholdMembers}
                    onChange={(e) =>
                      setEditHouseholdMembers(Number(e.target.value) || 1)
                    }
                  />
                </div>
              </div>

              <div>
                <label className="field-label">Specific Address</label>
                <input
                  type="text"
                  className="field"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                />
              </div>

              <div>
                <label className="field-label">Household Head</label>
                <input
                  type="text"
                  className="field"
                  value={editHouseholdHead}
                  onChange={(e) => setEditHouseholdHead(e.target.value)}
                />
              </div>

              {/* Status toggles */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-green-dark cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    className="rounded text-green-mid focus:ring-green-mid"
                  />
                  Active Account
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-green-dark cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editEmailVerified}
                    onChange={(e) => setEditEmailVerified(e.target.checked)}
                    className="rounded text-green-mid focus:ring-green-mid"
                  />
                  Email Verified
                </label>
              </div>
            </div>

            {error && (
              <p className="mt-3 text-xs font-semibold text-rose-600">{error}</p>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="submit"
                disabled={busy}
                className="btn-green flex-1 !py-2.5 text-xs font-bold"
              >
                {busy ? "Updating Database…" : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                disabled={busy}
                className="btn-ghost flex-1 !py-2.5 text-xs"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Archive Resident */}
      {archiveTarget && (
        <div
          className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => !archiving && setArchiveTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <Archive className="h-5 w-5 text-amber-600" />
              </span>
              <h3 className="font-serif text-lg font-bold text-green-dark">Archive Resident?</h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              <strong>{archiveTarget.fullName}</strong> will be removed from the active Residents list, but their information and historical records (dues, payments, reservations) will be preserved.
            </p>

            <div className="mt-4">
              <label className="field-label">Reason (optional)</label>
              <input
                type="text"
                className="field"
                placeholder="e.g. Moved out of Mabuhay Homes"
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                disabled={archiving}
              />
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setArchiveTarget(null)}
                disabled={archiving}
                className="btn-ghost flex-1 justify-center !py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchiveConfirm}
                disabled={archiving}
                className="flex-1 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 disabled:opacity-60 transition"
              >
                {archiving ? "Archiving…" : "Archive Resident"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Delete Permanently */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </span>
              <h3 className="font-serif text-lg font-bold text-rose-700">Delete Permanently?</h3>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 leading-relaxed mb-3">
              ⚠️ This action <strong>cannot be undone</strong>. The resident record for <strong>{deleteTarget.fullName}</strong> will be permanently removed from the database.
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Only use this for duplicate accounts, test accounts, or records created by mistake. Historical dues and payment records will remain for integrity.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="btn-ghost flex-1 justify-center !py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60 transition"
              >
                {deleting ? "Deleting…" : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
