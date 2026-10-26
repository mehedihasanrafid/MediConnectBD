/**
 * Admin HTTP handlers. Every route is ADMIN-only; the router enforces that before these run.
 */

import type { RequestHandler as HttpHandler } from "express";
import { type RequestHandler } from "express";
import { type AuthenticatedLocals } from "../auth/auth.middleware";
import type { AdminService } from "./admin.service";
import {
  adminAppointmentQuerySchema,
  adminIdParamSchema,
  adminPaymentQuerySchema,
  adminRefundQuerySchema,
  adminUsersQuerySchema,
  createHospitalSchema,
  createSpecialtySchema,
  updateHospitalSchema,
  updateSpecialtySchema,
  updateUserStatusSchema,
} from "./admin.schema";

export function createAdminController(options: {
  adminService: AdminService;
  authenticate: RequestHandler;
}) {
  return {
    listUsers: async (request: Parameters<HttpHandler>[0], response: Parameters<HttpHandler>[1]) => {
      const query = adminUsersQuerySchema.parse(request.query);
      response.status(200).json(await options.adminService.listUsers(query));
    },

    updateUserStatus: async (request: Parameters<HttpHandler>[0], response: Parameters<HttpHandler>[1]) => {
      const actorUserId = (response.locals as AuthenticatedLocals).authUser.id;
      const userId = adminIdParamSchema.parse(request.params.userId);
      const input = updateUserStatusSchema.parse(request.body);
      response
        .status(200)
        .json(await options.adminService.updateUserStatus(userId, input.status, actorUserId));
    },

    listSpecialties: async (_request: Parameters<HttpHandler>[0], response: Parameters<HttpHandler>[1]) => {
      response.status(200).json({ items: await options.adminService.listSpecialties() });
    },

    createSpecialty: async (request: Parameters<HttpHandler>[0], response: Parameters<HttpHandler>[1]) => {
      const input = createSpecialtySchema.parse(request.body);
      response.status(201).json(await options.adminService.createSpecialty(input));
    },

    updateSpecialty: async (request: Parameters<HttpHandler>[0], response: Parameters<HttpHandler>[1]) => {
      const specialtyId = adminIdParamSchema.parse(request.params.specialtyId);
      const input = updateSpecialtySchema.parse(request.body);
      response.status(200).json(await options.adminService.updateSpecialty(specialtyId, input));
    },

    deleteSpecialty: async (request: Parameters<HttpHandler>[0], response: Parameters<HttpHandler>[1]) => {
      const specialtyId = adminIdParamSchema.parse(request.params.specialtyId);
      await options.adminService.deleteSpecialty(specialtyId);
      response.status(204).send();
    },

    listHospitals: async (_request: Parameters<HttpHandler>[0], response: Parameters<HttpHandler>[1]) => {
      response.status(200).json({ items: await options.adminService.listHospitals() });
    },

    createHospital: async (request: Parameters<HttpHandler>[0], response: Parameters<HttpHandler>[1]) => {
      const input = createHospitalSchema.parse(request.body);
      response.status(201).json(await options.adminService.createHospital(input));
    },

    updateHospital: async (request: Parameters<HttpHandler>[0], response: Parameters<HttpHandler>[1]) => {
      const hospitalId = adminIdParamSchema.parse(request.params.hospitalId);
      const input = updateHospitalSchema.parse(request.body);
      response.status(200).json(await options.adminService.updateHospital(hospitalId, input));
    },

    deleteHospital: async (request: Parameters<HttpHandler>[0], response: Parameters<HttpHandler>[1]) => {
      const hospitalId = adminIdParamSchema.parse(request.params.hospitalId);
      await options.adminService.deleteHospital(hospitalId);
      response.status(204).send();
    },

    getOverview: async (_request: Parameters<HttpHandler>[0], response: Parameters<HttpHandler>[1]) => {
      response.status(200).json(await options.adminService.getOverview());
    },

    listAppointments: async (request: Parameters<HttpHandler>[0], response: Parameters<HttpHandler>[1]) => {
      const query = adminAppointmentQuerySchema.parse(request.query);
      response.status(200).json(await options.adminService.listAppointments(query));
    },

    listPayments: async (request: Parameters<HttpHandler>[0], response: Parameters<HttpHandler>[1]) => {
      const query = adminPaymentQuerySchema.parse(request.query);
      response.status(200).json(await options.adminService.listPayments(query));
    },

    listRefunds: async (request: Parameters<HttpHandler>[0], response: Parameters<HttpHandler>[1]) => {
      const query = adminRefundQuerySchema.parse(request.query);
      response.status(200).json(await options.adminService.listRefunds(query.page, query.limit));
    },

    submitRefund: async (request: Parameters<HttpHandler>[0], response: Parameters<HttpHandler>[1]) => {
      const refundId = adminIdParamSchema.parse(request.params.refundId);
      response.status(200).json(await options.adminService.submitRefund(refundId));
    },
  };
}
