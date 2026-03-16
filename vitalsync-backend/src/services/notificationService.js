import logger from '../utils/logger.js';
import { db } from '../config/db.js';

/**
 * Notification service — wraps email (via Nodemailer/SendGrid) and browser push.
 * Configure SENDGRID_API_KEY or swap with any SMTP service.
 */
export const notificationService = {
  async sendEmail(user_id, { subject, html }) {
    try {
      const { rows } = await db.query('SELECT email, name FROM users WHERE id = $1', [user_id]);
      if (!rows.length) return;
      const { email } = rows[0];

      // Use fetch to send via SendGrid REST API (no extra dep needed)
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email }] }],
          from: { email: process.env.SENDGRID_FROM_EMAIL, name: 'VitalSync AI' },
          subject,
          content: [{ type: 'text/html', value: html }]
        })
      });

      if (!res.ok) throw new Error(`SendGrid returned ${res.status}`);
      logger.info({ user_id, subject }, 'Email sent');
    } catch (err) {
      logger.error({ err, user_id }, 'Email send failed');
    }
  },

  async sendPush(user_id, { title, body, icon }) {
    // Push subscriptions would be stored in a push_subscriptions table.
    // This stub logs the notification intent.
    logger.info({ user_id, title, body }, 'Push notification queued (stub)');
    // TODO: fetch subscription from DB and call web-push.sendNotification(subscription, payload)
  }
};
