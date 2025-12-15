import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Send password reset email
   * In development, logs to console. In production, configure with real email service.
   */
  sendPasswordResetEmail(
    email: string,
    resetToken: string,
    subdomain?: string,
  ): Promise<void> {
    const appDomain =
      this.configService.get<string>('NEXT_PUBLIC_APP_DOMAIN') || 'cms.test';
    const protocol =
      this.configService.get<string>('NEXT_PUBLIC_PROTOCOL') || 'http';
    const port =
      this.configService.get<string>('NEXT_PUBLIC_FRONTEND_PORT') || '3001';
    const isDevelopment =
      this.configService.get<string>('NODE_ENV') === 'development';

    const portSuffix = isDevelopment && port ? `:${port}` : '';
    const baseUrl = subdomain
      ? `${protocol}://${subdomain}.${appDomain}${portSuffix}`
      : `${protocol}://${appDomain}${portSuffix}`;

    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    // In development, log the email
    if (this.configService.get('NODE_ENV') === 'development') {
      this.logger.log(
        '═══════════════════════════════════════════════════════════',
      );
      this.logger.log('📧 PASSWORD RESET EMAIL (Development Mode)');
      this.logger.log(
        '═══════════════════════════════════════════════════════════',
      );
      this.logger.log(`To: ${email}`);
      this.logger.log(`Subject: Reset Your Password`);
      this.logger.log('');
      this.logger.log(`Click the following link to reset your password:`);
      this.logger.log(resetUrl);
      this.logger.log('');
      this.logger.log(`Reset Token: ${resetToken}`);
      this.logger.log(
        '═══════════════════════════════════════════════════════════',
      );

      // In production, implement actual email sending here
      // Example with nodemailer, SendGrid, SES, etc.
      /*
      const transporter = nodemailer.createTransport({
        // Configure your email provider
      });

      await transporter.sendMail({
        from: 'noreply@yourdomain.com',
        to: email,
        subject: 'Reset Your Password',
        html: `
          <h1>Reset Your Password</h1>
          <p>Click the link below to reset your password:</p>
          <a href="${resetUrl}">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `,
      });
      */
      return Promise.resolve();
    }

    // Production: Implement actual email sending
    // For now, still log but you should replace this with actual email service
    this.logger.warn(
      `Password reset email requested for ${email}, but email service not configured. Reset URL: ${resetUrl}`,
    );
    return Promise.resolve();
  }

  /**
   * Send welcome email after club registration
   * In development, logs to console. In production, configure with real email service.
   */
  sendWelcomeEmail(
    email: string,
    firstName: string,
    clubName: string,
    subdomain: string,
  ): Promise<void> {
    const appDomain =
      this.configService.get<string>('NEXT_PUBLIC_APP_DOMAIN') || 'cms.test';
    const protocol =
      this.configService.get<string>('NEXT_PUBLIC_PROTOCOL') || 'http';
    const port =
      this.configService.get<string>('NEXT_PUBLIC_FRONTEND_PORT') || '3001';
    const isDevelopment =
      this.configService.get<string>('NODE_ENV') === 'development';

    const portSuffix = isDevelopment && port ? `:${port}` : '';
    const clubUrl = `${protocol}://${subdomain}.${appDomain}${portSuffix}`;
    const loginUrl = `${clubUrl}/login`;

    // In development, log the email
    if (this.configService.get('NODE_ENV') === 'development') {
      this.logger.log(
        '═══════════════════════════════════════════════════════════',
      );
      this.logger.log('📧 WELCOME EMAIL (Development Mode)');
      this.logger.log(
        '═══════════════════════════════════════════════════════════',
      );
      this.logger.log(`To: ${email}`);
      this.logger.log(`Subject: Welcome to ${clubName}!`);
      this.logger.log('');
      this.logger.log(`Hi ${firstName},`);
      this.logger.log('');
      this.logger.log(
        `Welcome to ${clubName}! Your club workspace has been set up and is ready to use.`,
      );
      this.logger.log('');
      this.logger.log(`Your club workspace: ${clubUrl}`);
      this.logger.log(`Login: ${loginUrl}`);
      this.logger.log('');
      this.logger.log(`You can now:`);
      this.logger.log(`- Complete your onboarding`);
      this.logger.log(`- Invite team members`);
      this.logger.log(`- Start managing your club`);
      this.logger.log('');
      this.logger.log(`If you have any questions, feel free to reach out!`);
      this.logger.log('');
      this.logger.log(`Best regards,`);
      this.logger.log(`The CMS Team`);
      this.logger.log(
        '═══════════════════════════════════════════════════════════',
      );

      // In production, implement actual email sending here
      // Example with nodemailer, SendGrid, SES, etc.
      /*
      const transporter = nodemailer.createTransport({
        // Configure your email provider
      });

      await transporter.sendMail({
        from: 'noreply@yourdomain.com',
        to: email,
        subject: `Welcome to ${clubName}!`,
        html: `
          <h1>Welcome to ${clubName}!</h1>
          <p>Hi ${firstName},</p>
          <p>Your club workspace has been set up and is ready to use.</p>
          <p><strong>Your club workspace:</strong> <a href="${clubUrl}">${clubUrl}</a></p>
          <p><strong>Login:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
          <h2>What's next?</h2>
          <ul>
            <li>Complete your onboarding</li>
            <li>Invite team members</li>
            <li>Start managing your club</li>
          </ul>
          <p>If you have any questions, feel free to reach out!</p>
          <p>Best regards,<br>The CMS Team</p>
        `,
      });
      */
      return Promise.resolve();
    }

    // Production: Implement actual email sending
    // For now, still log but you should replace this with actual email service
    this.logger.warn(
      `Welcome email requested for ${email}, but email service not configured. Club URL: ${clubUrl}`,
    );
    return Promise.resolve();
  }
}
