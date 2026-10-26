/**
 * Notification service — sends booking confirmation emails when appointments are confirmed.
 */

import type { EmailService } from "./email.types";

export class NotificationService {
  constructor(private readonly emailService: EmailService) {}

  /**
   * Sends a booking confirmation email after an appointment is confirmed.
   * This is called by the appointment service after successful booking.
   */
  async sendBookingConfirmation(
    patientEmail: string,
    appointmentId: string,
    doctorName: string,
    scheduledAt: Date,
    feeAmount: number,
  ): Promise<void> {
    await this.emailService.sendBookingConfirmation(
      patientEmail,
      appointmentId,
      doctorName,
      scheduledAt,
      feeAmount,
    );
  }
}
