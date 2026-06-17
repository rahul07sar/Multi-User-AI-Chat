/**
 * Health service.
 *
 * Provides liveness and readiness checks for runtime dependencies.
 */

import { readdir } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";

type HealthStatus = "ok" | "error";

type LivenessReport = {
  service: string;
  status: "ok";
  timestamp: string;
  uptimeSeconds: number;
};

type DatabaseReadiness = {
  latencyMs: number | null;
  message?: string;
  status: HealthStatus;
};

type OpenAiReadiness = {
  apiKeyConfigured: boolean;
  message?: string;
  modelConfigured: boolean;
  modelName: string | null;
  status: HealthStatus;
};

type MigrationReadiness = {
  appliedCount: number;
  failedMigrations: string[];
  message?: string;
  pendingMigrations: string[];
  status: HealthStatus;
};

export type ReadinessReport = {
  checks: {
    database: DatabaseReadiness;
    migrations: MigrationReadiness;
    openai: OpenAiReadiness;
  };
  service: string;
  status: HealthStatus;
  timestamp: string;
};

type PrismaMigrationRow = {
  finished_at: Date | null;
  migration_name: string;
  rolled_back_at: Date | null;
};

export function getLivenessReport(): LivenessReport {
  return {
    service: "multi-user-chat-bot",
    status: "ok",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  };
}

async function checkDatabaseReadiness(): Promise<DatabaseReadiness> {
  const startedAt = Date.now();

  try {
    await db.$queryRaw`SELECT 1`;

    return {
      latencyMs: Date.now() - startedAt,
      status: "ok",
    };
  } catch (error) {
    return {
      latencyMs: null,
      message:
        error instanceof Error
          ? error.message
          : "Unknown database connectivity error",
      status: "error",
    };
  }
}

function checkOpenAiReadiness(): OpenAiReadiness {
  const apiKeyConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());
  const modelName = process.env.OPENAI_MODEL?.trim() || null;
  const modelConfigured = Boolean(modelName);

  if (apiKeyConfigured && modelConfigured) {
    return {
      apiKeyConfigured,
      modelConfigured,
      modelName,
      status: "ok",
    };
  }

  return {
    apiKeyConfigured,
    message: "OpenAI configuration is incomplete.",
    modelConfigured,
    modelName,
    status: "error",
  };
}

async function getExpectedMigrationNames() {
  const migrationsDirectory = path.join(process.cwd(), "prisma", "migrations");

  const directoryEntries = await readdir(migrationsDirectory, {
    withFileTypes: true,
  });

  return directoryEntries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function getAppliedMigrations() {
  return db.$queryRaw<PrismaMigrationRow[]>`
    SELECT migration_name, finished_at, rolled_back_at
    FROM "_prisma_migrations"
  `;
}

async function checkMigrationReadiness(): Promise<MigrationReadiness> {
  try {
    const [expectedMigrations, appliedMigrations] = await Promise.all([
      getExpectedMigrationNames(),
      getAppliedMigrations(),
    ]);

    const successfullyAppliedNames = new Set(
      appliedMigrations
        .filter(
          (migration) =>
            migration.finished_at !== null && migration.rolled_back_at === null
        )
        .map((migration) => migration.migration_name)
    );

    const failedMigrations = appliedMigrations
      .filter(
        (migration) =>
          migration.finished_at === null && migration.rolled_back_at === null
      )
      .map((migration) => migration.migration_name);

    const pendingMigrations = expectedMigrations.filter(
      (migrationName) => !successfullyAppliedNames.has(migrationName)
    );

    if (failedMigrations.length > 0 || pendingMigrations.length > 0) {
      return {
        appliedCount: successfullyAppliedNames.size,
        failedMigrations,
        message: "Database migrations are not fully applied.",
        pendingMigrations,
        status: "error",
      };
    }

    return {
      appliedCount: successfullyAppliedNames.size,
      failedMigrations: [],
      pendingMigrations: [],
      status: "ok",
    };
  } catch (error) {
    return {
      appliedCount: 0,
      failedMigrations: [],
      message:
        error instanceof Error
          ? error.message
          : "Unknown migration readiness error",
      pendingMigrations: [],
      status: "error",
    };
  }
}

export async function getReadinessReport(): Promise<ReadinessReport> {
  const [database, migrations] = await Promise.all([
    checkDatabaseReadiness(),
    checkMigrationReadiness(),
  ]);
  const openai = checkOpenAiReadiness();

  const status: HealthStatus =
    database.status === "ok" &&
    migrations.status === "ok" &&
    openai.status === "ok"
      ? "ok"
      : "error";

  return {
    checks: {
      database,
      migrations,
      openai,
    },
    service: "multi-user-chat-bot",
    status,
    timestamp: new Date().toISOString(),
  };
}
