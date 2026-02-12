"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, ShieldOff, Search, Users, Crown } from "lucide-react";

interface UserEntry {
  _id: string;
  name?: string;
  email: string;
  role: string;
  image?: string;
  createdAt: string;
}

export default function AdminTeamPage() {
  const [admins, setAdmins] = useState<UserEntry[]>([]);
  const [searchResults, setSearchResults] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users?role=admin");
      if (!res.ok) throw new Error("Failed to load admins");
      const data = await res.json();
      setAdmins(data.users || []);
    } catch {
      setMessage({ text: "Failed to load admin list.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      setSearching(true);
      const res = await fetch(
        `/api/admin/users?role=customer&search=${encodeURIComponent(searchQuery.trim())}`
      );
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setSearchResults(data.users || []);
    } catch {
      setMessage({ text: "Search failed.", type: "error" });
    } finally {
      setSearching(false);
    }
  };

  const updateRole = async (userId: string, newRole: "admin" | "customer") => {
    setActionLoading(userId);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update role");

      setMessage({
        text: newRole === "admin" ? "User promoted to admin." : "Admin access revoked.",
        type: "success",
      });
      await fetchAdmins();
      // Clear from search results if promoted
      if (newRole === "admin") {
        setSearchResults((prev) => prev.filter((u) => u._id !== userId));
      }
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to update role.",
        type: "error",
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto section-spacing space-y-8">
      <div>
        <h1 className="text-3xl brand-heading">Admin Team</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage who has admin access to the dashboard
        </p>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm border ${
            message.type === "error"
              ? "bg-red-500/10 text-red-500 border-red-500/20"
              : "bg-primary/10 text-primary border-primary/20"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Current Admins */}
      <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
          <Crown className="h-4 w-4" /> Current Admins
        </h2>
        <p className="text-xs text-muted-foreground">
          Users with full dashboard access. The primary admin (set via environment variable) cannot be removed.
        </p>

        <div className="space-y-3">
          {admins.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No admins found.
            </p>
          ) : (
            admins.map((user) => (
              <div
                key={user._id}
                className="flex items-center justify-between p-4 bg-background border border-border rounded-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    {user.image ? (
                      <img
                        src={user.image}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold text-primary uppercase">
                        {(user.name || user.email)[0]}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {user.name || "No name"}
                    </p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20">
                    Admin
                  </span>
                  <button
                    onClick={() => updateRole(user._id, "customer")}
                    disabled={actionLoading === user._id}
                    className="px-3 py-2 text-[10px] font-bold uppercase rounded-lg border border-border text-muted-foreground hover:border-red-500 hover:text-red-500 transition-all disabled:opacity-50 flex items-center gap-1.5"
                    title="Revoke admin access"
                  >
                    <ShieldOff className="h-3.5 w-3.5" />
                    {actionLoading === user._id ? "..." : "Revoke"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Add New Admin */}
      <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
          <Users className="h-4 w-4" /> Add Admin
        </h2>
        <p className="text-xs text-muted-foreground">
          Search for an existing customer account to promote to admin.
        </p>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="px-6 bg-primary text-primary-foreground font-bold rounded-xl hover:brightness-90 transition-all uppercase text-xs tracking-wide disabled:opacity-50"
          >
            {searching ? "..." : "Search"}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">
              {searchResults.length} customer{searchResults.length !== 1 ? "s" : ""} found
            </p>
            {searchResults.map((user) => (
              <div
                key={user._id}
                className="flex items-center justify-between p-4 bg-background border border-border rounded-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center">
                    {user.image ? (
                      <img
                        src={user.image}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold text-muted-foreground uppercase">
                        {(user.name || user.email)[0]}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {user.name || "No name"}
                    </p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Joined {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => updateRole(user._id, "admin")}
                  disabled={actionLoading === user._id}
                  className="px-4 py-2 text-[10px] font-bold uppercase rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Shield className="h-3.5 w-3.5" />
                  {actionLoading === user._id ? "..." : "Make Admin"}
                </button>
              </div>
            ))}
          </div>
        )}

        {searchQuery.trim() && !searching && searchResults.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No customers found matching &quot;{searchQuery}&quot;. The user must have an existing account first.
          </p>
        )}
      </section>
    </div>
  );
}
