import React from "react";
import { Link } from "react-router-dom";
import {
  Baby,
  Brain,
  HeartHandshake,
  HeartPulse,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import type { Specialty } from "../../../../shared/types";
import { Container } from "../../../../shared/ui";
import styles from "./SpecialtyGrid.module.css";

interface SpecialtyDef {
  key: string;
  defaultName: string;
  defaultSlug: string;
  icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean | "true" | "false" }>;
}

const COMMON_SPECIALTIES: SpecialtyDef[] = [
  {
    key: "medicine",
    defaultName: "General Medicine",
    defaultSlug: "medicine",
    icon: Stethoscope,
  },
  {
    key: "cardiology",
    defaultName: "Cardiology",
    defaultSlug: "cardiology",
    icon: HeartPulse,
  },
  {
    key: "pediatrics",
    defaultName: "Pediatrics",
    defaultSlug: "pediatrics",
    icon: Baby,
  },
  {
    key: "dermatology",
    defaultName: "Dermatology",
    defaultSlug: "dermatology",
    icon: Sparkles,
  },
  {
    key: "gynecology",
    defaultName: "Gynecology",
    defaultSlug: "gynecology",
    icon: HeartHandshake,
  },
  {
    key: "neurology",
    defaultName: "Neurology",
    defaultSlug: "neurology",
    icon: Brain,
  },
];

interface SpecialtyGridProps {
  catalogSpecialties?: Specialty[];
}

export function SpecialtyGrid({ catalogSpecialties = [] }: SpecialtyGridProps) {
  return (
    <section className={styles.section} aria-labelledby="home-specialties-heading">
      <Container size="lg">
        <div className={styles.header}>
          <h2 id="home-specialties-heading" className={styles.title}>
            Find care by specialty
          </h2>
        </div>

        <div className={styles.grid}>
          {COMMON_SPECIALTIES.map((spec) => {
            // Check if catalog has matching specialty by slug or name
            const matching = catalogSpecialties.find(
              (c) =>
                c.slug.toLowerCase().includes(spec.key) ||
                c.name.toLowerCase().includes(spec.key),
            );

            const slug = matching?.slug ?? spec.defaultSlug;
            const name = matching?.name ?? spec.defaultName;
            const Icon = spec.icon;

            return (
              <Link
                key={spec.key}
                to={`/doctors?specialty=${encodeURIComponent(slug)}`}
                className={styles.card}
              >
                <div className={styles.iconCircle} aria-hidden="true">
                  <Icon size={24} />
                </div>
                <span className={styles.cardName}>{name}</span>
              </Link>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
