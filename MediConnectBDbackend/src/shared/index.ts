/**
 * Framework-independent constants shared within the backend. Keep persisted role names stable
 * and distinguish the display timezone from UTC database timestamps; no Express or TypeORM code
 * belongs in this directory.
 */

export const USER_ROLES = ["PATIENT", "DOCTOR", "ADMIN"] as const;

export type UserRoleName = (typeof USER_ROLES)[number];

export const APPLICATION_TIME_ZONE = "Asia/Dhaka";
