import { QueryFailedError, type DataSource, type EntityManager } from "typeorm";
import { AppError } from "../../common/errors/app-error";
import {
  DoctorApplicationStatus,
  DoctorProfile,
} from "../../database/entities/doctor-profile.entity";
import { PatientProfile } from "../../database/entities/patient-profile.entity";
import { RefreshSession } from "../../database/entities/refresh-session.entity";
import { Role } from "../../database/entities/role.entity";
import { User, UserStatus } from "../../database/entities/user.entity";
import type { AuthRepository } from "./auth.repository";
import type {
  AuthUser,
  DoctorRegistration,
  NewRefreshSession,
  PatientRegistration,
  RotationResult,
} from "./auth.types";

export class TypeOrmAuthRepository implements AuthRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findUserByEmail(email: string): Promise<AuthUser | null> {
    const user = await this.dataSource.getRepository(User).findOne({
      where: { email },
      relations: { roles: true, patientProfile: true, doctorProfile: true },
    });
    return user ? this.mapUser(user) : null;
  }

  async findUserById(id: string): Promise<AuthUser | null> {
    const user = await this.dataSource.getRepository(User).findOne({
      where: { id },
      relations: { roles: true, patientProfile: true, doctorProfile: true },
    });
    return user ? this.mapUser(user) : null;
  }

  async createPatient(input: PatientRegistration, passwordHash: string): Promise<AuthUser> {
    return this.withRegistrationErrors(() =>
      this.dataSource.transaction(async (manager) => {
        const role = await this.getRole(manager, "PATIENT");
        const user = manager.getRepository(User).create({
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: null,
          roles: [role],
        });
        await manager.getRepository(User).save(user);

        const profile = manager.getRepository(PatientProfile).create({
          userId: user.id,
          phone: input.phone ?? null,
          dateOfBirth: null,
          address: null,
        });
        await manager.getRepository(PatientProfile).save(profile);
        return this.findUserByIdWithManager(manager, user.id);
      }),
    );
  }

  async createDoctor(input: DoctorRegistration, passwordHash: string): Promise<AuthUser> {
    return this.withRegistrationErrors(() =>
      this.dataSource.transaction(async (manager) => {
        const role = await this.getRole(manager, "DOCTOR");
        const user = manager.getRepository(User).create({
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: null,
          roles: [role],
        });
        await manager.getRepository(User).save(user);

        const profile = manager.getRepository(DoctorProfile).create({
          userId: user.id,
          bmdcNumber: input.bmdcNumber,
          degrees: null,
          experienceYears: 0,
          bio: null,
          applicationStatus: DoctorApplicationStatus.DRAFT,
          reviewedAt: null,
          rejectionReason: null,
        });
        await manager.getRepository(DoctorProfile).save(profile);
        return this.findUserByIdWithManager(manager, user.id);
      }),
    );
  }

  async createRefreshSession(input: NewRefreshSession): Promise<string> {
    const session = this.dataSource.getRepository(RefreshSession).create({
      ...input,
      lastUsedAt: null,
      revokedAt: null,
      replacedBySessionId: null,
    });
    return (await this.dataSource.getRepository(RefreshSession).save(session)).id;
  }

  async rotateRefreshSession(
    currentTokenHash: string,
    replacement: Omit<NewRefreshSession, "userId">,
    now: Date,
  ): Promise<RotationResult> {
    return this.dataSource.transaction(async (manager) => {
      const sessions = manager.getRepository(RefreshSession);
      const current = await sessions.findOne({
        where: { tokenHash: currentTokenHash },
        lock: { mode: "pessimistic_write" },
      });

      if (!current) return { kind: "INVALID" };

      if (current.revokedAt) {
        await this.revokeAllSessions(manager, current.userId, now);
        return { kind: "REUSED" };
      }

      if (current.expiresAt.getTime() <= now.getTime()) {
        current.revokedAt = now;
        current.lastUsedAt = now;
        await sessions.save(current);
        return { kind: "EXPIRED" };
      }

      const user = await this.findUserByIdWithManager(manager, current.userId);
      if (user.status !== UserStatus.ACTIVE) {
        await this.revokeAllSessions(manager, current.userId, now);
        return { kind: "BLOCKED" };
      }

      const next = sessions.create({
        userId: current.userId,
        ...replacement,
        lastUsedAt: null,
        revokedAt: null,
        replacedBySessionId: null,
      });
      await sessions.save(next);

      current.revokedAt = now;
      current.lastUsedAt = now;
      current.replacedBySessionId = next.id;
      await sessions.save(current);

      return { kind: "ROTATED", user, sessionId: next.id };
    });
  }

  async revokeRefreshSession(tokenHash: string, now: Date): Promise<void> {
    await this.dataSource
      .getRepository(RefreshSession)
      .createQueryBuilder()
      .update()
      .set({ revokedAt: now, lastUsedAt: now })
      .where("token_hash = :tokenHash AND revoked_at IS NULL", { tokenHash })
      .execute();
  }

  private async findUserByIdWithManager(manager: EntityManager, id: string): Promise<AuthUser> {
    const user = await manager.getRepository(User).findOne({
      where: { id },
      relations: { roles: true, patientProfile: true, doctorProfile: true },
    });
    if (!user) throw new Error(`User ${id} was not found inside the transaction`);
    return this.mapUser(user);
  }

  private async getRole(manager: EntityManager, name: string): Promise<Role> {
    const role = await manager.getRepository(Role).findOneBy({ name });
    if (!role) throw new Error(`Required role ${name} is missing; run database migrations`);
    return role;
  }

  private async revokeAllSessions(
    manager: EntityManager,
    userId: string,
    now: Date,
  ): Promise<void> {
    await manager
      .getRepository(RefreshSession)
      .createQueryBuilder()
      .update()
      .set({ revokedAt: now })
      .where("user_id = :userId AND revoked_at IS NULL", { userId })
      .execute();
  }

  private mapUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      passwordHash: user.passwordHash,
      status: user.status,
      roles: user.roles.map((role) => role.name),
      patientProfileId: user.patientProfile?.id ?? null,
      doctorProfile: user.doctorProfile
        ? {
            id: user.doctorProfile.id,
            applicationStatus: user.doctorProfile.applicationStatus,
          }
        : null,
    };
  }

  private async withRegistrationErrors<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === "ER_DUP_ENTRY"
      ) {
        throw new AppError(
          409,
          "REGISTRATION_CONFLICT",
          "The email or professional registration number is already registered",
        );
      }
      throw error;
    }
  }
}
