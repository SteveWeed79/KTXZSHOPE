"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Save, ArrowLeft, Globe, Shield, Zap } from "lucide-react";

interface SiteSettings {
  storeName: string;
  supportEmail: string;
  returnPolicy: string;
  termsOfService: string;
  isVaultLive: boolean;
  dropCountdown: string;
  maintenanceMode: boolean;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>({
    storeName: "",
    supportEmail: "",
    returnPolicy: "",
    termsOfService: "",
    isVaultLive: false,
    dropCountdown: "",
    maintenanceMode: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          setSettings({
            storeName: data.settings.storeName || "",
            supportEmail: data.settings.supportEmail || "",
            returnPolicy: data.settings.returnPolicy || "",
            termsOfService: data.settings.termsOfService || "",
            isVaultLive: data.settings.isVaultLive || false,
            dropCountdown: data.settings.dropCountdown
              ? new Date(data.settings.dropCountdown).toISOString().slice(0, 16)
              : "",
            maintenanceMode: data.settings.maintenanceMode || false,
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    try {
      const body: Record<string, unknown> = { ...settings };
      if (settings.dropCountdown) {
        body.dropCountdown = new Date(settings.dropCountdown).toISOString();
      } else {
        body.dropCountdown = null;
      }

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to save");
      setMessage("Settings saved successfully.");
    } catch {
      setMessage("Error saving settings.");
    } finally {
      setSaving(false);
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
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Site Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Global configuration for your store
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Admin
        </Link>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.includes("Error")
              ? "bg-primary/10 text-primary border border-primary/20"
              : "bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20"
          }`}
        >
          {message}
        </div>
      )}

      <div className="grid gap-6">
        {/* Identity */}
        <section className="bg-card border border-border rounded-2xl p-6 space-y-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
            <Globe className="h-4 w-4" /> Store Identity
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Store Name
              </label>
              <input
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                value={settings.storeName}
                onChange={(e) =>
                  setSettings({ ...settings, storeName: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Support Email
              </label>
              <input
                type="email"
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                value={settings.supportEmail}
                onChange={(e) =>
                  setSettings({ ...settings, supportEmail: e.target.value })
                }
              />
            </div>
          </div>
        </section>

        {/* Vault & Maintenance */}
        <section className="bg-card border border-border rounded-2xl p-6 space-y-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
            <Zap className="h-4 w-4" /> Store Controls
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.isVaultLive}
                onChange={(e) =>
                  setSettings({ ...settings, isVaultLive: e.target.checked })
                }
                className="rounded accent-primary"
              />
              <div>
                <span className="text-sm font-medium">Vault Live</span>
                <p className="text-xs text-muted-foreground">
                  Enable the vault section on the homepage
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maintenanceMode: e.target.checked,
                  })
                }
                className="rounded accent-primary"
              />
              <div>
                <span className="text-sm font-medium">Maintenance Mode</span>
                <p className="text-xs text-muted-foreground">
                  Show maintenance page to visitors
                </p>
              </div>
            </label>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Next Drop Countdown
              </label>
              <input
                type="datetime-local"
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                value={settings.dropCountdown}
                onChange={(e) =>
                  setSettings({ ...settings, dropCountdown: e.target.value })
                }
              />
            </div>
          </div>
        </section>

        {/* Legal */}
        <section className="bg-card border border-border rounded-2xl p-6 space-y-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
            <Shield className="h-4 w-4" /> Legal & Policies
          </h2>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Return Policy
            </label>
            <textarea
              rows={5}
              className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm font-mono text-foreground focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              placeholder="Enter your return policy..."
              value={settings.returnPolicy}
              onChange={(e) =>
                setSettings({ ...settings, returnPolicy: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Terms of Service
            </label>
            <textarea
              rows={5}
              className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm font-mono text-foreground focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              placeholder="Enter your terms of service..."
              value={settings.termsOfService}
              onChange={(e) =>
                setSettings({ ...settings, termsOfService: e.target.value })
              }
            />
          </div>
        </section>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:brightness-90 transition-all disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {saving ? "Saving..." : "Save All Settings"}
      </button>
    </div>
  );
}
