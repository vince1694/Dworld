const db = require('./src/config/db');

async function checkData() {
    try {
        const [users] = await db.execute('SELECT * FROM users');
        const [services] = await db.execute('SELECT * FROM services');
        const [appointments] = await db.execute('SELECT * FROM appointments');

        console.log('Users:', users.length);
        console.log('Services:', services.length);
        console.log('Appointments:', appointments.length);

        if (appointments.length > 0) {
            console.log('Sample Appointment:', JSON.stringify(appointments[0], null, 2));
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkData();
