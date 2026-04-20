import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';

@Injectable()
export class NotificationEmailService {
  private readonly logger = new Logger(NotificationEmailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {}

  async sendEmail(payload: {
    to: string;
    subject: string;
    content: string;
  }): Promise<void> {
    const transporter = this.getTransporter();
    const from = this.configService.get<string>('EMAIL_FROM');
    if (!from?.trim()) {
      throw new Error('EMAIL_FROM is not configured');
    }

    await transporter.sendMail({
      from,
      to: payload.to,
      subject: payload.subject,
      text: payload.content,
      html: `<p>${this.escapeHtml(payload.content).replace(/\n/g, '<br/>')}</p>`,
    });
  }

  private getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host?.trim() || !port || !user?.trim() || !pass?.trim()) {
      this.logger.warn(
        'SMTP config is missing (SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS)',
      );
      throw new Error('SMTP is not configured');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
    return this.transporter;
  }

  private escapeHtml(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
