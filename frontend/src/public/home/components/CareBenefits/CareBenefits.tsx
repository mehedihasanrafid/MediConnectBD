import { CalendarCheck, Users, Zap } from "lucide-react";
import { Container } from "../../../../shared/ui";
import styles from "./CareBenefits.module.css";

const BENEFITS = [
  {
    title: "Clear availability",
    description: "View verified chamber schedules and teleconsultation slots with transparent visiting hours.",
    icon: CalendarCheck,
  },
  {
    title: "Simple booking",
    description: "Reserve your preferred time slot in minutes with instant digital confirmation.",
    icon: Zap,
  },
  {
    title: "Family profiles",
    description: "Manage consultations, health records, and prescriptions for your entire family in one place.",
    icon: Users,
  },
];

export function CareBenefits() {
  return (
    <section className={styles.section} aria-labelledby="home-care-benefits-heading">
      <Container size="lg">
        <div className={styles.header}>
          <h2 id="home-care-benefits-heading" className={styles.title}>
            Designed around your care
          </h2>
          <p className={styles.subtitle}>
            Thoughtful healthcare access built for everyday patients and families in Bangladesh
          </p>
        </div>

        <div className={styles.grid}>
          {BENEFITS.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <div key={benefit.title} className={styles.card}>
                <div className={styles.iconCircle} aria-hidden="true">
                  <Icon size={22} />
                </div>
                <h3 className={styles.cardTitle}>{benefit.title}</h3>
                <p className={styles.cardDescription}>{benefit.description}</p>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
