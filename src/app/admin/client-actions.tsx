"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Key, Loader2, Check } from "lucide-react";

export function AdminClientActions({ adminKey }: { adminKey: string }) {
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [codesGenerated, setCodesGenerated] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleGenerateCodes = async () => {
    setLoadingCodes(true);
    try {
      const res = await fetch(`/api/admin/generate-codes?key=${adminKey}`, { method: "POST" });
      if (res.ok) {
        setCodesGenerated(true);
        setTimeout(() => setCodesGenerated(false), 3000);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingCodes(false);
  };

  const handleExportEmails = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/admin/export?key=${adminKey}`);
      if (res.ok) {
        const text = await res.text();
        const blob = new Blob([text], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `workly-users-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (e) {
      console.error(e);
    }
    setDownloading(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button 
        variant="outline" 
        onClick={handleGenerateCodes} 
        disabled={loadingCodes || codesGenerated}
        className="bg-zinc-900 border-zinc-700 text-zinc-100 hover:bg-zinc-800"
      >
        {loadingCodes ? <Loader2 className="size-4 animate-spin mr-2" /> : 
         codesGenerated ? <Check className="size-4 text-green-500 mr-2" /> : 
         <Key className="size-4 mr-2" />}
        {codesGenerated ? "Generated 20 Codes" : "Generate Beta Codes"}
      </Button>

      <Button 
        onClick={handleExportEmails} 
        disabled={downloading}
        className="bg-white text-black hover:bg-zinc-200"
      >
        {downloading ? <Loader2 className="size-4 animate-spin mr-2" /> : <Download className="size-4 mr-2" />}
        Export Emails (CSV)
      </Button>
    </div>
  );
}
