/**
 * Public doctor directory with search and filters. Visitors can browse without signing in; the
 * booking action requires authentication.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../shared/api";
import type { DoctorListResponse, PublicDoctor, Specialty } from "../../shared/types";
import { formatMoney } from "../../shared/format";
import { Alert, Card, EmptyState, Field, Spinner } from "../../components/ui";

export function DoctorSearchPage() {
  const [doctors, setDoctors] = useState<PublicDoctor[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .get<{ items: Specialty[] }>("/catalog/specialties")
      .then((result) => setSpecialties(result.items))
      .catch(() => setSpecialties([]));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (specialty) params.set("specialty", specialty);
    params.set("limit", "12");

    const timer = setTimeout(() => {
      void api
        .get<DoctorListResponse>(`/doctors?${params.toString()}`)
        .then((result) => {
          if (!controller.signal.aborted) setDoctors(result.items);
        })
        .catch(() => {
          if (!controller.signal.aborted) setError("Could not load doctors. Is the API running?");
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [search, specialty]);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Find a doctor</h1>
        <p className="muted">Search by name or specialty, then view available slots.</p>
      </header>

      <Card className="filters">
        <Field label="Search" value={search} onChange={setSearch} placeholder="Doctor name" />
        <label className="field">
          <span>Specialty</span>
          <select value={specialty} onChange={(event) => setSpecialty(event.target.value)}>
            <option value="">All specialties</option>
            {specialties.map((item) => (
              <option key={item.id} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </Card>

      {error && <Alert kind="error">{error}</Alert>}
      {loading && <Spinner label="Loading doctors…" />}

      {!loading && doctors.length === 0 && !error && (
        <EmptyState>No doctors match your search.</EmptyState>
      )}

      <div className="grid">
        {doctors.map((doctor) => (
          <Card key={doctor.id} className="doctor-card">
            <div className="doctor-head">
              <div className="avatar">{doctor.firstName[0]}{doctor.lastName[0]}</div>
              <div>
                <h2>
                  Dr. {doctor.firstName} {doctor.lastName}
                </h2>
                <p className="muted">{doctor.specialties.map((s) => s.name).join(", ")}</p>
              </div>
            </div>

            <dl className="facts">
              <div>
                <dt>Experience</dt>
                <dd>{doctor.experienceYears} years</dd>
              </div>
              <div>
                <dt>Video fee</dt>
                <dd>{formatMoney(doctor.videoConsultationFee)}</dd>
              </div>
              <div>
                <dt>Chamber from</dt>
                <dd>{formatMoney(doctor.minimumFee)}</dd>
              </div>
              <div>
                <dt>Languages</dt>
                <dd>{doctor.languages?.join(", ") ?? "—"}</dd>
              </div>
            </dl>

            {doctor.chambers.length > 0 && (
              <p className="muted small">
                {doctor.chambers[0].hospital.name}, {doctor.chambers[0].hospital.area}
              </p>
            )}

            <Link className="btn btn-primary" to={`/doctors/${doctor.id}`}>
              View slots
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
