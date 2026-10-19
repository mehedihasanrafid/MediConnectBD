/**
 * Owns doctor-profile completeness and application-state rules. An authenticated doctor account is
 * not automatically approved for public discovery or scheduling; repository state checks handle
 * concurrent review changes.
 */

import { AppError } from "../../utils/app-error";
import { DoctorApplicationStatus } from "./doctor-profile.entity";
import type { DoctorRepository } from "./doctor.repository";
import type {
  DoctorApplicationQuery,
  DoctorProfileDetails,
  DoctorReviewInput,
  PublicDoctorQuery,
  UpdateDoctorProfileInput,
} from "./doctor.types";

export class DoctorService {
  constructor(private readonly repository: DoctorRepository) {}

  async getMyProfile(userId: string): Promise<DoctorProfileDetails> {
    const profile = await this.repository.findByUserId(userId);
    if (!profile) {
      throw new AppError(404, "DOCTOR_PROFILE_NOT_FOUND", "Doctor profile was not found");
    }
    return profile;
  }

  /**
   * Freezes pending applications; editing an approved profile resets its approval through the
   * repository.
   */
  async updateMyProfile(
    userId: string,
    input: UpdateDoctorProfileInput,
  ): Promise<DoctorProfileDetails> {
    const profile = await this.getMyProfile(userId);
    if (profile.applicationStatus === DoctorApplicationStatus.PENDING_REVIEW) {
      throw new AppError(
        409,
        "APPLICATION_UNDER_REVIEW",
        "The profile cannot be changed while its application is under review",
      );
    }

    return this.repository.updateProfile(
      profile.id,
      input,
      profile.applicationStatus === DoctorApplicationStatus.APPROVED,
    );
  }

  /**
   * Checks qualifications, specialties, and consultation options before attempting a
   * state-conditional submission.
   */
  async submitMyApplication(userId: string): Promise<DoctorProfileDetails> {
    const profile = await this.getMyProfile(userId);
    if (
      profile.applicationStatus !== DoctorApplicationStatus.DRAFT &&
      profile.applicationStatus !== DoctorApplicationStatus.REJECTED
    ) {
      throw new AppError(
        409,
        "APPLICATION_STATE_CONFLICT",
        "Only draft or rejected applications can be submitted",
      );
    }

    const hasConsultationOption =
      profile.videoConsultationFee !== null ||
      profile.chambers.some((chamber) => chamber.isActive);
    if (!profile.degrees || profile.specialties.length === 0 || !hasConsultationOption) {
      throw new AppError(
        409,
        "DOCTOR_PROFILE_INCOMPLETE",
        "Add degrees, at least one specialty, and at least one consultation fee before submitting",
      );
    }

    const submitted = await this.repository.submitApplication(profile.id);
    if (!submitted) {
      throw new AppError(
        409,
        "APPLICATION_STATE_CONFLICT",
        "The application status changed; reload the profile and try again",
      );
    }
    return submitted;
  }

  listApplications(query: DoctorApplicationQuery) {
    return this.repository.listApplications(query);
  }

  /**
   * Records the authenticated admin reviewer and rejects applications that are no longer pending.
   */
  async reviewApplication(
    adminUserId: string,
    doctorId: string,
    input: DoctorReviewInput,
  ): Promise<DoctorProfileDetails> {
    const reviewed = await this.repository.reviewApplication(
      doctorId,
      adminUserId,
      input,
    );
    if (!reviewed) {
      throw new AppError(
        409,
        "APPLICATION_NOT_PENDING",
        "Only a pending doctor application can be reviewed",
      );
    }
    return reviewed;
  }

  listPublic(query: PublicDoctorQuery) {
    return this.repository.listPublic(query);
  }

  /**
   * Uses the public projection and approval/account filters instead of exposing the full
   * onboarding record.
   */
  async getPublicProfile(doctorId: string) {
    const profile = await this.repository.findPublicById(doctorId);
    if (!profile) {
      throw new AppError(404, "DOCTOR_NOT_FOUND", "Approved doctor was not found");
    }
    return profile;
  }

  listSpecialties() {
    return this.repository.listSpecialties();
  }

  listHospitals() {
    return this.repository.listHospitals();
  }
}
