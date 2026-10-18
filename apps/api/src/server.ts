import "reflect-metadata";
import { createServer } from "node:http";
import Redis from "ioredis";
import { createApiRouter } from "./api-router";
import { createApp } from "./app";
import { env } from "./config/env";
import { AppDataSource } from "./database/data-source";
import { AccessTokenService } from "./modules/auth/access-token.service";
import { AuthService } from "./modules/auth/auth.service";
import { BcryptPasswordHasher } from "./modules/auth/password-hasher";
import { TypeOrmAuthRepository } from "./modules/auth/typeorm-auth.repository";

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
  const apiRouter = createApiRouter({
    authService,
    authRepository,
    accessTokens,
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
