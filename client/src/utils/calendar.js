/**
 * Calendar Utilities for D.WORLD Appointments
 * Supports:
 * 1. Direct Google Calendar link
 * 2. .ics file generation for Apple Calendar, Outlook, and mobile devices
 */

// Format YYYY-MM-DD + Time (e.g. "09:00 AM") to UTC ISO format for calendar
function parseAppointmentDates(dateStr, timeStr, durationMinutes = 45) {
  try {
    let [hours, minutes] = [9, 0];
    if (timeStr) {
      const parts = timeStr.trim().split(' ');
      const timeParts = parts[0].split(':');
      hours = parseInt(timeParts[0], 10);
      minutes = parseInt(timeParts[1] || '0', 10);
      const meridian = parts[1] ? parts[1].toUpperCase() : 'AM';
      if (meridian === 'PM' && hours < 12) hours += 12;
      if (meridian === 'AM' && hours === 12) hours = 0;
    }

    const start = new Date(dateStr);
    start.setHours(hours, minutes, 0, 0);

    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    const formatUtc = (d) => d.toISOString().replace(/-|:|\.\d+/g, '');

    return {
      startUtc: formatUtc(start),
      endUtc: formatUtc(end),
      startDate: start,
      endDate: end
    };
  } catch (e) {
    console.error('Error parsing calendar dates:', e);
    const now = new Date();
    const later = new Date(now.getTime() + 45 * 60 * 1000);
    const formatUtc = (d) => d.toISOString().replace(/-|:|\.\d+/g, '');
    return {
      startUtc: formatUtc(now),
      endUtc: formatUtc(later),
      startDate: now,
      endDate: later
    };
  }
}

/**
 * Generate 1-Click Google Calendar URL
 */
export function getGoogleCalendarUrl(appointment) {
  const serviceName = appointment.service_id?.name || 'Campus Appointment';
  const expertName = appointment.stylist_id?.name || 'D.world Expert';
  const duration = appointment.service_id?.duration || 45;
  const location = appointment.service_id?.location || 'Campus Area Studio';

  const { startUtc, endUtc } = parseAppointmentDates(appointment.date, appointment.time, duration);

  const title = encodeURIComponent(`D.WORLD: ${serviceName} with ${expertName}`);
  const details = encodeURIComponent(
    `Your scheduled appointment for ${serviceName} on D.world.\n` +
    `Specialist: ${expertName}\n` +
    `Campus Location: ${location}\n` +
    `Appointment Notes: ${appointment.notes || 'None'}\n\n` +
    `D.world Campus Scheduling Platform`
  );
  const loc = encodeURIComponent(location);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startUtc}/${endUtc}&details=${details}&location=${loc}`;
}

/**
 * Download .ics iCalendar file for Apple Calendar / Outlook / Mobile
 */
export function downloadIcsFile(appointment) {
  const serviceName = appointment.service_id?.name || 'Campus Appointment';
  const expertName = appointment.stylist_id?.name || 'D.world Expert';
  const duration = appointment.service_id?.duration || 45;
  const location = appointment.service_id?.location || 'Campus Area Studio';

  const { startUtc, endUtc } = parseAppointmentDates(appointment.date, appointment.time, duration);

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//D.world//Campus Scheduling//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${appointment._id || Date.now()}@dworld.com`,
    `DTSTAMP:${startUtc}`,
    `DTSTART:${startUtc}`,
    `DTEND:${endUtc}`,
    `SUMMARY:D.WORLD: ${serviceName} with ${expertName}`,
    `DESCRIPTION:Appointment for ${serviceName} with ${expertName} at ${location}.`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    // 30-minute advance notification alarm
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Reminder: Your ${serviceName} appointment is in 30 minutes!`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `dworld-${serviceName.toLowerCase().replace(/\s+/g, '-')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
