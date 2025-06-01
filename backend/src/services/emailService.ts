import nodemailer from 'nodemailer';
import { User } from '../types';
import path from 'path';
import fs from 'fs';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface WelcomeEmailOptions {
  temporaryPassword?: string;
  createdByAdmin?: boolean;
  loginUrl?: string;
}

interface PasswordResetOptions {
  resetByAdmin?: boolean;
  adminUsername?: string;
  resetToken?: string;
  expirationTime?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig;
  private isConfigured = false;
  private templateCache = new Map<string, string>();

  constructor() {
    this.config = {
      host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    };

    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      if (!this.config.auth.user || !this.config.auth.pass) {
        console.warn('⚠️ Email service: SMTP credentials not configured');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.auth,
        tls: {
          rejectUnauthorized: false, // For development - use true in production
        },
      });

      // Verify connection configuration
      if (this.transporter) {
        await this.transporter.verify();
        this.isConfigured = true;
        console.log('✅ Email service initialized successfully');
      }

    } catch (error) {
      console.error('❌ Email service initialization failed:', error);
      this.isConfigured = false;
    }
  }

  // Validate email format
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Load and cache email templates
  private async loadTemplate(templateName: string): Promise<string> {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    try {
      const templatePath = path.join(__dirname, '../templates/email', `${templateName}.html`);
      const template = fs.readFileSync(templatePath, 'utf-8');
      this.templateCache.set(templateName, template);
      return template;
    } catch (error) {
      console.error(`Failed to load email template ${templateName}:`, error);
      // Return a basic fallback template
      return this.getFallbackTemplate(templateName);
    }
  }

  private getFallbackTemplate(templateName: string): string {
    const baseTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{{subject}}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px 0; color: #666; font-size: 12px; }
            .logo { font-size: 24px; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="logo">🎓 Skillbox</div>
            <h1>{{subject}}</h1>
        </div>
        <div class="content">
            {{content}}
        </div>
        <div class="footer">
            <p>© 2024 Skillbox Platform. Alle Rechte vorbehalten.</p>
            <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht direkt auf diese E-Mail.</p>
        </div>
    </body>
    </html>`;

    return baseTemplate;
  }

  // Replace template variables
  private replaceVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value || '');
    });
    return result;
  }

  // Convert HTML to plain text (basic conversion)
  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gs, '')
      .replace(/<script[^>]*>.*?<\/script>/gs, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Send welcome email to new users
  async sendWelcomeEmail(user: User, options: WelcomeEmailOptions = {}): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('Email service not configured');
    }

    const template = await this.loadTemplate('welcome');
    
    const variables = {
      subject: 'Willkommen bei Skillbox!',
      firstName: user.first_name || user.username,
      username: user.username,
      email: user.email,
      temporaryPassword: options.temporaryPassword || '',
      createdByAdmin: options.createdByAdmin ? 'Ja' : 'Nein',
      loginUrl: options.loginUrl || process.env.FRONTEND_URL || 'https://skillbox.local',
      year: new Date().getFullYear().toString(),
      content: options.createdByAdmin 
        ? `
        <h2>Ihr Account wurde von einem Administrator erstellt</h2>
        <p>Hallo ${user.first_name || user.username},</p>
        <p>Ihr Skillbox-Account wurde erfolgreich erstellt. Hier sind Ihre Anmeldedaten:</p>
        <div style="background: #f0f8ff; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <strong>Benutzername:</strong> ${user.username}<br>
            <strong>E-Mail:</strong> ${user.email}<br>
            ${options.temporaryPassword ? `<strong>Temporäres Passwort:</strong> ${options.temporaryPassword}` : ''}
        </div>
        <p><strong>Wichtiger Sicherheitshinweis:</strong> Bitte ändern Sie Ihr Passwort bei der ersten Anmeldung.</p>
        <a href="${options.loginUrl}" class="button">Jetzt anmelden</a>
        `
        : `
        <h2>Willkommen bei Skillbox!</h2>
        <p>Hallo ${user.first_name || user.username},</p>
        <p>Vielen Dank für Ihre Registrierung bei Skillbox. Ihr Account wurde erfolgreich erstellt.</p>
        <p>Sie können sich jetzt mit folgenden Daten anmelden:</p>
        <div style="background: #f0f8ff; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <strong>Benutzername:</strong> ${user.username}<br>
            <strong>E-Mail:</strong> ${user.email}
        </div>
        <a href="${options.loginUrl}" class="button">Jetzt anmelden</a>
        `,
    };

    const htmlContent = this.replaceVariables(template, variables);
    const textContent = this.htmlToText(htmlContent);

    await this.sendEmail({
      to: user.email,
      subject: 'Willkommen bei Skillbox!',
      html: htmlContent,
      text: textContent,
    });
  }

  // Send password reset email
  async sendPasswordResetEmail(user: User, resetToken: string, expirationTime: string = '24 Stunden'): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('Email service not configured');
    }

    const template = await this.loadTemplate('password-reset');
    const resetUrl = `${process.env.FRONTEND_URL || 'https://skillbox.local'}/reset-password?token=${resetToken}`;
    
    const variables = {
      subject: 'Passwort zurücksetzen - Skillbox',
      firstName: user.first_name || user.username,
      resetUrl,
      expirationTime,
      year: new Date().getFullYear().toString(),
      content: `
        <h2>Passwort zurücksetzen</h2>
        <p>Hallo ${user.first_name || user.username},</p>
        <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt. Klicken Sie auf den Button unten, um ein neues Passwort zu erstellen:</p>
        <a href="${resetUrl}" class="button">Passwort zurücksetzen</a>
        <p>Dieser Link ist <strong>${expirationTime}</strong> gültig.</p>
        <p>Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren. Ihr Passwort wird nicht geändert.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
        Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:<br>
        ${resetUrl}
        </p>
      `,
    };

    const htmlContent = this.replaceVariables(template, variables);
    const textContent = this.htmlToText(htmlContent);

    await this.sendEmail({
      to: user.email,
      subject: 'Passwort zurücksetzen - Skillbox',
      html: htmlContent,
      text: textContent,
    });
  }

  // Send password reset notification (after successful reset)
  async sendPasswordResetNotification(user: User, options: PasswordResetOptions = {}): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('Email service not configured');
    }

    const template = await this.loadTemplate('password-reset-notification');
    
    const variables = {
      subject: 'Passwort wurde geändert - Skillbox',
      firstName: user.first_name || user.username,
      resetTime: new Date().toLocaleString('de-DE'),
      resetByAdmin: options.resetByAdmin ? 'Ja' : 'Nein',
      adminUsername: options.adminUsername || '',
      year: new Date().getFullYear().toString(),
      content: options.resetByAdmin 
        ? `
        <h2>Ihr Passwort wurde von einem Administrator zurückgesetzt</h2>
        <p>Hallo ${user.first_name || user.username},</p>
        <p>Ihr Skillbox-Passwort wurde am <strong>${new Date().toLocaleString('de-DE')}</strong> von Administrator <strong>${options.adminUsername}</strong> zurückgesetzt.</p>
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <strong>⚠️ Sicherheitshinweis:</strong> Falls Sie diese Änderung nicht erwartet haben, wenden Sie sich sofort an Ihren Administrator.
        </div>
        <p>Wir empfehlen Ihnen, sich bei der nächsten Anmeldung ein neues, sicheres Passwort zu erstellen.</p>
        `
        : `
        <h2>Passwort erfolgreich geändert</h2>
        <p>Hallo ${user.first_name || user.username},</p>
        <p>Ihr Skillbox-Passwort wurde am <strong>${new Date().toLocaleString('de-DE')}</strong> erfolgreich geändert.</p>
        <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <strong>✅ Bestätigung:</strong> Die Passwort-Änderung war erfolgreich.
        </div>
        <p>Falls Sie diese Änderung nicht vorgenommen haben, wenden Sie sich sofort an den Support.</p>
        `,
    };

    const htmlContent = this.replaceVariables(template, variables);
    const textContent = this.htmlToText(htmlContent);

    await this.sendEmail({
      to: user.email,
      subject: 'Passwort wurde geändert - Skillbox',
      html: htmlContent,
      text: textContent,
    });
  }

  // Send role change notification
  async sendRoleChangeNotification(user: User, newRole: string): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('Email service not configured');
    }

    const template = await this.loadTemplate('role-change');
    
    const roleNames = {
      user: 'Benutzer',
      manager: 'Manager',
      admin: 'Administrator'
    };

    const variables = {
      subject: 'Ihre Benutzerrolle wurde geändert - Skillbox',
      firstName: user.first_name || user.username,
      newRole: roleNames[newRole as keyof typeof roleNames] || newRole,
      changeTime: new Date().toLocaleString('de-DE'),
      year: new Date().getFullYear().toString(),
      content: `
        <h2>Ihre Benutzerrolle wurde geändert</h2>
        <p>Hallo ${user.first_name || user.username},</p>
        <p>Ihre Benutzerrolle in Skillbox wurde am <strong>${new Date().toLocaleString('de-DE')}</strong> geändert.</p>
        <div style="background: #e2f3f1; border: 1px solid #b8dbd9; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <strong>Neue Rolle:</strong> ${roleNames[newRole as keyof typeof roleNames] || newRole}
        </div>
        <p>Mit Ihrer neuen Rolle haben Sie möglicherweise Zugriff auf zusätzliche Funktionen. Melden Sie sich an, um Ihre neuen Berechtigungen zu entdecken.</p>
        <a href="${process.env.FRONTEND_URL || 'https://skillbox.local'}" class="button">Zur Anmeldung</a>
      `,
    };

    const htmlContent = this.replaceVariables(template, variables);
    const textContent = this.htmlToText(htmlContent);

    await this.sendEmail({
      to: user.email,
      subject: 'Ihre Benutzerrolle wurde geändert - Skillbox',
      html: htmlContent,
      text: textContent,
    });
  }

  // Send account status notification
  async sendAccountStatusNotification(user: User, isActive: boolean): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('Email service not configured');
    }

    const template = await this.loadTemplate('account-status');
    const status = isActive ? 'aktiviert' : 'deaktiviert';
    
    const variables = {
      subject: `Ihr Account wurde ${status} - Skillbox`,
      firstName: user.first_name || user.username,
      status,
      statusTime: new Date().toLocaleString('de-DE'),
      year: new Date().getFullYear().toString(),
      content: isActive 
        ? `
        <h2>Ihr Account wurde aktiviert</h2>
        <p>Hallo ${user.first_name || user.username},</p>
        <p>Ihr Skillbox-Account wurde am <strong>${new Date().toLocaleString('de-DE')}</strong> aktiviert.</p>
        <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <strong>✅ Account Status:</strong> Aktiv
        </div>
        <p>Sie können sich jetzt wieder anmelden und alle Funktionen nutzen.</p>
        <a href="${process.env.FRONTEND_URL || 'https://skillbox.local'}" class="button">Zur Anmeldung</a>
        `
        : `
        <h2>Ihr Account wurde deaktiviert</h2>
        <p>Hallo ${user.first_name || user.username},</p>
        <p>Ihr Skillbox-Account wurde am <strong>${new Date().toLocaleString('de-DE')}</strong> deaktiviert.</p>
        <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <strong>⚠️ Account Status:</strong> Deaktiviert
        </div>
        <p>Falls Sie Fragen dazu haben, wenden Sie sich bitte an den Support.</p>
        `,
    };

    const htmlContent = this.replaceVariables(template, variables);
    const textContent = this.htmlToText(htmlContent);

    await this.sendEmail({
      to: user.email,
      subject: `Ihr Account wurde ${status} - Skillbox`,
      html: htmlContent,
      text: textContent,
    });
  }

  // Generic method to send emails
  private async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
    from?: string;
  }): Promise<void> {
    if (!this.transporter) {
      throw new Error('Email transporter not initialized');
    }

    const mailOptions = {
      from: options.from || process.env.SMTP_FROM || `"Skillbox" <${this.config.auth.user}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent to ${options.to}: ${info.messageId}`);
    } catch (error) {
      console.error(`❌ Failed to send email to ${options.to}:`, error);
      throw new Error(`Failed to send email: ${error}`);
    }
  }

  // Test email configuration
  async testConnection(): Promise<boolean> {
    try {
      if (!this.transporter) {
        return false;
      }
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email connection test failed:', error);
      return false;
    }
  }

  // Send test email
  async sendTestEmail(to: string): Promise<void> {
    const testContent = `
      <h2>Test E-Mail von Skillbox</h2>
      <p>Diese E-Mail bestätigt, dass Ihr E-Mail-Service korrekt konfiguriert ist.</p>
      <p>Zeitstempel: ${new Date().toLocaleString('de-DE')}</p>
    `;

    await this.sendEmail({
      to,
      subject: 'Test E-Mail - Skillbox',
      html: testContent,
      text: this.htmlToText(testContent),
    });
  }
}

export default new EmailService(); 