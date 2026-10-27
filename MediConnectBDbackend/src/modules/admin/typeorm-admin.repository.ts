/**
 * TypeORM implementation of admin operations: account status, catalog CRUD, reporting,
 * and refund submission. Refund submission records provider intent only; no provider call is made
 * because PaymentProvider exposes no refund method.
 */

import { In, type DataSource } from "typeorm";
import { User, UserStatus } from "../users/user.entity";
import { Specialty } from "../specialties/specialty.entity";
import { Hospital } from "../hospitals/hospital.entity";
import { Appointment, AppointmentStatus } from "../appointments/appointment.entity";
import { Payment } from "../payments/payment.entity";
import { Refund } from "../payments/refund.entity";
import { DoctorProfile } from "../doctors/doctor-profile.entity";
import { PatientProfile } from "../patients/patient-profile.entity";
import { dhakaDateRange, todayInDhaka } from "../scheduling/slot-generator";
import type { AdminRepository } from "./admin.repository";
import type {
  AdminAppointmentQuery,
  AdminAppointmentsPage,
  AdminOverview,
  AdminPaymentQuery,
  AdminPaymentsPage,
  AdminRefundView,
  AdminRefundsPage,
  AdminUsersPage,
  AdminUsersQuery,
  CatalogDeleteResult,
  CatalogWriteResult,
  CreateHospitalInput,
  CreateSpecialtyInput,
  HospitalView,
  SpecialtyView,
  SubmitRefundResult,
  UpdateHospitalInput,
  UpdateSpecialtyInput,
  UpdateUserStatusResult,
} from "./admin.types";

export class TypeOrmAdminRepository implements AdminRepository {
  constructor(private readonly dataSource: DataSource) {}

  async listUsers(query: AdminUsersQuery): Promise<AdminUsersPage> {
    const builder = this.dataSource
      .getRepository(User)
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.roles", "role");

    if (query.status) builder.andWhere("user.status = :status", { status: query.status });
    if (query.role) builder.andWhere("role.name = :role", { role: query.role });
    if (query.search) {
      builder.andWhere(
        "(user.email LIKE :search OR user.firstName LIKE :search OR user.lastName LIKE :search)",
        { search: `%${query.search}%` },
      );
    }

    const total = await builder.getCount();
    const items = await builder
      .orderBy("user.createdAt", "DESC")
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getMany();

    return {
      items: items.map((user) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        roles: user.roles.map((role) => role.name),
        createdAt: user.createdAt,
      })),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async updateUserStatus(
    userId: string,
    status: UserStatus,
    actorUserId: string,
  ): Promise<UpdateUserStatusResult> {
    if (userId === actorUserId && status === UserStatus.SUSPENDED) {
      return { kind: "SELF_SUSPENSION_FORBIDDEN" };
    }

    const repository = this.dataSource.getRepository(User);
    const user = await repository.findOne({
      where: { id: userId },
      relations: { roles: true },
    });
    if (!user) return { kind: "USER_NOT_FOUND" };

    user.status = status;
    const saved = await repository.save(user);

    return {
      kind: "UPDATED",
      user: {
        id: saved.id,
        email: saved.email,
        firstName: saved.firstName,
        lastName: saved.lastName,
        status: saved.status,
        roles: saved.roles.map((role) => role.name),
        createdAt: saved.createdAt,
      },
    };
  }

  async listSpecialties(): Promise<SpecialtyView[]> {
    const items = await this.dataSource
      .getRepository(Specialty)
      .find({ order: { name: "ASC" } });
    return items.map((item) => this.toSpecialty(item));
  }

  async createSpecialty(
    input: CreateSpecialtyInput,
  ): Promise<CatalogWriteResult<SpecialtyView>> {
    const repository = this.dataSource.getRepository(Specialty);
    const existing = await repository.findOne({ where: { slug: input.slug } });
    if (existing) return { kind: "SLUG_CONFLICT" };

    const saved = await repository.save(
      repository.create({ name: input.name, slug: input.slug, isActive: true }),
    );
    return { kind: "CREATED", item: this.toSpecialty(saved) };
  }

  async updateSpecialty(
    specialtyId: string,
    input: UpdateSpecialtyInput,
  ): Promise<CatalogWriteResult<SpecialtyView>> {
    const repository = this.dataSource.getRepository(Specialty);
    const specialty = await repository.findOne({ where: { id: specialtyId } });
    if (!specialty) return { kind: "NOT_FOUND" };

    if (input.slug && input.slug !== specialty.slug) {
      const conflict = await repository.findOne({ where: { slug: input.slug } });
      if (conflict) return { kind: "SLUG_CONFLICT" };
    }

    if (input.name !== undefined) specialty.name = input.name;
    if (input.slug !== undefined) specialty.slug = input.slug;
    if (input.isActive !== undefined) specialty.isActive = input.isActive;

    const saved = await repository.save(specialty);
    return { kind: "UPDATED", item: this.toSpecialty(saved) };
  }

  async deleteSpecialty(specialtyId: string): Promise<CatalogDeleteResult> {
    const repository = this.dataSource.getRepository(Specialty);
    const specialty = await repository.findOne({ where: { id: specialtyId } });
    if (!specialty) return { kind: "NOT_FOUND" };

    // Soft delete: deactivate rather than remove, because doctors reference specialties.
    specialty.isActive = false;
    await repository.save(specialty);
    return { kind: "DELETED" };
  }

  async listHospitals(): Promise<HospitalView[]> {
    const items = await this.dataSource
      .getRepository(Hospital)
      .find({ order: { area: "ASC", name: "ASC" } });
    return items.map((item) => this.toHospital(item));
  }

  async createHospital(
    input: CreateHospitalInput,
  ): Promise<CatalogWriteResult<HospitalView>> {
    const repository = this.dataSource.getRepository(Hospital);
    const existing = await repository.findOne({ where: { slug: input.slug } });
    if (existing) return { kind: "SLUG_CONFLICT" };

    const saved = await repository.save(
      repository.create({
        name: input.name,
        slug: input.slug,
        area: input.area,
        address: input.address,
        isActive: true,
      }),
    );
    return { kind: "CREATED", item: this.toHospital(saved) };
  }

  async updateHospital(
    hospitalId: string,
    input: UpdateHospitalInput,
  ): Promise<CatalogWriteResult<HospitalView>> {
    const repository = this.dataSource.getRepository(Hospital);
    const hospital = await repository.findOne({ where: { id: hospitalId } });
    if (!hospital) return { kind: "NOT_FOUND" };

    if (input.slug && input.slug !== hospital.slug) {
      const conflict = await repository.findOne({ where: { slug: input.slug } });
      if (conflict) return { kind: "SLUG_CONFLICT" };
    }

    if (input.name !== undefined) hospital.name = input.name;
    if (input.slug !== undefined) hospital.slug = input.slug;
    if (input.area !== undefined) hospital.area = input.area;
    if (input.address !== undefined) hospital.address = input.address;
    if (input.isActive !== undefined) hospital.isActive = input.isActive;

    const saved = await repository.save(hospital);
    return { kind: "UPDATED", item: this.toHospital(saved) };
  }

  async deleteHospital(hospitalId: string): Promise<CatalogDeleteResult> {
    const repository = this.dataSource.getRepository(Hospital);
    const hospital = await repository.findOne({ where: { id: hospitalId } });
    if (!hospital) return { kind: "NOT_FOUND" };

    // Soft delete: chambers reference hospitals.
    hospital.isActive = false;
    await repository.save(hospital);
    return { kind: "DELETED" };
  }

  async getOverview(): Promise<AdminOverview> {
    const users = await this.dataSource
      .getRepository(User)
      .createQueryBuilder("user")
      .select("user.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("user.status")
      .getRawMany<{ status: string; count: string }>();

    const userCounts = { total: 0, active: 0, suspended: 0, pending: 0 };
    for (const row of users) {
      const count = Number(row.count);
      userCounts.total += count;
      if (row.status === UserStatus.ACTIVE) userCounts.active = count;
      if (row.status === UserStatus.SUSPENDED) userCounts.suspended = count;
      if (row.status === UserStatus.PENDING) userCounts.pending = count;
    }

    const doctors = await this.dataSource
      .getRepository(DoctorProfile)
      .createQueryBuilder("doctor")
      .select("doctor.applicationStatus", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("doctor.applicationStatus")
      .getRawMany<{ status: string; count: string }>();

    const doctorCounts = { total: 0, approved: 0, pendingReview: 0 };
    for (const row of doctors) {
      const count = Number(row.count);
      doctorCounts.total += count;
      if (row.status === "APPROVED") doctorCounts.approved = count;
      if (row.status === "PENDING_REVIEW") doctorCounts.pendingReview = count;
    }

    const appointments = await this.dataSource
      .getRepository(Appointment)
      .createQueryBuilder("appointment")
      .select("appointment.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("appointment.status")
      .getRawMany<{ status: string; count: string }>();

    const appointmentCounts = { total: 0, confirmed: 0, cancelled: 0, completed: 0, today: 0 };
    for (const row of appointments) {
      const count = Number(row.count);
      appointmentCounts.total += count;
      if (row.status === AppointmentStatus.CONFIRMED) appointmentCounts.confirmed = count;
      if (row.status === AppointmentStatus.CANCELLED) appointmentCounts.cancelled = count;
      if (row.status === AppointmentStatus.COMPLETED) appointmentCounts.completed = count;
    }

    const now = new Date();
    const todayStr = todayInDhaka(now);
    const todayRange = dhakaDateRange(todayStr, 1);
    const monthStartRange = dhakaDateRange(`${todayStr.slice(0, 7)}-01`, 1);

    const [todayAppointmentsCount, newPatientsThisMonth, specialtyRows, topDoctorRows] =
      await Promise.all([
        this.dataSource
          .getRepository(Appointment)
          .createQueryBuilder("appointment")
          .where("appointment.scheduledStartAt >= :todayStart", { todayStart: todayRange.start })
          .andWhere("appointment.scheduledStartAt < :todayEnd", { todayEnd: todayRange.end })
          .getCount(),
        this.dataSource
          .getRepository(PatientProfile)
          .createQueryBuilder("patient")
          .where("patient.createdAt >= :monthStart", { monthStart: monthStartRange.start })
          .getCount(),
        this.dataSource
          .getRepository(Appointment)
          .createQueryBuilder("appointment")
          .innerJoin("doctor_specialties", "ds", "ds.doctor_id = appointment.doctorProfileId")
          .innerJoin(Specialty, "specialty", "specialty.id = ds.specialty_id")
          .select("specialty.id", "specialtyId")
          .addSelect("specialty.name", "name")
          .addSelect("specialty.slug", "slug")
          .addSelect("COUNT(DISTINCT appointment.id)", "appointmentsCount")
          .groupBy("specialty.id")
          .addGroupBy("specialty.name")
          .addGroupBy("specialty.slug")
          .orderBy("COUNT(DISTINCT appointment.id)", "DESC")
          .addOrderBy("specialty.name", "ASC")
          .limit(5)
          .getRawMany<{
            specialtyId: string;
            name: string;
            slug: string;
            appointmentsCount: string;
          }>(),
        this.dataSource
          .getRepository(Appointment)
          .createQueryBuilder("appointment")
          .innerJoin("appointment.doctor", "doctor")
          .innerJoin("doctor.user", "user")
          .select("doctor.id", "doctorId")
          .addSelect("user.firstName", "firstName")
          .addSelect("user.lastName", "lastName")
          .addSelect("doctor.bmdcNumber", "bmdcNumber")
          .addSelect("COUNT(*)", "appointmentsCount")
          .addSelect(
            "SUM(CASE WHEN appointment.status = :completed THEN 1 ELSE 0 END)",
            "completedCount",
          )
          .setParameter("completed", AppointmentStatus.COMPLETED)
          .groupBy("doctor.id")
          .addGroupBy("user.firstName")
          .addGroupBy("user.lastName")
          .addGroupBy("doctor.bmdcNumber")
          .orderBy("COUNT(*)", "DESC")
          .addOrderBy("user.lastName", "ASC")
          .limit(5)
          .getRawMany<{
            doctorId: string;
            firstName: string;
            lastName: string;
            bmdcNumber: string;
            appointmentsCount: string;
            completedCount: string;
          }>(),
      ]);

    appointmentCounts.today = todayAppointmentsCount;

    const paymentTotals = await this.dataSource
      .getRepository(Payment)
      .createQueryBuilder("payment")
      .select("COUNT(*)", "count")
      .addSelect("COALESCE(SUM(payment.amount), 0)", "gross")
      .addSelect("COALESCE(SUM(payment.commissionAmount), 0)", "commission")
      .addSelect("COALESCE(SUM(payment.netAmount), 0)", "net")
      .where("payment.status = :status", { status: "SUCCEEDED" })
      .getRawOne<{ count: string; gross: string; commission: string; net: string }>();

    const refundTotals = await this.dataSource
      .getRepository(Refund)
      .createQueryBuilder("refund")
      .select("COUNT(*)", "count")
      .addSelect("COALESCE(SUM(refund.amount), 0)", "total")
      .where("refund.status = :status", { status: "REQUESTED" })
      .getRawOne<{ count: string; total: string }>();

    return {
      users: userCounts,
      doctors: doctorCounts,
      patients: {
        newThisMonth: newPatientsThisMonth,
      },
      appointments: appointmentCounts,
      payments: {
        succeeded: Number(paymentTotals?.count ?? 0),
        grossAmount: Number(paymentTotals?.gross ?? 0).toFixed(2),
        commissionAmount: Number(paymentTotals?.commission ?? 0).toFixed(2),
        netAmount: Number(paymentTotals?.net ?? 0).toFixed(2),
      },
      refunds: {
        requested: Number(refundTotals?.count ?? 0),
        totalAmount: Number(refundTotals?.total ?? 0).toFixed(2),
      },
      mostBookedSpecialties: specialtyRows.map((row) => ({
        specialtyId: row.specialtyId,
        name: row.name,
        slug: row.slug,
        appointmentsCount: Number(row.appointmentsCount),
      })),
      topDoctors: topDoctorRows.map((row) => ({
        doctorId: row.doctorId,
        firstName: row.firstName,
        lastName: row.lastName,
        bmdcNumber: row.bmdcNumber,
        appointmentsCount: Number(row.appointmentsCount),
        completedCount: Number(row.completedCount ?? 0),
      })),
    };
  }

  async listAppointments(query: AdminAppointmentQuery): Promise<AdminAppointmentsPage> {
    const builder = this.dataSource.getRepository(Appointment).createQueryBuilder("appointment");

    if (query.status) builder.andWhere("appointment.status = :status", { status: query.status });
    if (query.doctorId) {
      builder.andWhere("appointment.doctorProfileId = :doctorId", { doctorId: query.doctorId });
    }
    if (query.patientProfileId) {
      builder.andWhere("appointment.patientProfileId = :patientProfileId", {
        patientProfileId: query.patientProfileId,
      });
    }
    if (query.from) {
      builder.andWhere("appointment.scheduledStartAt >= :from", { from: query.from });
    }
    if (query.to) {
      builder.andWhere("appointment.scheduledStartAt <= :to", { to: query.to });
    }

    const total = await builder.getCount();
    const items = await builder
      .orderBy("appointment.scheduledStartAt", "DESC")
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getMany();

    return {
      items: items.map((appointment) => ({
        id: appointment.id,
        patientProfileId: appointment.patientProfileId,
        doctorId: appointment.doctorProfileId,
        status: appointment.status,
        mode: appointment.mode,
        scheduledStartAt: appointment.scheduledStartAt,
        feeAmount: appointment.feeAmount,
        createdAt: appointment.createdAt,
      })),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async listPayments(query: AdminPaymentQuery): Promise<AdminPaymentsPage> {
    const builder = this.dataSource.getRepository(Payment).createQueryBuilder("payment");

    if (query.status) builder.andWhere("payment.status = :status", { status: query.status });
    if (query.from) builder.andWhere("payment.createdAt >= :from", { from: query.from });
    if (query.to) builder.andWhere("payment.createdAt <= :to", { to: query.to });

    const total = await builder.getCount();
    const items = await builder
      .orderBy("payment.createdAt", "DESC")
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getMany();

    return {
      items: items.map((payment) => ({
        id: payment.id,
        appointmentId: payment.appointmentId,
        patientProfileId: payment.patientProfileId,
        transactionId: payment.transactionId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        commissionAmount: payment.commissionAmount,
        netAmount: payment.netAmount,
        createdAt: payment.createdAt,
      })),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async listRefunds(page: number, limit: number): Promise<AdminRefundsPage> {
    const repository = this.dataSource.getRepository(Refund);
    const [items, total] = await repository.findAndCount({
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: items.map((refund) => this.toRefund(refund)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findRefund(refundId: string): Promise<AdminRefundView | null> {
    const refund = await this.dataSource.getRepository(Refund).findOne({
      where: { id: refundId },
    });
    return refund ? this.toRefund(refund) : null;
  }

  /**
   * Marks a REQUESTED refund as SUBMITTED. No provider call is made: PaymentProvider has no
   * refund method, so execution remains a manual operational step.
   */
  async submitRefund(refundId: string): Promise<SubmitRefundResult> {
    const repository = this.dataSource.getRepository(Refund);
    const refund = await repository.findOne({ where: { id: refundId } });
    if (!refund) return { kind: "REFUND_NOT_FOUND" };
    if (refund.status !== "REQUESTED") return { kind: "REFUND_NOT_REQUESTED" };

    refund.status = "SUBMITTED";
    const saved = await repository.save(refund);
    return { kind: "SUBMITTED", refund: this.toRefund(saved) };
  }

  private toSpecialty(item: Specialty): SpecialtyView {
    return { id: item.id, name: item.name, slug: item.slug, isActive: item.isActive };
  }

  private toHospital(item: Hospital): HospitalView {
    return {
      id: item.id,
      name: item.name,
      slug: item.slug,
      area: item.area,
      address: item.address,
      isActive: item.isActive,
    };
  }

  private toRefund(refund: Refund): AdminRefundView {
    return {
      id: refund.id,
      paymentId: refund.paymentId,
      refundTransactionId: refund.refundTransactionId,
      amount: refund.amount,
      status: refund.status,
      reason: refund.reason,
      providerReference: refund.providerReference,
      createdAt: refund.createdAt,
    };
  }
}
