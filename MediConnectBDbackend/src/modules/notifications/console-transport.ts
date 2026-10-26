/**
 * Console transport for development — logs emails instead of sending them.
 */

import pino from "pino";
import type { EmailMessage, EmailTransport } from "./email.types";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

export class ConsoleTransport implements EmailTransport {
  async send(message: EmailMessage): Promise<void> {
    logger.info(
      { to: message.to, subject: message.subject },
      "[DEV] Email would be sent",
    );
  }
}
