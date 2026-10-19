/**
 * Persists profiles, review metadata, and public-directory filtering. Public queries require an
 * approved doctor and active account; private detail views must never be reused as public
 * responses.
 */

import { In, type DataSource, type EntityManager } from "typeorm";
import { AppError } from "../../utils/app-error";
import { DoctorChamber } from "./doctor-chamber.entity";
import {
  DoctorApplicationStatus,
  DoctorProfile,
} from "./doctor-profile.entity";
import { Hospital } from "../hospitals/hospital.entity";
import { Specialty } from "../specialties/specialty.entity";
import { UserStatus } from "../users/user.entity";
import type { DoctorRepository } from "./doctor.repository";
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

const doctorRelations = {
  user: true,
  specialties: true,
  chambers: { hospital: true },
  reviewedBy: true,
} as const;

export class TypeOrmDoctorRepository implements DoctorRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findByUserId(userId: string): Promise<DoctorProfileDetails | null> {
    const doctor = await this.dataSource.getRepository(DoctorProfile).findOne({
      where: { userId },
      relations: doctorRelations,
    });
    return doctor ? this.toDetails(doctor) : null;
  }

  /**
   * Applies supplied patch fields and relationship replacements transactionally; undefined fields
   * remain unchanged.
   */
  async updateProfile(
    doctorId: string,
    input: UpdateDoctorProfileInput,
    resetApproval: boolean,
  ): Promise<DoctorProfileDetails> {
    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(DoctorProfile);
      const doctor = await repository.findOne({
        where: { id: doctorId },
        relations: { specialties: true },
        lock: { mode: "pessimistic_write" },
      });
      if (!doctor) throw new Error(`Doctor ${doctorId} disappeared during profile update`);

      if (input.degrees !== undefined) doctor.degrees = input.degrees;
      if (input.experienceYears !== undefined) {
        doctor.experienceYears = input.experienceYears;
      }
      if (input.bio !== undefined) doctor.bio = input.bio;
      if (input.photoUrl !== undefined) doctor.photoUrl = input.photoUrl;
      if (input.languages !== undefined) doctor.languages = input.languages;
      if (input.videoConsultationFee !== undefined) {
        doctor.videoConsultationFee = this.decimal(input.videoConsultationFee);
      }

      if (input.specialtyIds !== undefined) {
        doctor.specialties = await this.resolveSpecialties(manager, input.specialtyIds);
      }

      // Previously verified professional details have changed and need a fresh review.
      if (resetApproval) {
        doctor.applicationStatus = DoctorApplicationStatus.DRAFT;
        doctor.reviewedAt = null;
        doctor.reviewedByUserId = null;
        doctor.rejectionReason = null;
      }
      await repository.save(doctor);

      if (input.chambers !== undefined) {
        await this.replaceChambers(manager, doctor.id, input.chambers);
      }
    });

    return this.requireDetails(doctorId);
  }

  /**
   * Uses a conditional UPDATE so a stale service read cannot resubmit an already reviewed
   * application.
   */
  async submitApplication(doctorId: string): Promise<DoctorProfileDetails | null> {
    const result = await this.dataSource
      .getRepository(DoctorProfile)
      .createQueryBuilder()
      .update()
      .set({
        applicationStatus: DoctorApplicationStatus.PENDING_REVIEW,
        reviewedAt: null,
        reviewedByUserId: null,
        rejectionReason: null,
      })
      .where("id = :doctorId", { doctorId })
      .andWhere("application_status IN (:...statuses)", {
        statuses: [DoctorApplicationStatus.DRAFT, DoctorApplicationStatus.REJECTED],
      })
      .execute();

    return result.affected === 1 ? this.requireDetails(doctorId) : null;
  }

  async listApplications(
    query: DoctorApplicationQuery,
  ): Promise<Paginated<DoctorProfileDetails>> {
    const [doctors, total] = await this.dataSource.getRepository(DoctorProfile).findAndCount({
      where: { applicationStatus: query.status },
      relations: doctorRelations,
      order: { createdAt: "ASC", id: "ASC" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return this.page(doctors.map((doctor) => this.toDetails(doctor)), query, total);
  }

  /**
   * Approves/rejects only a currently pending row and stores reviewer identity and review time.
   */
  async reviewApplication(
    doctorId: string,
    adminUserId: string,
    input: DoctorReviewInput,
  ): Promise<DoctorProfileDetails | null> {
    const result = await this.dataSource
      .getRepository(DoctorProfile)
      .createQueryBuilder()
      .update()
      .set({
        applicationStatus: input.decision,
        reviewedAt: new Date(),
        reviewedByUserId: adminUserId,
        rejectionReason:
          input.decision === DoctorApplicationStatus.REJECTED ? input.reason : null,
      })
      .where("id = :doctorId", { doctorId })
      .andWhere("application_status = :pending", {
        pending: DoctorApplicationStatus.PENDING_REVIEW,
      })
      .execute();

    return result.affected === 1 ? this.requireDetails(doctorId) : null;
  }

  /**
   * Filters approval and active account status in SQL before pagination; returns the smaller
   * public profile view.
   */
  async listPublic(query: PublicDoctorQuery): Promise<Paginated<PublicDoctorProfile>> {
    const builder = this.dataSource
      .getRepository(DoctorProfile)
      .createQueryBuilder("doctor")
      .innerJoin("doctor.user", "user")
      .where("doctor.application_status = :approved", {
        approved: DoctorApplicationStatus.APPROVED,
      })
      .andWhere("user.status = :active", { active: UserStatus.ACTIVE });

    if (query.search) {
      builder.andWhere(
        "LOWER(CONCAT_WS(' ', user.first_name, user.last_name, COALESCE(doctor.degrees, ''))) LIKE :search",
        { search: `%${query.search.toLowerCase()}%` },
      );
    }
    if (query.specialty) {
      builder.andWhere(
        `EXISTS (
          SELECT 1 FROM doctor_specialties ds
          INNER JOIN specialties s ON s.id = ds.specialty_id
          WHERE ds.doctor_id = doctor.id
            AND s.is_active = true
            AND (s.id = :specialty OR s.slug = :specialty)
        )`,
        { specialty: query.specialty.toLowerCase() },
      );
    }
    if (query.hospital || query.area) {
      const clauses = [
        "dc.doctor_profile_id = doctor.id",
        "dc.is_active = true",
        "h.is_active = true",
      ];
      const parameters: Record<string, string> = {};
      if (query.hospital) {
        clauses.push("(h.id = :hospital OR h.slug = :hospital)");
        parameters.hospital = query.hospital.toLowerCase();
      }
      if (query.area) {
        clauses.push("LOWER(h.area) = :area");
        parameters.area = query.area.toLowerCase();
      }
      builder.andWhere(
        `EXISTS (
          SELECT 1 FROM doctor_chambers dc
          INNER JOIN hospitals h ON h.id = dc.hospital_id
          WHERE ${clauses.join(" AND ")}
        )`,
        parameters,
      );
    }
    if (query.minFee !== undefined || query.maxFee !== undefined) {
      const videoClauses = ["doctor.video_consultation_fee IS NOT NULL"];
      const chamberClauses = [
        "fee_chamber.doctor_profile_id = doctor.id",
        "fee_chamber.is_active = true",
      ];
      const parameters: Record<string, number> = {};
      if (query.minFee !== undefined) {
        videoClauses.push("doctor.video_consultation_fee >= :minFee");
        chamberClauses.push("fee_chamber.consultation_fee >= :minFee");
        parameters.minFee = query.minFee;
      }
      if (query.maxFee !== undefined) {
        videoClauses.push("doctor.video_consultation_fee <= :maxFee");
        chamberClauses.push("fee_chamber.consultation_fee <= :maxFee");
        parameters.maxFee = query.maxFee;
      }
      builder.andWhere(
        `((${videoClauses.join(" AND ")}) OR EXISTS (
          SELECT 1 FROM doctor_chambers fee_chamber
          WHERE ${chamberClauses.join(" AND ")}
        ))`,
        parameters,
      );
    }

    const total = await builder.getCount();
    const rows = await builder
      .clone()
      .select("doctor.id", "id")
      .orderBy("LOWER(user.last_name)", "ASC")
      .addOrderBy("LOWER(user.first_name)", "ASC")
      .addOrderBy("doctor.id", "ASC")
      .offset((query.page - 1) * query.limit)
      .limit(query.limit)
      .getRawMany<{ id: string }>();

    const doctors = await this.findDetailedByIds(rows.map((row) => row.id));
    const byId = new Map(doctors.map((doctor) => [doctor.id, doctor]));
    const items = rows
      .map((row) => byId.get(row.id))
      .filter((doctor): doctor is DoctorProfile => doctor !== undefined)
      .map((doctor) => this.toPublic(doctor));
    return this.page(items, query, total);
  }

  async findPublicById(doctorId: string): Promise<PublicDoctorProfile | null> {
    const doctor = await this.dataSource.getRepository(DoctorProfile).findOne({
      where: {
        id: doctorId,
        applicationStatus: DoctorApplicationStatus.APPROVED,
        user: { status: UserStatus.ACTIVE },
      },
      relations: doctorRelations,
    });
    return doctor ? this.toPublic(doctor) : null;
  }

  async listSpecialties(): Promise<CatalogSpecialty[]> {
    const items = await this.dataSource.getRepository(Specialty).find({
      where: { isActive: true },
      order: { name: "ASC" },
    });
    return items.map(({ id, name, slug }) => ({ id, name, slug }));
  }

  async listHospitals(): Promise<CatalogHospital[]> {
    const items = await this.dataSource.getRepository(Hospital).find({
      where: { isActive: true },
      order: { area: "ASC", name: "ASC" },
    });
    return items.map(({ id, name, slug, area, address }) => ({
      id,
      name,
      slug,
      area,
      address,
    }));
  }

  private async resolveSpecialties(
    manager: EntityManager,
    specialtyIds: string[],
  ): Promise<Specialty[]> {
    if (specialtyIds.length === 0) return [];
    const uniqueIds = [...new Set(specialtyIds)];
    const specialties = await manager.getRepository(Specialty).find({
      where: { id: In(uniqueIds), isActive: true },
    });
    if (specialties.length !== uniqueIds.length) {
      throw new AppError(
        422,
        "INVALID_SPECIALTY",
        "One or more specialties are missing or inactive",
      );
    }
    return specialties;
  }

  /**
   * Replaces the submitted chamber collection after validating active hospitals. Callers must
   * account for regenerated chamber IDs and existing schedule/slot relations.
   */
  private async replaceChambers(
    manager: EntityManager,
    doctorId: string,
    chambers: NonNullable<UpdateDoctorProfileInput["chambers"]>,
  ): Promise<void> {
    const hospitalIds = [...new Set(chambers.map((chamber) => chamber.hospitalId))];
    const hospitals =
      hospitalIds.length === 0
        ? []
        : await manager.getRepository(Hospital).find({
            where: { id: In(hospitalIds), isActive: true },
          });
    if (hospitals.length !== hospitalIds.length) {
      throw new AppError(
        422,
        "INVALID_HOSPITAL",
        "One or more hospitals are missing or inactive",
      );
    }

    const repository = manager.getRepository(DoctorChamber);
    await repository.delete({ doctorProfileId: doctorId });
    if (chambers.length > 0) {
      await repository.save(
        chambers.map((chamber) =>
          repository.create({
            doctorProfileId: doctorId,
            hospitalId: chamber.hospitalId,
            roomOrUnit: chamber.roomOrUnit ?? null,
            consultationFee: chamber.consultationFee.toFixed(2),
            isActive: true,
          }),
        ),
      );
    }
  }

  private async requireDetails(doctorId: string): Promise<DoctorProfileDetails> {
    const doctor = await this.dataSource.getRepository(DoctorProfile).findOne({
      where: { id: doctorId },
      relations: doctorRelations,
    });
    if (!doctor) throw new Error(`Doctor ${doctorId} was not found`);
    return this.toDetails(doctor);
  }

  private findDetailedByIds(ids: string[]): Promise<DoctorProfile[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.dataSource.getRepository(DoctorProfile).find({
      where: { id: In(ids) },
      relations: doctorRelations,
    });
  }

  private decimal(value: number | null): string | null {
    return value === null ? null : value.toFixed(2);
  }

  private toDetails(doctor: DoctorProfile): DoctorProfileDetails {
    return {
      id: doctor.id,
      userId: doctor.userId,
      email: doctor.user.email,
      firstName: doctor.user.firstName,
      lastName: doctor.user.lastName,
      bmdcNumber: doctor.bmdcNumber,
      degrees: doctor.degrees,
      experienceYears: doctor.experienceYears,
      bio: doctor.bio,
      photoUrl: doctor.photoUrl,
      languages: doctor.languages ?? [],
      videoConsultationFee:
        doctor.videoConsultationFee === null ? null : Number(doctor.videoConsultationFee),
      applicationStatus: doctor.applicationStatus,
      reviewedAt: doctor.reviewedAt,
      reviewedByUserId: doctor.reviewedByUserId,
      rejectionReason: doctor.rejectionReason,
      specialties: doctor.specialties.map(({ id, name, slug }) => ({ id, name, slug })),
      chambers: doctor.chambers.map((chamber) => ({
        id: chamber.id,
        roomOrUnit: chamber.roomOrUnit,
        consultationFee: Number(chamber.consultationFee),
        isActive: chamber.isActive,
        hospital: {
          id: chamber.hospital.id,
          name: chamber.hospital.name,
          slug: chamber.hospital.slug,
          area: chamber.hospital.area,
          address: chamber.hospital.address,
        },
      })),
      createdAt: doctor.createdAt,
      updatedAt: doctor.updatedAt,
    };
  }

  private toPublic(doctor: DoctorProfile): PublicDoctorProfile {
    const details = this.toDetails(doctor);
    const fees = [
      details.videoConsultationFee,
      ...details.chambers
        .filter((chamber) => chamber.isActive)
        .map((chamber) => chamber.consultationFee),
    ].filter((value): value is number => value !== null);
    return {
      id: details.id,
      firstName: details.firstName,
      lastName: details.lastName,
      degrees: details.degrees,
      experienceYears: details.experienceYears,
      bio: details.bio,
      photoUrl: details.photoUrl,
      languages: details.languages,
      videoConsultationFee: details.videoConsultationFee,
      minimumFee: fees.length === 0 ? null : Math.min(...fees),
      specialties: details.specialties,
      chambers: details.chambers.filter((chamber) => chamber.isActive),
    };
  }

  private page<T>(
    items: T[],
    query: { page: number; limit: number },
    total: number,
  ): Paginated<T> {
    return {
      items,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
    };
  }
}
