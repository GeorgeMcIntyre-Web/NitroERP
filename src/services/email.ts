import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

class EmailService {
  private static instance: EmailService;
  private transporter: nodemailer.Transporter | null = null;

  private constructor() {
    this.initializeTransporter();
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private initializeTransporter(): void {
    const config = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    };

    this.transporter = nodemailer.createTransporter(config);

    // Verify connection
    this.transporter.verify((error, success) => {
      if (error) {
        logger.error('Email service initialization failed:', error);
      } else {
        logger.info('Email service initialized successfully');
      }
    });
  }

  private async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.transporter) {
      throw new Error('Email service not initialized');
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@nitroerp.com',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info('Email sent successfully', { messageId: info.messageId, to: options.to });
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  // Welcome email for new users
  public async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    const subject = 'Welcome to NitroERP!';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to NitroERP</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 Welcome to NitroERP!</h1>
            <p>Your Enterprise Resource Planning Solution</p>
          </div>
          <div class="content">
            <h2>Hello ${firstName}!</h2>
            <p>Welcome to NitroERP, your comprehensive enterprise resource planning system designed to streamline your business operations.</p>
            
            <h3>What you can do with NitroERP:</h3>
            <ul>
              <li>📊 <strong>Financial Management:</strong> Track accounts, transactions, and generate reports</li>
              <li>👥 <strong>HR Management:</strong> Manage employees, attendance, and payroll</li>
              <li>🔧 <strong>Engineering:</strong> 3D design tools and project management</li>
              <li>🏭 <strong>Manufacturing:</strong> Work orders, quality control, and production tracking</li>
              <li>⚡ <strong>Control Systems:</strong> Electrical and pneumatic design management</li>
            </ul>
            
            <p>Your account has been successfully created and you can now access all the features available to your role.</p>
            
            <a href="${process.env.CORS_ORIGIN || 'http://localhost:3000'}" class="button">Access NitroERP</a>
            
            <p><strong>Need help?</strong> Contact your system administrator or check our documentation for guidance.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from NitroERP. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} NitroERP. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({ to: email, subject, html });
  }

  // Password reset email
  public async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const subject = 'Password Reset Request - NitroERP';
    const resetUrl = `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset - NitroERP</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 24px; background: #ff6b6b; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
            <p>NitroERP Account Security</p>
          </div>
          <div class="content">
            <h2>Hello!</h2>
            <p>We received a request to reset your password for your NitroERP account.</p>
            
            <a href="${resetUrl}" class="button">Reset Password</a>
            
            <div class="warning">
              <strong>⚠️ Important:</strong>
              <ul>
                <li>This link will expire in 1 hour</li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>For security, this link can only be used once</li>
              </ul>
            </div>
            
            <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 5px; font-size: 12px;">
              ${resetUrl}
            </p>
            
            <p>If you have any questions, please contact your system administrator.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from NitroERP. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} NitroERP. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({ to: email, subject, html });
  }

  // Notification email
  public async sendNotificationEmail(email: string, notification: {
    title: string;
    message: string;
    type: string;
    priority?: string;
  }): Promise<void> {
    const subject = `[NitroERP] ${notification.title}`;
    
    const priorityColors = {
      low: '#28a745',
      medium: '#ffc107',
      high: '#fd7e14',
      urgent: '#dc3545',
    };

    const color = priorityColors[notification.priority as keyof typeof priorityColors] || '#6c757d';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${notification.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 24px; background: ${color}; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📢 ${notification.title}</h1>
            <p>NitroERP Notification</p>
          </div>
          <div class="content">
            <div style="white-space: pre-wrap;">${notification.message}</div>
            
            <a href="${process.env.CORS_ORIGIN || 'http://localhost:3000'}" class="button">View in NitroERP</a>
          </div>
          <div class="footer">
            <p>This is an automated message from NitroERP. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} NitroERP. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({ to: email, subject, html });
  }

  // System announcement email
  public async sendAnnouncementEmail(email: string, announcement: {
    title: string;
    message: string;
    priority: string;
  }): Promise<void> {
    const subject = `[ANNOUNCEMENT] ${announcement.title}`;
    
    const priorityColors = {
      low: '#28a745',
      medium: '#ffc107',
      high: '#fd7e14',
      urgent: '#dc3545',
    };

    const color = priorityColors[announcement.priority as keyof typeof priorityColors] || '#6c757d';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${announcement.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 24px; background: ${color}; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📢 ${announcement.title}</h1>
            <p>NitroERP System Announcement</p>
          </div>
          <div class="content">
            <div style="white-space: pre-wrap;">${announcement.message}</div>
            
            <a href="${process.env.CORS_ORIGIN || 'http://localhost:3000'}" class="button">View in NitroERP</a>
          </div>
          <div class="footer">
            <p>This is an automated message from NitroERP. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} NitroERP. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({ to: email, subject, html });
  }

  // Report generation email
  public async sendReportEmail(email: string, report: {
    title: string;
    description: string;
    attachmentName: string;
    attachmentContent: Buffer;
  }): Promise<void> {
    const subject = `[REPORT] ${report.title} - NitroERP`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${report.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 ${report.title}</h1>
            <p>NitroERP Report</p>
          </div>
          <div class="content">
            <p>${report.description}</p>
            <p>The requested report is attached to this email.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from NitroERP. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} NitroERP. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject,
      html,
      attachments: [{
        filename: report.attachmentName,
        content: report.attachmentContent,
      }],
    });
  }

  // Test email functionality
  public async sendTestEmail(email: string): Promise<void> {
    const subject = 'Test Email - NitroERP';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Test Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Test Email</h1>
            <p>NitroERP Email Service</p>
          </div>
          <div class="content">
            <p>This is a test email to verify that the NitroERP email service is working correctly.</p>
            <p>If you received this email, the email configuration is properly set up.</p>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          </div>
          <div class="footer">
            <p>This is a test message from NitroERP.</p>
            <p>&copy; ${new Date().getFullYear()} NitroERP. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({ to: email, subject, html });
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance();

// Export the class for testing
export { EmailService }; 