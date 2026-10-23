import nodemailer from 'nodemailer';
import { EmailLog } from '../models/index.js';

let transporter = null;

function escapeHtml(str = '') {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getTransporter() {
  if (!transporter && process.env.MAIL_MODE === 'smtp') {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      }
    });
  }
  return transporter;
}

/**
 * Universal email dispatcher
 */
export async function sendEmail({
  to,
  subject,
  html,
  text = '',
  ics = null,
  kind = 'general',
  company = null,
  relatedInterview = null
}) {
  const mailMode = (process.env.MAIL_MODE || 'dev').toLowerCase();
  const mailFrom = process.env.MAIL_FROM || 'HireFlow <noreply@hireflow.test>';

  // Save to EmailLog (always, for audit & dev mailbox)
  const logEntry = await EmailLog.create({
    to: to.toLowerCase().trim(),
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    ics,
    kind,
    company,
    relatedInterview
  });

  if (mailMode === 'smtp') {
    try {
      const client = getTransporter();
      const mailOptions = {
        from: mailFrom,
        to,
        subject,
        text: text || logEntry.text,
        html
      };

      if (ics) {
        mailOptions.attachments = [
          {
            filename: 'interview.ics',
            content: ics,
            contentType: 'text/calendar; charset=utf-8; method=REQUEST'
          }
        ];
      }

      await client.sendMail(mailOptions);
    } catch (err) {
      console.error(`[MailService] SMTP send failure to ${to}:`, err.message);
    }
  } else {
    // Dev mode: stored in EmailLog with zero external network
    console.log(`[MailService] [DEV_MAILBOX] Email captured for ${to} | Subject: "${subject}" | Kind: ${kind}`);
  }

  return logEntry;
}

/**
 * HTML Email Template Generators
 */
export function renderSlotsOfferedTemplate({ candidateName, jobTitle, companyName, roundName, slots = [], portalUrl }) {
  const safeName = escapeHtml(candidateName);
  const safeJob = escapeHtml(jobTitle);
  const safeCompany = escapeHtml(companyName);
  const safeRound = escapeHtml(roundName);

  const slotsHtml = slots.map((s, idx) => `
    <li style="margin-bottom: 8px;">
      <strong>Slot ${idx + 1}:</strong> ${escapeHtml(new Date(s.start).toUTCString())} - ${escapeHtml(new Date(s.end).toUTCString())}
    </li>
  `).join('');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1A1136;">
      <h2 style="color: #4530A6;">Interview Invitation: ${safeJob}</h2>
      <p>Hello ${safeName},</p>
      <p>Great news! ${safeCompany} would like to invite you for your <strong>${safeRound}</strong> for the <strong>${safeJob}</strong> role.</p>
      <p>Please select a convenient time slot from the offered options within the next 72 hours:</p>
      <ul style="background: #F7F6FC; padding: 16px 24px; border-radius: 8px; list-style-type: none;">
        ${slotsHtml}
      </ul>
      <p style="margin-top: 24px;">
        <a href="${escapeHtml(portalUrl)}" style="background: #4530A6; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
          Choose Your Slot
        </a>
      </p>
      <p style="color: #666; font-size: 13px; margin-top: 24px;">If none of these times work, you can propose up to 3 alternate availability windows directly in the portal.</p>
    </div>
  `;

  return {
    subject: `Interview Invitation: ${safeRound} with ${safeCompany}`,
    html
  };
}

export function renderConfirmedTemplate({ recipientName, jobTitle, companyName, roundName, scheduledStart, scheduledEnd, meetingLink, location, portalUrl }) {
  const safeName = escapeHtml(recipientName);
  const safeJob = escapeHtml(jobTitle);
  const safeCompany = escapeHtml(companyName);
  const safeRound = escapeHtml(roundName);
  const startStr = escapeHtml(new Date(scheduledStart).toUTCString());
  const endStr = escapeHtml(new Date(scheduledEnd).toUTCString());
  const safeLink = escapeHtml(meetingLink);

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1A1136;">
      <h2 style="color: #1FA971;">Interview Confirmed: ${safeJob}</h2>
      <p>Hello ${safeName},</p>
      <p>Your <strong>${safeRound}</strong> with <strong>${safeCompany}</strong> has been confirmed.</p>
      <div style="background: #F7F6FC; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0;"><strong>Time (UTC):</strong> ${startStr} – ${endStr}</p>
        ${meetingLink ? `<p style="margin: 0 0 8px 0;"><strong>Video Meeting Link:</strong> <a href="${safeLink}">${safeLink}</a></p>` : ''}
        ${location ? `<p style="margin: 0;"><strong>Location:</strong> ${escapeHtml(location)}</p>` : ''}
      </div>
      <p>A calendar invite (.ics) has been attached to this email.</p>
      <p style="margin-top: 24px;">
        <a href="${escapeHtml(portalUrl)}" style="background: #4530A6; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
          View in HireFlow
        </a>
      </p>
    </div>
  `;

  return {
    subject: `Confirmed: ${safeRound} - ${safeJob} (${safeCompany})`,
    html
  };
}

export function renderReminderTemplate({ recipientName, jobTitle, companyName, roundName, scheduledStart, meetingLink, portalUrl, hoursAhead = 24 }) {
  const safeName = escapeHtml(recipientName);
  const safeJob = escapeHtml(jobTitle);
  const safeCompany = escapeHtml(companyName);
  const safeRound = escapeHtml(roundName);
  const startStr = escapeHtml(new Date(scheduledStart).toUTCString());

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1A1136;">
      <h2 style="color: #F5A324;">Reminder: Interview in ${hoursAhead} Hour${hoursAhead > 1 ? 's' : ''}</h2>
      <p>Hello ${safeName},</p>
      <p>This is a friendly reminder that your <strong>${safeRound}</strong> for <strong>${safeJob}</strong> at <strong>${safeCompany}</strong> is scheduled for:</p>
      <p style="font-size: 16px; font-weight: bold; background: #F7F6FC; padding: 12px; border-radius: 6px;">
        ${startStr} (UTC)
      </p>
      ${meetingLink ? `<p>Join meeting: <a href="${escapeHtml(meetingLink)}">${escapeHtml(meetingLink)}</a></p>` : ''}
      <p><a href="${escapeHtml(portalUrl)}" style="color: #4530A6; font-weight: 600;">Open HireFlow Portal</a></p>
    </div>
  `;

  return {
    subject: `Reminder: ${safeRound} in ${hoursAhead}h - ${safeJob}`,
    html
  };
}

export function renderCancelledTemplate({ recipientName, jobTitle, companyName, roundName, reason }) {
  const safeName = escapeHtml(recipientName);
  const safeJob = escapeHtml(jobTitle);
  const safeCompany = escapeHtml(companyName);
  const safeRound = escapeHtml(roundName);
  const safeReason = escapeHtml(reason || 'Scheduling conflict');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1A1136;">
      <h2 style="color: #D9534F;">Interview Cancelled</h2>
      <p>Hello ${safeName},</p>
      <p>The <strong>${safeRound}</strong> for <strong>${safeJob}</strong> with <strong>${safeCompany}</strong> has been cancelled.</p>
      <p><strong>Reason:</strong> ${safeReason}</p>
      <p>Our recruiting team will be in touch with next steps.</p>
    </div>
  `;

  return {
    subject: `Cancelled: ${safeRound} for ${safeJob}`,
    html
  };
}

export function renderRescheduleRequestedTemplate({ recruiterName, candidateName, jobTitle, reason, portalUrl }) {
  const safeRecruiter = escapeHtml(recruiterName);
  const safeCandidate = escapeHtml(candidateName);
  const safeJob = escapeHtml(jobTitle);
  const safeReason = escapeHtml(reason || 'Unspecified');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1A1136;">
      <h2 style="color: #F5A324;">Reschedule Requested: ${safeJob}</h2>
      <p>Hello ${safeRecruiter},</p>
      <p>Candidate <strong>${safeCandidate}</strong> has requested to reschedule their interview for <strong>${safeJob}</strong>.</p>
      <p><strong>Reason provided:</strong> ${safeReason}</p>
      <p style="margin-top: 24px;">
        <a href="${escapeHtml(portalUrl)}" style="background: #4530A6; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
          Review & Offer New Slots
        </a>
      </p>
    </div>
  `;

  return {
    subject: `Reschedule Requested: ${safeCandidate} - ${safeJob}`,
    html
  };
}

export function renderInvitationTemplate({ candidateName, jobTitle, companyName, portalUrl }) {
  const safeName = escapeHtml(candidateName);
  const safeJob = escapeHtml(jobTitle);
  const safeCompany = escapeHtml(companyName);

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1A1136;">
      <h2 style="color: #4530A6;">You're Invited to Apply: ${safeJob}</h2>
      <p>Hello ${safeName},</p>
      <p>Because you are part of our talent pool, the recruitment team at <strong>${safeCompany}</strong> reviewed your profile and thinks you would be a great fit for a new role: <strong>${safeJob}</strong>.</p>
      <p style="margin-top: 24px;">
        <a href="${escapeHtml(portalUrl)}" style="background: #4530A6; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
          View Job & Apply
        </a>
      </p>
    </div>
  `;

  return {
    subject: `Opportunity: ${safeJob} at ${safeCompany}`,
    html
  };
}

export default {
  sendEmail,
  renderSlotsOfferedTemplate,
  renderConfirmedTemplate,
  renderReminderTemplate,
  renderCancelledTemplate,
  renderRescheduleRequestedTemplate,
  renderInvitationTemplate
};
