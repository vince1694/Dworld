/**
 * Appointment Reminder Scheduler for D.WORLD
 * 
 * Periodically checks for upcoming appointments (within next 2 hours)
 * that have not had a reminder email sent, sends an email alert, and flags reminderSent: true.
 */

const Appointment = require('../models/Appointment');
const { sendAppointmentReminderEmail } = require('./sendEmail');

const checkAndSendReminders = async () => {
    try {
        const todayStr = new Date().toISOString().split('T')[0];
        
        // Find appointments for today that are approved or pending, and not yet reminded
        const upcomingAppointments = await Appointment.find({
            date: todayStr,
            status: { $in: ['approved', 'pending'] },
            reminderSent: { $ne: true }
        })
        .populate('user_id', 'name email phone')
        .populate('service_id', 'name location')
        .populate('stylist_id', 'name email phone location');

        if (!upcomingAppointments || upcomingAppointments.length === 0) {
            return;
        }

        const now = new Date();
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();
        const currentTotalMinutes = currentHours * 60 + currentMinutes;

        for (const apt of upcomingAppointments) {
            if (!apt.user_id?.email || !apt.time) continue;

            // Parse appointment time (format e.g. "14:00" or "02:00 PM" or "10:30")
            const timeParts = apt.time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
            if (!timeParts) continue;

            let aptHour = parseInt(timeParts[1], 10);
            const aptMin = parseInt(timeParts[2], 10);
            const period = timeParts[3]?.toUpperCase();

            if (period === 'PM' && aptHour < 12) aptHour += 12;
            if (period === 'AM' && aptHour === 12) aptHour = 0;

            const aptTotalMinutes = aptHour * 60 + aptMin;
            const diffMinutes = aptTotalMinutes - currentTotalMinutes;

            // Send reminder if appointment is between 15 minutes and 120 minutes (2 hours) away
            if (diffMinutes >= 15 && diffMinutes <= 120) {
                console.log(`[REMINDER] Sending 1-2h reminder for appointment ${apt._id} to ${apt.user_id.email}...`);
                
                try {
                    await sendAppointmentReminderEmail({
                        email: apt.user_id.email,
                        clientName: apt.user_id.name,
                        expertName: apt.stylist_id?.name || 'Assigned Specialist',
                        serviceName: apt.service_id?.name || 'Campus Styling Session',
                        date: apt.date,
                        time: apt.time,
                        location: apt.stylist_id?.location || apt.service_id?.location || 'Lead City University Campus'
                    });

                    apt.reminderSent = true;
                    await apt.save();
                    console.log(`[REMINDER] Sent and updated reminderSent for ${apt._id}`);
                } catch (emailErr) {
                    console.error(`[REMINDER ERROR] Failed to send reminder email for ${apt._id}:`, emailErr.message);
                }
            }
        }
    } catch (err) {
        console.error('[REMINDER SCHEDULER ERROR]:', err.message);
    }
};

const startReminderScheduler = () => {
    // Initial check 30 seconds after server boot
    setTimeout(() => {
        checkAndSendReminders();
    }, 30000);

    // Then check every 15 minutes
    const intervalMs = 15 * 60 * 1000;
    setInterval(() => {
        checkAndSendReminders();
    }, intervalMs);

    console.log('⏰ D.WORLD Appointment Reminder Scheduler initialized (15m interval).');
};

module.exports = {
    startReminderScheduler,
    checkAndSendReminders
};
