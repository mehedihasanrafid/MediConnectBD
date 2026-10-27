import { Card, Field } from "../../../../components/ui";
import type { Specialty } from "../../../../shared/types";
import styles from "./DoctorSearchFilters.module.css";

interface DoctorSearchFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  specialty: string;
  onSpecialtyChange: (value: string) => void;
  specialties: Specialty[];
}

/**
 * Search and specialty filter bar for the public doctor directory.
 */
export function DoctorSearchFilters({
  search,
  onSearchChange,
  specialty,
  onSpecialtyChange,
  specialties,
}: DoctorSearchFiltersProps) {
  return (
    <Card className={`filters ${styles.filtersCard}`}>
      <div className={styles.fieldWrapper}>
        <Field label="Search" value={search} onChange={onSearchChange} placeholder="Doctor name" />
      </div>
      <div className={styles.fieldWrapper}>
        <label className="field">
          <span>Specialty</span>
          <select value={specialty} onChange={(event) => onSpecialtyChange(event.target.value)}>
            <option value="">All specialties</option>
            {specialties.map((item) => (
              <option key={item.id} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </Card>
  );
}
