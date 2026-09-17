"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Upload, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { type User, type Role } from "@/lib/mock-data";

export default function CompleteProfilePage() {
  const { user } = useAuth();
  const [done, setDone] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [blockNo, setBlockNo] = useState("");
  const [lotNo, setLotNo] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("resident");
  const [cedula, setCedula] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.email) return;
    api
      .users()
      .then((list) => {
        const mine = (list as User[]).find(
          (u) => u.email.toLowerCase() === user.email!.toLowerCase()
        );
        if (mine) {
          setBlockNo(mine.blockNo ?? "");
          setLotNo(mine.lotNo ?? "");
          setPhone(mine.phone ?? "");
          if (mine.role === "resident" || mine.role === "non_resident") setRole(mine.role);
          setCedula(mine.cedula ?? "");
        }
      })
      .catch(() => setLoadError("Couldn't load your current profile."));
  }, [user?.email]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCedula(String(reader.result));
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    setLoadError("");
    try {
      await api.updateProfile({ blockNo, lotNo, phone, role, cedula });
      setDone(true);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to save your profile.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-gradient-to-br from-green-deep via-green-dark to-green-mid px-4 py-10">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="bg-gradient-to-br from-green-dark to-green-mid p-8 text-center">
          <span className="font-display text-3xl tracking-[4px] text-gold">MABUHAY HOMES</span>
          <p className="mt-1 text-[11px] uppercase tracking-[1.5px] text-white/55">Complete your profile</p>
        </div>
        <div className="p-8">
          {done ? (
            <>
              <div className="flex items-center gap-2 rounded-xl bg-green-light/15 p-4 text-green-mid">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" /> Profile completed! Welcome to the community.
              </div>
              <div className="mt-4 text-center">
                <Link href="/" className="font-semibold text-green-mid hover:underline">Go to homepage</Link>
              </div>
            </>
          ) : (
            <form className="space-y-4" onSubmit={submit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label">Block No.</label>
                  <input className="field" placeholder="B-12" value={blockNo} onChange={(e) => setBlockNo(e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Lot No.</label>
                  <input className="field" placeholder="34" value={lotNo} onChange={(e) => setLotNo(e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Phone</label>
                  <input className="field" placeholder="+63 9xx xxx xxxx" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Role</label>
                  <select className="field" value={role} onChange={(e) => { const r = e.target.value as Role; setRole(r); if (r === "non_resident") setCedula(""); }}>
                    <option value="resident">Resident</option>
                    <option value="non_resident">Non-resident</option>
                  </select>
                </div>
              </div>

              {role === "resident" && (
                <div>
                  <label className="field-label">Barangay Residency Certificate</label>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
                  {cedula ? (
                    <div className="relative overflow-hidden rounded-xl border border-cream-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cedula} alt="Barangay Residency Certificate preview" className="max-h-56 w-full object-contain bg-cream/40" />
                      <button
                        type="button"
                        onClick={() => { setCedula(""); if (fileRef.current) fileRef.current.value = ""; }}
                        className="absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white hover:bg-red-600"
                        aria-label="Remove certificate image"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-cream-2 p-5 text-sm font-semibold text-green-mid hover:border-green-mid hover:bg-green-light/10"
                    >
                      <Upload className="h-5 w-5" /> Upload a photo of your Barangay Residency Certificate
                    </button>
                  )}
                </div>
              )}

              {(msg || loadError) && <p className="text-sm font-semibold text-red-600">{msg || loadError}</p>}

              <button type="submit" disabled={busy} className="btn-green w-full">
                {busy ? "Saving…" : "Save Profile"}
              </button>
            </form>
          )}
          {!done && (
            <p className="mt-6 text-center text-sm text-muted">
              <Link href="/" className="font-semibold text-green-mid hover:underline">Skip for now</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
