/**
 * SMTP transport for production — sends emails via a real mail server.
 */

import nodemailer from "nodemailer";
import type { EmailMessage, EmailTransport } from "./email.types";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string };
  fromAddress: string;
}

export class SmtpTransport implements EmailTransport {
  private readonly transporter: ReturnType<typeof nodemailer.createTransport>;
  private readonly fromAddress: string;

  constructor(config: SmtpConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth ? { user: config.auth.user, pass: config.auth.pass } : undefined,
    });
    this.fromAddress = config.fromAddress;
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: `"MediConnect BD" <${this.fromAddress}>`,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text ?? stripHtml(message.html),
    });
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}
