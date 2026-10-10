import type { SortKey } from "@/lib/contacts/view";

export type EditableField = "company" | "name" | "title" | "stage" | "follow_up_date" | "notes";

export const COLUMNS: { key: EditableField & SortKey; label: string; width: string }[] = [
  { key: "company", label: "Company", width: "w-[16%] min-w-40" },
  { key: "name", label: "Name", width: "w-[17%] min-w-44" },
  { key: "title", label: "Title", width: "w-[17%] min-w-44" },
  { key: "stage", label: "Stage", width: "w-[12%] min-w-40" },
  { key: "follow_up_date", label: "Follow-up date", width: "w-[15%] min-w-60" },
  { key: "notes", label: "Notes", width: "min-w-60" },
];
