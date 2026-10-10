"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { normalizeLinkedInUrl } from "@/lib/linkedin/url";

export function LinkedInDialog({
  name,
  initialUrl,
  onSave,
  onClose,
}: {
  name: string;
  initialUrl: string | null;
  onSave: (url: string | null) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initialUrl ?? "");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) {
      onSave(null);
      return;
    }
    const url = normalizeLinkedInUrl(value);
    if (!url) {
      setError("Paste a LinkedIn profile link, like linkedin.com/in/jane-doe");
      return;
    }
    onSave(url);
  }

  return (
    <Dialog open onClose={onClose} title="LinkedIn profile" description={`For ${name}. Leave blank to remove it.`}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <TextField
          label="Profile URL"
          type="text"
          inputMode="url"
          autoComplete="off"
          placeholder="https://www.linkedin.com/in/…"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          error={error}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Dialog>
  );
}
