/**
 * Persistence contract for doctor onboarding, admin review, catalogs, and discovery. Public and
 * private projections stay distinct to avoid exposing account/reviewer information in the
 * directory.
 */

import type {
  CatalogHospital,
  CatalogSpecialty,
  DoctorApplicationQuery,
  DoctorProfileDetails,
  DoctorReviewInput,
  Paginated,
  PublicDoctorProfile,
  PublicDoctorQuery,
  UpdateDoctorProfileInput,
} from "./doctor.types";

export interface DoctorRepository {
  findByUserId(userId: string): Promise<DoctorProfileDetails | null>;
  updateProfile(
    doctorId: string,
    input: UpdateDoctorProfileInput,
    resetApproval: boolean,
  ): Promise<DoctorProfileDetails>;
  submitApplication(doctorId: string): Promise<DoctorProfileDetails | null>;
  listApplications(
    query: DoctorApplicationQuery,
  ): Promise<Paginated<DoctorProfileDetails>>;
  reviewApplication(
    doctorId: string,
    adminUserId: string,
    input: DoctorReviewInput,
  ): Promise<DoctorProfileDetails | null>;
  listPublic(query: PublicDoctorQuery): Promise<Paginated<PublicDoctorProfile>>;
  findPublicById(doctorId: string): Promise<PublicDoctorProfile | null>;
  listSpecialties(): Promise<CatalogSpecialty[]>;
  listHospitals(): Promise<CatalogHospital[]>;
}
