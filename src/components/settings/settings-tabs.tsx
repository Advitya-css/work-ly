"use client";

import { useEffect, useState } from "react";
import { User, SlidersHorizontal, CreditCard, ShieldCheck } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export type SettingsTabKey = "account" | "preferences" | "plans" | "privacy";

interface SettingsTabsProps {
  initialTab?: SettingsTabKey;
  accountContent: React.ReactNode;
  preferencesContent: React.ReactNode;
  plansContent: React.ReactNode;
  privacyContent: React.ReactNode;
}

function normalizeHash(hash: string): SettingsTabKey | null {
  const clean = hash.replace(/^#/, "").toLowerCase();
  if (clean === "plan" || clean === "plans" || clean === "pricing" || clean === "billing" || clean === "invite") {
    return "plans";
  }
  if (clean === "preferences" || clean === "locations" || clean === "work" || clean === "student") {
    return "preferences";
  }
  if (clean === "privacy" || clean === "data") {
    return "privacy";
  }
  if (clean === "account" || clean === "profile" || clean === "appearance") {
    return "account";
  }
  return null;
}

export function SettingsTabs({
  initialTab = "account",
  accountContent,
  preferencesContent,
  plansContent,
  privacyContent,
}: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabKey>(initialTab);

  useEffect(() => {
    // Check hash on mount
    const fromHash = normalizeHash(window.location.hash);
    if (fromHash) {
      setActiveTab(fromHash);
    }

    const onHashChange = () => {
      const changed = normalizeHash(window.location.hash);
      if (changed) {
        setActiveTab(changed);
      }
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const handleTabChange = (value: string) => {
    const tab = value as SettingsTabKey;
    setActiveTab(tab);
    // Sync hash into window history without causing scrolling jumps
    const newHash = tab === "plans" ? "#plan" : `#${tab}`;
    if (window.location.hash !== newHash) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${newHash}`);
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full gap-6">
      <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl border border-border/50 bg-muted/70 p-1 sm:grid-cols-4">
        <TabsTrigger
          value="account"
          className="flex items-center justify-center gap-2 py-2.5 text-xs font-medium sm:text-sm"
        >
          <User className="size-4 shrink-0" />
          <span>Account</span>
        </TabsTrigger>
        <TabsTrigger
          value="preferences"
          className="flex items-center justify-center gap-2 py-2.5 text-xs font-medium sm:text-sm"
        >
          <SlidersHorizontal className="size-4 shrink-0" />
          <span>Preferences</span>
        </TabsTrigger>
        <TabsTrigger
          value="plans"
          className="flex items-center justify-center gap-2 py-2.5 text-xs font-medium sm:text-sm"
        >
          <CreditCard className="size-4 shrink-0" />
          <span>Pricing & Plans</span>
        </TabsTrigger>
        <TabsTrigger
          value="privacy"
          className="flex items-center justify-center gap-2 py-2.5 text-xs font-medium sm:text-sm"
        >
          <ShieldCheck className="size-4 shrink-0" />
          <span>Privacy & Data</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="account" className="mt-0 flex flex-col gap-6">
        {accountContent}
      </TabsContent>

      <TabsContent value="preferences" className="mt-0 flex flex-col gap-6">
        {preferencesContent}
      </TabsContent>

      <TabsContent value="plans" className="mt-0 flex flex-col gap-6">
        {plansContent}
      </TabsContent>

      <TabsContent value="privacy" className="mt-0 flex flex-col gap-6">
        {privacyContent}
      </TabsContent>
    </Tabs>
  );
}
