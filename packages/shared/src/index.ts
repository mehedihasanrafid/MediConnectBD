export const USER_ROLES = ["PATIENT", "DOCTOR", "ADMIN"] as const;

export type UserRoleName = (typeof USER_ROLES)[number];

export const APPLICATION_TIME_ZONE = "Asia/Dhaka";
