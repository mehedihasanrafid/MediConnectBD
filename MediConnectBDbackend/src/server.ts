/**
 * Composition root for the running API: connects MySQL/Redis, constructs repositories and
 * services, injects them into routes, then starts HTTP. Keep domain rules in modules so tests can
 * construct them without starting this process.
 */

import "reflect-metadata";
import { createServer } from "node:http";
import Redis from "ioredis";
import { createApiRouter } from "./routes/v1";
import { createApp } from "./app";
import { env } from "./config/env";
import AppDataSource from "./database/data-source";
import { AccessTokenService } from "./modules/auth/access-token.service";
import { AuthService } from "./modules/auth/auth.service";
import { BcryptPasswordHasher } from "./modules/auth/password-hasher";
import { TypeOrmAuthRepository } from "./modules/auth/typeorm-auth.repository";
import { DoctorService } from "./modules/doctors/doctor.service";
import { TypeOrmDoctorRepository } from "./modules/doctors/typeorm-doctor.repository";
import { SchedulingService } from "./modules/scheduling/scheduling.service";
import { TypeOrmSchedulingRepository } from "./modules/scheduling/typeorm-scheduling.repository";
import { AppointmentService } from "./modules/appointments/appointment.service";
import { TypeOrmAppointmentRepository } from "./modules/appointments/typeorm-appointment.repository";
import { DailyVideoProvider, MockVideoProvider } from "./modules/appointments/video-provider";
import { PaymentService } from "./modules/payments/payment.service";
import { TypeOrmPaymentRepository } from "./modules/payments/typeorm-payment.repository";
import { SslcommerzPaymentProvider } from "./modules/payments/sslcommerz-payment-provider";
import { MockPaymentProvider } from "./modules/payments/mock-payment-provider";
import { FamilyMemberService } from "./modules/patients/family-member.service";
import { MedicalReportService } from "./modules/patients/medical-report.service";
import { TypeOrmFamilyMemberRepository } from "./modules/patients/typeorm-family-member.repository";
import { TypeOrmMedicalReportRepository } from "./modules/patients/typeorm-medical-report.repository";
import { DefaultEmailService } from "./modules/notifications/email-service";
import { ConsoleTransport } from "./modules/notifications/console-transport";
import { SmtpTransport } from "./modules/notifications/smtp-transport";
import { NotificationService } from "./modules/notifications/notification-service";
import { ReviewService } from "./modules/reviews/review.service";
import { TypeOrmReviewRepository } from "./modules/reviews/typeorm-review.repository";
import { PrescriptionService } from "./modules/prescriptions/prescription.service";
import { TypeOrmPrescriptionRepository } from "./modules/prescriptions/typeorm-prescription.repository";
import { AdminService } from "./modules/admin/admin.service";
import { TypeOrmAdminRepository } from "./modules/admin/typeorm-admin.repository";

async function main(): Promise<void> {
  await AppDataSource.initialize();

  const redis = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });
  await redis.connect();
  await redis.ping();

  const authRepository = new TypeOrmAuthRepository(AppDataSource);
  const accessTokens = new AccessTokenService(
    env.JWT_ACCESS_SECRET,
    env.ACCESS_TOKEN_TTL_SECONDS,
  );
  const authService = new AuthService(
    authRepository,
    new BcryptPasswordHasher(),
    accessTokens,
    env.REFRESH_TOKEN_TTL_DAYS,
  );
  const doctorRepository = new TypeOrmDoctorRepository(AppDataSource);
  const doctorService = new DoctorService(doctorRepository);
  const emailTransport = env.SMTP_HOST
    ? new SmtpTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
        fromAddress: env.SMTP_FROM,
      })
    : new ConsoleTransport();
  const emailService = new DefaultEmailService(emailTransport);
  const notificationService = new NotificationService(emailService);
  const schedulingService = new SchedulingService(
    new TypeOrmSchedulingRepository(AppDataSource, emailTransport),
    doctorRepository,
  );
  const videoProvider = env.DAILY_API_KEY
    ? new DailyVideoProvider(env.DAILY_API_KEY, env.DAILY_DOMAIN)
    : new MockVideoProvider();

  const appointmentService = new AppointmentService(
    new TypeOrmAppointmentRepository(AppDataSource, notificationService),
    notificationService,
    () => new Date(),
    videoProvider,
  );
  const familyMemberService = new FamilyMemberService(
    new TypeOrmFamilyMemberRepository(),
  );
  const medicalReportService = new MedicalReportService(
    new TypeOrmMedicalReportRepository(AppDataSource),
  );
  const reviewService = new ReviewService(
    new TypeOrmReviewRepository(AppDataSource),
  );
  const prescriptionService = new PrescriptionService(
    new TypeOrmPrescriptionRepository(AppDataSource),
  );
  const adminService = new AdminService(
    new TypeOrmAdminRepository(AppDataSource),
  );

  const apiRouter = createApiRouter({
    paymentService: new PaymentService(new TypeOrmPaymentRepository(AppDataSource, notificationService),
      env.SSLCOMMERZ_STORE_ID && env.SSLCOMMERZ_STORE_PASSWORD && env.PUBLIC_API_URL
        ? new SslcommerzPaymentProvider(env.SSLCOMMERZ_STORE_ID, env.SSLCOMMERZ_STORE_PASSWORD, env.PUBLIC_API_URL)
        : new MockPaymentProvider(env.APP_URL)),
    familyMemberService,
    medicalReportService,
    reviewService,
    prescriptionService,
    adminService,
    authService,
    authRepository,
    accessTokens,
    doctorService,
    schedulingService,
    appointmentService,
    secureCookies: env.NODE_ENV === "production",
  });

  const app = createApp({
    appUrl: env.APP_URL,
    logLevel: env.LOG_LEVEL,
    apiRouter,
    readiness: {
      database: async () => {
        await AppDataSource.query("SELECT 1");
      },
      redis: async () => {
        await redis.ping();
      },
    },
  });
  const server = createServer(app);

  server.listen(env.PORT, () => {
    process.stdout.write(`MediConnect API listening on port ${env.PORT}\n`);
    process.stdout.write(`Swagger UI: http://localhost:${env.PORT}/api-docs/\n`);
    process.stdout.write(`OpenAPI JSON: http://localhost:${env.PORT}/openapi.json\n`);
  });

  let stopping = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (stopping) return;
    stopping = true;
    process.stdout.write(`Received ${signal}; shutting down.\n`);

    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await redis.quit();
    await AppDataSource.destroy();
  };

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      void shutdown(signal)
        .then(() => process.exit(0))
        .catch((error: unknown) => {
          process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
          process.exit(1);
        });
    });
  }
}

void main().catch(async (error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
  process.exitCode = 1;
});
