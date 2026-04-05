"use client";

import { useEffect, useState } from "react";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NEW_GUEST_DRAFT_KEY } from "@/lib/guests/draft";
import { FormDateTimeField } from "@/components/ui/form-date-time-field";

interface NewGuestDraft {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationality: string;
  dateOfBirth: string;
  notes: string;
}

interface NewGuestFormProps {
  error?: string;
  action: (formData: FormData) => void | Promise<void>;
}

const EMPTY_DRAFT: NewGuestDraft = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  nationality: "",
  dateOfBirth: "",
  notes: "",
};

function normalizeDraft(raw: unknown): NewGuestDraft {
  if (!raw || typeof raw !== "object") return EMPTY_DRAFT;
  const v = raw as Partial<Record<keyof NewGuestDraft, unknown>>;
  return {
    firstName: typeof v.firstName === "string" ? v.firstName : "",
    lastName: typeof v.lastName === "string" ? v.lastName : "",
    email: typeof v.email === "string" ? v.email : "",
    phone: typeof v.phone === "string" ? v.phone : "",
    nationality: typeof v.nationality === "string" ? v.nationality : "",
    dateOfBirth: typeof v.dateOfBirth === "string" ? v.dateOfBirth : "",
    notes: typeof v.notes === "string" ? v.notes : "",
  };
}

export function NewGuestForm({ error, action }: NewGuestFormProps) {
  const [draft, setDraft] = useState<NewGuestDraft>(EMPTY_DRAFT);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(NEW_GUEST_DRAFT_KEY);
      if (saved) setDraft(normalizeDraft(JSON.parse(saved)));
    } catch {
      window.localStorage.removeItem(NEW_GUEST_DRAFT_KEY);
    } finally {
      setHasLoadedDraft(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedDraft) return;
    window.localStorage.setItem(NEW_GUEST_DRAFT_KEY, JSON.stringify(draft));
  }, [draft, hasLoadedDraft]);

  function updateField<K extends keyof NewGuestDraft>(key: K, value: string) {
    setDraft((current) => {
      if (current[key] === value) return current;
      return { ...current, [key]: value };
    });
  }

  return (
    <>
      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form action={action} className="grid gap-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              name="firstName"
              required
              value={draft.firstName}
              onChange={(e) => updateField("firstName", e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              name="lastName"
              required
              value={draft.lastName}
              onChange={(e) => updateField("lastName", e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="guest@example.com"
              value={draft.email}
              onChange={(e) => updateField("email", e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              placeholder="+1 555 123 4567"
              value={draft.phone}
              onChange={(e) => updateField("phone", e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="nationality">Nationality</Label>
            <Input
              id="nationality"
              name="nationality"
              placeholder="e.g. Italian"
              value={draft.nationality}
              onChange={(e) => updateField("nationality", e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dateOfBirth">Date of birth</Label>
             <FormDateTimeField name="dateOfBirth" editableYear={true}  defaultValue={draft.dateOfBirth ?? undefined} className="bg-white" includeTime={false} placeholder="Select date" />
            {/* <Input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              value={draft.dateOfBirth}
              onChange={(e) => updateField("dateOfBirth", e.target.value)}
            /> */}
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={4}
            placeholder="Preferences, loyalty status, special assistance, etc."
            value={draft.notes}
            onChange={(e) => updateField("notes", e.target.value)}
          />
        </div>

        <FormSubmitButton
          idleText="Create guest"
          pendingText="Creating..."
          className="bg-[#ff6900] text-white hover:bg-[#e55f00]"
        />
      </form>
    </>
  );
}
