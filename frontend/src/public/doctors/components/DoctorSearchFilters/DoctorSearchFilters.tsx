import { Button, Card, Field, FormField, Select } from "../../../../shared/ui";
import type { Hospital, Specialty } from "../../../../shared/types";
import styles from "./DoctorSearchFilters.module.css";

interface DoctorSearchFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  specialty: string;
  onSpecialtyChange: (value: string) => void;
  specialties: Specialty[];
  hospital: string;
  onHospitalChange: (value: string) => void;
  hospitals: Hospital[];
  area: string;
  onAreaChange: (value: string) => void;
  minFee: string;
  onMinFeeChange: (value: string) => void;
  maxFee: string;
  onMaxFeeChange: (value: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

/**
 * Search and multi-criteria filter bar for the public doctor directory:
 * Name, Specialty, Hospital, Area, and Consultation Fee range.
 */
export function DoctorSearchFilters({
  search,
  onSearchChange,
  specialty,
  onSpecialtyChange,
  specialties,
  hospital,
  onHospitalChange,
  hospitals,
  area,
  onAreaChange,
  minFee,
  onMinFeeChange,
  maxFee,
  onMaxFeeChange,
  onClearFilters,
  hasActiveFilters,
}: DoctorSearchFiltersProps) {
  const availableAreas = Array.from(new Set(hospitals.map((h) => h.area.trim())))
    .filter(Boolean)
    .sort();

  return (
    <Card className={styles.filtersCard}>
      <div className={styles.fieldWrapper}>
        <Field
          label="Search by name"
          value={search}
          onChange={onSearchChange}
          placeholder="Doctor name or degree"
        />
      </div>

      <div className={styles.fieldWrapper}>
        <FormField label="Specialty">
          <Select value={specialty} onChange={(event) => onSpecialtyChange(event.target.value)}>
            <option value="">All specialties</option>
            {specialties.map((item) => (
              <option key={item.id} value={item.slug}>
                {item.name}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <div className={styles.fieldWrapper}>
        <FormField label="Hospital">
          <Select value={hospital} onChange={(event) => onHospitalChange(event.target.value)}>
            <option value="">All hospitals</option>
            {hospitals.map((item) => (
              <option key={item.id} value={item.slug}>
                {`${item.name} (${item.area})`}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <div className={styles.fieldWrapper}>
        <FormField label="Area / Location">
          <Select value={area} onChange={(event) => onAreaChange(event.target.value)}>
            <option value="">All areas</option>
            {availableAreas.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <div className={styles.fieldWrapper}>
        <Field
          label="Min fee (BDT)"
          type="number"
          value={minFee}
          onChange={onMinFeeChange}
          placeholder="e.g. 500"
        />
      </div>

      <div className={styles.fieldWrapper}>
        <Field
          label="Max fee (BDT)"
          type="number"
          value={maxFee}
          onChange={onMaxFeeChange}
          placeholder="e.g. 1500"
        />
      </div>

      <div className={styles.actionsWrapper}>
        <Button variant="secondary" onClick={onClearFilters} disabled={!hasActiveFilters}>
          Clear filters
        </Button>
      </div>
    </Card>
  );
}
