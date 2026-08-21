"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addContactAction,
  addInterviewAction,
  removeContactAction,
  removeInterviewAction,
  setApplicationStatusAction,
  updateApplicationAction,
} from "@/lib/applications/actions";
import { PIPELINE_COLUMNS, APPLICATION_STATUS_LABEL } from "@/lib/applications/labels";
import type { Application, ApplicationStatus } from "@/lib/db/types";

function toDateInput(date: Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export function StatusPicker({ application }: { application: Application }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-2">
      {pending && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
      <Select
        value={application.status}
        onValueChange={(v) =>
          startTransition(() => setApplicationStatusAction(application.id, v as ApplicationStatus))
        }
      >
        <SelectTrigger size="sm" className="w-[170px]" aria-label="Application status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PIPELINE_COLUMNS.map((s) => (
            <SelectItem key={s} value={s}>
              {APPLICATION_STATUS_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ApplicationEditor({ application }: { application: Application }) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [cvVersion, setCvVersion] = useState(application.cvVersion ?? "");
  const [dateApplied, setDateApplied] = useState(toDateInput(application.dateApplied));
  const [coverLetter, setCoverLetter] = useState(application.coverLetter ?? "");
  const [notes, setNotes] = useState(application.notes ?? "");
  const [salary, setSalary] = useState(
    application.salaryOffered != null ? String(application.salaryOffered) : "",
  );
  const [currency, setCurrency] = useState(application.salaryCurrency ?? "");

  function save() {
    setSaved(false);
    startTransition(async () => {
      const parsedSalary = salary.trim() === "" ? null : Number.parseInt(salary.replace(/[^\d]/g, ""), 10);
      await updateApplicationAction(application.id, {
        cvVersion: cvVersion.trim() || null,
        dateApplied: dateApplied || null,
        coverLetter: coverLetter.trim() || null,
        notes: notes.trim() || null,
        salaryOffered: parsedSalary != null && Number.isFinite(parsedSalary) ? parsedSalary : null,
        salaryCurrency: currency.trim() || null,
      });
      setSaved(true);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cv-version">CV version used</Label>
          <Input
            id="cv-version"
            value={cvVersion}
            onChange={(e) => setCvVersion(e.target.value)}
            placeholder="e.g. analyst-cv-v3.pdf"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date-applied">Date applied</Label>
          <Input
            id="date-applied"
            type="date"
            value={dateApplied}
            onChange={(e) => setDateApplied(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="salary-offered">Salary offered</Label>
          <Input
            id="salary-offered"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            placeholder="e.g. 85000"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="salary-currency">Currency</Label>
          <Input
            id="salary-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            placeholder="e.g. GBP"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cover-letter">Cover letter</Label>
        <Textarea
          id="cover-letter"
          rows={5}
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
          placeholder="Paste what you sent, so you can see later which framing actually worked."
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="app-notes">Notes</Label>
        <Textarea
          id="app-notes"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything worth remembering: who referred you, what they asked, how it felt."
        />
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" size="sm" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />}
          Save
        </Button>
        {saved && !pending && <span className="text-xs text-success">Saved</span>}
      </div>
    </div>
  );
}

export function ContactsEditor({ application }: { application: Application }) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");

  function add() {
    if (!name.trim()) return;
    startTransition(async () => {
      await addContactAction(application.id, {
        name: name.trim(),
        role: role.trim() || undefined,
        email: email.trim() || undefined,
      });
      setName("");
      setRole("");
      setEmail("");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {application.contacts.length > 0 && (
        <ul className="flex flex-col gap-2">
          {application.contacts.map((contact, index) => (
            <li
              key={index}
              className="flex items-start justify-between gap-2 rounded-lg border border-border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{contact.name}</p>
                {contact.role && <p className="text-xs text-muted-foreground">{contact.role}</p>}
                {contact.email && (
                  <p className="truncate text-xs text-muted-foreground">{contact.email}</p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => startTransition(() => removeContactAction(application.id, index))}
                aria-label={`Remove ${contact.name}`}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
        <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role" />
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      </div>
      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={add} disabled={pending || !name.trim()}>
        {pending ? <Loader2 className="animate-spin" /> : <Plus />}
        Add contact
      </Button>
    </div>
  );
}

export function InterviewsEditor({ application }: { application: Application }) {
  const [pending, startTransition] = useTransition();
  const [date, setDate] = useState("");
  const [kind, setKind] = useState("");
  const [notes, setNotes] = useState("");

  function add() {
    if (!date) return;
    startTransition(async () => {
      await addInterviewAction(application.id, {
        date,
        kind: kind.trim() || "Interview",
        notes: notes.trim() || undefined,
      });
      setDate("");
      setKind("");
      setNotes("");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {application.interviews.length > 0 && (
        <ul className="flex flex-col gap-2">
          {application.interviews.map((interview, index) => (
            <li
              key={index}
              className="flex items-start justify-between gap-2 rounded-lg border border-border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {interview.kind} · {new Date(interview.date).toLocaleDateString()}
                </p>
                {interview.notes && (
                  <p className="text-xs text-muted-foreground">{interview.notes}</p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => startTransition(() => removeInterviewAction(application.id, index))}
                aria-label="Remove interview"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input value={kind} onChange={(e) => setKind(e.target.value)} placeholder="e.g. Technical" />
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" />
      </div>
      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={add} disabled={pending || !date}>
        {pending ? <Loader2 className="animate-spin" /> : <Plus />}
        Add interview
      </Button>
    </div>
  );
}
