import { ArrowRight } from "lucide-react";
import { ButtonLink, Container } from "../../shared/ui";
import { CareBenefits } from "./components/CareBenefits";
import { FeaturedDoctors } from "./components/FeaturedDoctors";
import { HomeHero } from "./components/HomeHero";
import { HowItWorks } from "./components/HowItWorks";
import { SpecialtyGrid } from "./components/SpecialtyGrid";
import { useHomeData } from "./hooks/useHomeData";
import styles from "./HomePage.module.css";

export function HomePage() {
  const { doctors, specialties, loading, error } = useHomeData();

  return (
    <div className={styles.page}>
      <HomeHero />
      <SpecialtyGrid catalogSpecialties={specialties} />
      <FeaturedDoctors doctors={doctors} loading={loading} error={error} />
      <HowItWorks />
      <CareBenefits />

      <section className={styles.ctaSection} aria-labelledby="home-cta-heading">
        <Container size="lg">
          <div className={styles.ctaContent}>
            <h2 id="home-cta-heading" className={styles.ctaTitle}>
              Ready to find the right doctor?
            </h2>
            <p className={styles.ctaText}>
              Search, compare and book chamber or video appointments in minutes.
            </p>
            <div className={styles.ctaActions}>
              <ButtonLink
                to="/doctors"
                variant="primary"
                size="lg"
                className={styles.ctaButton}
                rightIcon={<ArrowRight size={18} aria-hidden="true" />}
              >
                Book a Doctor
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}

export default HomePage;
