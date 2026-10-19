/**
 * Formats the current account view from authenticated middleware context. An explicit allowlist
 * prevents password hashes and internal persistence fields from becoming API fields accidentally.
 */

import type { RequestHandler } from "express";
import type { AuthenticatedLocals } from "../auth/auth.middleware";

/**
 * The authentication middleware already loads current account state from MySQL.
 */
export const getMyProfile: RequestHandler = (_request, response) => {
  const user = (response.locals as AuthenticatedLocals).authUser;
  response.status(200).json({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    status: user.status,
    roles: user.roles,
    patientProfileId: user.patientProfileId,
    doctorProfile: user.doctorProfile,
  });
};
