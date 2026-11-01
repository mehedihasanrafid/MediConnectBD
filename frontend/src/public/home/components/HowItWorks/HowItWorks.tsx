import { Calendar, Search, Video } from "lucide-react";
import { Container } from "../../../../shared/ui";
import styles from "./HowItWorks.module.css";

const STEPS = [
  {
    number: "1",
    title: "Search",
    description: "Find a doctor by specialty or location.",
    icon: Search,
  },
  {
    number: "2",
    title: "Choose a time",
    description: "Compare availability and fees, then pick a convenient slot.",
    icon: Calendar,
  },
  {
    number: "3",
    title: "Get care",
    description: "Visit the chamber or join a video appointment.",
    icon: Video,
  },
];

export function HowItWorks() {
  return (
    <section className={styles.section} aria-labelledby="home-how-it-works-heading">
      <Container size="lg">
        <div className={styles.header}>
          <h2 id="home-how-it-works-heading" className={styles.title}>
            Book in three easy steps
          </h2>
        </div>

        <div className={styles.grid}>
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className={styles.stepCard}>
                <div className={styles.stepTopRow}>
                  <span className={styles.stepNumber} aria-label={`Step ${step.number}`}>
                    {step.number}
                  </span>
                  <div className={styles.iconCircle} aria-hidden="true">
                    <Icon size={20} />
                  </div>
                </div>

                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDescription}>{step.description}</p>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
