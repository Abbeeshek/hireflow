import { DateTime, Interval } from 'luxon';

/**
 * PURE Slot Engine for HireFlow Phase 3.
 * Generates conflict-free interview slots across multiple interviewers,
 * respecting working hours, timezones, busy schedules, buffer times,
 * lead time constraints, candidate windows, and daily distribution limits.
 */

export function generateSlots({
  interviewers = [],
  durationMinutes = 45,
  bufferMinutes = 15,
  rangeStart,
  rangeEnd,
  minLeadHours = 24,
  candidateWindows = null,
  maxSlots = 6,
  granularityMinutes = 30,
  maxPerDay = 2,
  now = DateTime.utc()
}) {
  if (!interviewers || interviewers.length === 0) {
    return { slots: [], reason: 'At least one interviewer must be specified.' };
  }

  const nowDt = now instanceof DateTime ? now : DateTime.fromJSDate(now, { zone: 'utc' });
  const minLeadTime = nowDt.plus({ hours: minLeadHours });

  const startDt = rangeStart instanceof DateTime
    ? rangeStart
    : (rangeStart ? DateTime.fromISO(rangeStart.toISOString ? rangeStart.toISOString() : rangeStart, { zone: 'utc' }) : minLeadTime);

  const endDt = rangeEnd instanceof DateTime
    ? rangeEnd
    : (rangeEnd ? DateTime.fromISO(rangeEnd.toISOString ? rangeEnd.toISOString() : rangeEnd, { zone: 'utc' }) : startDt.plus({ days: 7 }));

  if (endDt <= startDt) {
    return { slots: [], reason: 'Range end date must be after range start date.' };
  }

  // Parse candidate windows if provided
  const parsedCandidateWindows = Array.isArray(candidateWindows) && candidateWindows.length > 0
    ? candidateWindows.map((cw) => ({
        start: cw.start instanceof DateTime ? cw.start : DateTime.fromISO(cw.start.toISOString ? cw.start.toISOString() : cw.start, { zone: 'utc' }),
        end: cw.end instanceof DateTime ? cw.end : DateTime.fromISO(cw.end.toISOString ? cw.end.toISOString() : cw.end, { zone: 'utc' })
      })).filter((cw) => cw.start.isValid && cw.end.isValid && cw.end > cw.start)
    : null;

  // Normalize interviewers
  const normalizedInterviewers = interviewers.map((inv) => {
    const tz = inv.timezone || 'Asia/Kolkata';
    const buf = typeof inv.bufferMinutes === 'number' ? inv.bufferMinutes : bufferMinutes;
    const weekly = Array.isArray(inv.weekly)
      ? inv.weekly
      : [
          { day: 'monday', start: '09:00', end: '18:00' },
          { day: 'tuesday', start: '09:00', end: '18:00' },
          { day: 'wednesday', start: '09:00', end: '18:00' },
          { day: 'thursday', start: '09:00', end: '18:00' },
          { day: 'friday', start: '09:00', end: '18:00' }
        ];

    const busy = (inv.busy || []).map((b) => {
      const bStart = b.start instanceof DateTime ? b.start : DateTime.fromISO(b.start.toISOString ? b.start.toISOString() : b.start, { zone: 'utc' });
      const bEnd = b.end instanceof DateTime ? b.end : DateTime.fromISO(b.end.toISOString ? b.end.toISOString() : b.end, { zone: 'utc' });
      return { start: bStart, end: bEnd };
    }).filter((b) => b.start.isValid && b.end.isValid && b.end > b.start);

    return { tz, buf, weekly, busy };
  });

  // Track candidate slot rejection reasons
  let leadTimeViolations = 0;
  let outsideWorkingHoursCount = 0;
  let busyConflictsCount = 0;
  let outsideCandidateWindowsCount = 0;
  let totalTestedSlots = 0;

  const validSlots = [];
  const daySlotCount = {}; // { 'YYYY-MM-DD': count }

  // Step from startDt to endDt by granularityMinutes
  let currentSlotStart = startDt;

  // Round startDt up to nearest granularity boundary
  const remainderMinutes = currentSlotStart.minute % granularityMinutes;
  if (remainderMinutes !== 0) {
    currentSlotStart = currentSlotStart.plus({ minutes: granularityMinutes - remainderMinutes }).set({ second: 0, millisecond: 0 });
  } else {
    currentSlotStart = currentSlotStart.set({ second: 0, millisecond: 0 });
  }

  while (currentSlotStart.plus({ minutes: durationMinutes }) <= endDt && validSlots.length < maxSlots) {
    totalTestedSlots++;
    const currentSlotEnd = currentSlotStart.plus({ minutes: durationMinutes });

    // 1. Min lead time check
    if (currentSlotStart < minLeadTime) {
      leadTimeViolations++;
      currentSlotStart = currentSlotStart.plus({ minutes: granularityMinutes });
      continue;
    }

    // 2. Candidate windows check
    if (parsedCandidateWindows && parsedCandidateWindows.length > 0) {
      const insideCandidateWindow = parsedCandidateWindows.some((cw) => (
        currentSlotStart >= cw.start && currentSlotEnd <= cw.end
      ));
      if (!insideCandidateWindow) {
        outsideCandidateWindowsCount++;
        currentSlotStart = currentSlotStart.plus({ minutes: granularityMinutes });
        continue;
      }
    }

    // 3. Interviewers checks: Working hours + Busy conflicts
    let allInsideWorkingHours = true;
    let allFree = true;

    for (const inv of normalizedInterviewers) {
      // Check working hours in interviewer's timezone
      const localStart = currentSlotStart.setZone(inv.tz);
      const localEnd = currentSlotEnd.setZone(inv.tz);
      const dayOfWeek = localStart.toFormat('cccc').toLowerCase(); // e.g. "monday"

      // Check if both start and end are on the same day in local timezone
      if (localStart.toFormat('yyyy-MM-dd') !== localEnd.toFormat('yyyy-MM-dd')) {
        allInsideWorkingHours = false;
        break;
      }

      const matchingWindows = inv.weekly.filter((w) => w.day.toLowerCase() === dayOfWeek);
      if (matchingWindows.length === 0) {
        allInsideWorkingHours = false;
        break;
      }

      const slotStartHHMM = localStart.toFormat('HH:mm');
      const slotEndHHMM = localEnd.toFormat('HH:mm');

      const insideAnyWindow = matchingWindows.some((w) => (
        slotStartHHMM >= w.start && slotEndHHMM <= w.end
      ));

      if (!insideAnyWindow) {
        allInsideWorkingHours = false;
        break;
      }

      // Check busy conflicts (with interviewer's buffer)
      const slotWithBufferStart = currentSlotStart.minus({ minutes: inv.buf });
      const slotWithBufferEnd = currentSlotEnd.plus({ minutes: inv.buf });

      for (const b of inv.busy) {
        // Overlap: slotStart < bEnd && slotEnd > bStart
        if (slotWithBufferStart < b.end && slotWithBufferEnd > b.start) {
          allFree = false;
          break;
        }
      }

      if (!allFree) break;
    }

    if (!allInsideWorkingHours) {
      outsideWorkingHoursCount++;
      currentSlotStart = currentSlotStart.plus({ minutes: granularityMinutes });
      continue;
    }

    if (!allFree) {
      busyConflictsCount++;
      currentSlotStart = currentSlotStart.plus({ minutes: granularityMinutes });
      continue;
    }

    // 4. Max per day limit
    const dayKey = currentSlotStart.toFormat('yyyy-MM-dd');
    const existingCount = daySlotCount[dayKey] || 0;
    if (existingCount >= maxPerDay) {
      // Skip to next day or next slot
      currentSlotStart = currentSlotStart.plus({ minutes: granularityMinutes });
      continue;
    }

    // Valid slot found!
    validSlots.push({
      start: currentSlotStart.toJSDate(),
      end: currentSlotEnd.toJSDate()
    });

    daySlotCount[dayKey] = existingCount + 1;
    currentSlotStart = currentSlotStart.plus({ minutes: granularityMinutes });
  }

  if (validSlots.length > 0) {
    return { slots: validSlots, reason: null };
  }

  // Determine descriptive reason why no slots were found
  let reason = 'No available slots found in the requested range.';
  if (totalTestedSlots === 0 || leadTimeViolations === totalTestedSlots) {
    reason = `All potential slots in the requested range fall within the ${minLeadHours}-hour minimum lead time window. Please select dates further out.`;
  } else if (outsideCandidateWindowsCount > 0 && outsideCandidateWindowsCount + leadTimeViolations >= totalTestedSlots) {
    reason = 'No slots fall within the candidate-provided availability windows.';
  } else if (busyConflictsCount > 0 && busyConflictsCount + outsideWorkingHoursCount >= totalTestedSlots) {
    reason = 'Interviewers have overlapping scheduled meetings or buffer conflicts during working hours.';
  } else if (outsideWorkingHoursCount > 0) {
    reason = 'No overlapping working hours found between interviewers in the selected time range.';
  }

  return { slots: [], reason };
}

export default {
  generateSlots
};
