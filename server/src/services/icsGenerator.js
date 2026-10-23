import { DateTime } from 'luxon';

/**
 * Pure RFC 5545 iCalendar Generator for HireFlow Phase 3.
 * Produces strictly compliant VCALENDAR strings with UTC timestamps,
 * METHOD:REQUEST, stable UIDs, CRLF line endings, and proper 75-octet line folding.
 */

function formatUtc(date) {
  const dt = date instanceof DateTime
    ? date.toUTC()
    : DateTime.fromJSDate(new Date(date), { zone: 'utc' });
  return dt.toFormat("yyyyMMdd'T'HHmmss'Z'");
}

function escapeText(str = '') {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function foldLine(line) {
  // RFC 5545 specifies that lines longer than 75 octets should be folded with CRLF + space
  const MAX_LEN = 75;
  if (Buffer.byteLength(line, 'utf8') <= MAX_LEN) {
    return line;
  }

  const parts = [];
  let remaining = line;

  while (Buffer.byteLength(remaining, 'utf8') > MAX_LEN) {
    // Find safe character cutoff point
    let sliceLen = MAX_LEN;
    while (Buffer.byteLength(remaining.slice(0, sliceLen), 'utf8') > MAX_LEN && sliceLen > 1) {
      sliceLen--;
    }
    parts.push(remaining.slice(0, sliceLen));
    remaining = ' ' + remaining.slice(sliceLen);
  }

  if (remaining.length > 0) {
    parts.push(remaining);
  }

  return parts.join('\r\n');
}

export function generateIcs({
  interviewId,
  title = 'HireFlow Interview',
  description = 'HireFlow Interview Session',
  start,
  end,
  location = '',
  meetingLink = '',
  organizerEmail = 'noreply@hireflow.test',
  attendees = []
}) {
  const uid = `hireflow-interview-${interviewId || Date.now()}@hireflow.test`;
  const dtstamp = formatUtc(new Date());
  const dtstart = formatUtc(start);
  const dtend = formatUtc(end);

  let fullDescription = description;
  if (meetingLink) {
    fullDescription += `\\nMeeting Link: ${meetingLink}`;
  }

  const loc = meetingLink || location || 'Online Video Meeting';

  const rawLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HireFlow//Recruitment Platform//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeText(title)}`,
    `DESCRIPTION:${escapeText(fullDescription)}`,
    `LOCATION:${escapeText(loc)}`,
    `STATUS:CONFIRMED`,
    `ORGANIZER;CN=HireFlow:mailto:${organizerEmail}`
  ];

  for (const attendee of attendees) {
    const email = typeof attendee === 'string' ? attendee : attendee.email;
    const name = (typeof attendee === 'object' && attendee.name) ? attendee.name : email;
    if (email) {
      rawLines.push(`ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=${escapeText(name)}:mailto:${email}`);
    }
  }

  rawLines.push('END:VEVENT');
  rawLines.push('END:VCALENDAR');

  const foldedLines = rawLines.map(foldLine);
  return foldedLines.join('\r\n') + '\r\n';
}

export default {
  generateIcs
};
