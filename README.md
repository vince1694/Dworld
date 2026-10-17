# Appointment Booking System Backend

A secure RESTful API built with Node.js, Express, and MySQL.

## Features
- **Authentication**: JWT-based login and registration with bcrypt password hashing.
- **RBAC**: Role-based access control (Admin vs User).
- **Service Management**: Admin can CRUD services.
- **Booking**: Users can book appointments from available slots.
- **Appointment Management**: Admin can approve or cancel appointments.
- **Production Ready**: Integrated `helmet` for security headers, `morgan` for request logging, and `.env` management for secrets.
- **Postman Ready**: Includes a pre-configured collection for testing all endpoints.
- **TablePlus Compatible**: See `TABLEPLUS_GUIDE.md` for database management.

## Getting Started

1. **Database Setup**:
   - Ensure you have a MySQL server running locally.
   - Using your preferred database client (e.g., MySQL Workbench, DBeaver, or command line):
   - Create a database called `appointment_system`.
   - Import the `schema.sql` file provided in the root directory.

2. **Configuration**:
   - Check the `.env` file and ensure `DB_USER` and `DB_PASS` match your MySQL settings.

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Run the Server**:
   ```bash
   node src/app.js
   ```

## API Endpoints

### Auth
- `POST /api/auth/register` - { name, email, password, role }
- `POST /api/auth/login` - { email, password }

### Services
- `GET /api/services` - List all services
- `POST /api/services` - Create service (Admin)
- `PUT /api/services/:id` - Update service (Admin)
- `DELETE /api/services/:id` - Delete service (Admin)

### Appointments
- `GET /api/appointments/slots?date=YYYY-MM-DD` - Get available slots
- `POST /api/appointments/book` - Book appointment { service_id, date, time }
- `GET /api/appointments/my-appointments` - User history
- `GET /api/appointments/all` - View all (Admin)
- `PATCH /api/appointments/:id/status` - Update status { status } (Admin)
- `POST /api/appointments/slots` - Create slot { date, time } (Admin)
