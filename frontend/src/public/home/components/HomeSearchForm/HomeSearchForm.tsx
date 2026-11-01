import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Search } from "lucide-react";
import { Button } from "../../../../shared/ui";
import styles from "./HomeSearchForm.module.css";

export function HomeSearchForm() {
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("");
  const navigate = useNavigate();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedSearch = search.trim();
    const trimmedArea = area.trim();

    const params = new URLSearchParams();
    if (trimmedSearch) params.set("search", trimmedSearch);
    if (trimmedArea) params.set("area", trimmedArea);

    const qs = params.toString();
    navigate(qs ? `/doctors?${qs}` : "/doctors");
  }

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit}
      role="search"
      aria-label="Search doctors by name, specialty, or location"
    >
      <div className={styles.inputGroup}>
        <span className={styles.inputIcon} aria-hidden="true">
          <Search size={18} />
        </span>
        <label htmlFor="home-search-query" className={styles.label}>
          Doctor or specialty
        </label>
        <input
          id="home-search-query"
          type="text"
          className={styles.input}
          placeholder="Doctor or specialty"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.divider} aria-hidden="true" />

      <div className={styles.inputGroup}>
        <span className={styles.inputIcon} aria-hidden="true">
          <MapPin size={18} />
        </span>
        <label htmlFor="home-search-area" className={styles.label}>
          Area or hospital
        </label>
        <input
          id="home-search-area"
          type="text"
          className={styles.input}
          placeholder="Area or hospital"
          value={area}
          onChange={(e) => setArea(e.target.value)}
        />
      </div>

      <div className={styles.submitButton}>
        <Button type="submit" variant="primary" leftIcon={<Search size={16} />}>
          Find doctors
        </Button>
      </div>
    </form>
  );
}
