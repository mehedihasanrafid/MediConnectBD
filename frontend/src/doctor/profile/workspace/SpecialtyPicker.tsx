import { useState } from "react";
import { FormField, Input } from "../../../shared/ui";
import type { Specialty } from "../../../shared/types";
import styles from "./ProfileWorkspace.module.css";

export function SpecialtyPicker({ items, selected, onChange, loading }: {
  items: Specialty[]; selected: string[]; onChange: (ids: string[]) => void; loading: boolean;
}) {
  const [search, setSearch] = useState("");
  const options = items.filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase()));
  return <div className={styles.stack}>
    <FormField label={`Specialties (${selected.length}/10)`}>
      <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search specialties" />
    </FormField>
    {loading && <p role="status" className={styles.muted}>Loading specialties…</p>}
    <div className={styles.catalog}><div className={styles.specialties} role="group" aria-label="Choose specialties">
      {options.map((item) => {
        const active = selected.includes(item.id);
        return <button type="button" className={styles.specialty} key={item.id}
          aria-pressed={active} disabled={!active && selected.length >= 10}
          onClick={() => onChange(active ? selected.filter((id) => id !== item.id) : [...selected, item.id])}>
          {active ? "✓ " : ""}{item.name}
        </button>;
      })}
      {!loading && !options.length && <p className={styles.muted}>No specialties found.</p>}
    </div></div>
  </div>;
}
