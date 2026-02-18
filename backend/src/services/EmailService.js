const { Resend } = require('resend');
const config = require('../config');

class EmailService {
  constructor() {
    if (config.resendApiKey) {
      this.resend = new Resend(config.resendApiKey);
    } else {
      console.warn('⚠️ RESEND_API_KEY is missing. Emails will be logged to console only.');
    }
  }

  async sendPasswordReset(email, resetLink) {
    if (!this.resend) {
      console.log('--- MOCK EMAIL SERVICE ---');
      console.log(`To: ${email}`);
      console.log(`Subject: Password Reset Request`);
      console.log(`Link: ${resetLink}`);
      console.log('--------------------------');
      return;
    }

    try {
      console.log(`📨 Attempting to send reset email to: ${email} via Resend...`);
      const { data, error } = await this.resend.emails.send({
        from: config.emailFrom,
        to: email,
        subject: 'Reset Your Password - Sezar Drive',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>You requested to reset your password for your Sezar Drive account.</p>
            <p>Click the button below to reset it:</p>
            <a href="${resetLink}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
            <p style="margin-top: 24px; color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
            <p style="color: #999; font-size: 12px; margin-top: 40px;">This link will expire in 10 minutes.</p>
          </div>
        `,
      });

      if (error) {
        console.error('❌ Resend API Error:', JSON.stringify(error, null, 2));
        throw new Error(`Failed to send email: ${error.message}`);
      }

      console.log(`Email sent successfully to ${email} (ID: ${data.id})`);
      return data;
    } catch (err) {
      console.error('Email Service Error:', err);
      // Fallback to console log in dev if API fails
      if (!config.isProduction) {
        console.log('--- MOCK EMAIL FALLBACK ---');
        console.log(`Link: ${resetLink}`);
      }
      throw err; // Propagate error in production
    }
  }
}

module.exports = new EmailService();
