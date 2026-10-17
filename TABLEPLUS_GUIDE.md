# Connecting TablePlus to Your Real-World Database

TablePlus is a modern graphical tool for managing your MySQL database. Follow these steps to connect your "Appointment Booking" database.

## 1. Local Connection (Development)
To manage your local database (XAMPP or local MySQL):

1.  **Open TablePlus** and click the **"+"** (Create a new connection) button.
2.  Choose **MySQL** from the list.
3.  **Name:** `Appointment Local`
4.  **Host:** `127.0.0.1`
5.  **Port:** `3306`
6.  **User:** `root`
7.  **Password:** *(leave blank if using default XAMPP)*
8.  **Database:** `appointment_system`
9.  Click **Test** then **Connect**.

## 2. Remote Connection (Production/Real World)
When you deploy to a server (like DigitalOcean, AWS, or Heroku):

1.  **Create a new connection** in TablePlus.
2.  **Host:** Enter your server's IP address (e.g., `123.45.67.89`).
3.  **Port:** Default is `3306`.
4.  **User:** Use a specific user created for the app (never use `root` in production!).
5.  **Password:** Use a strong, generated password.
6.  **Over SSH (Recommended):** Real-world servers usually block port 3306 for safety. 
    - Go to the **"SSH"** tab in TablePlus.
    - Enter your server SSH details to securely tunnel into the database.

## 3. Real-World Authentication Flow Best Practices
To keep your auth flow "Real World" ready:

- **JWT Secrets:** Never use the default secret in `.env`. Generate a random 64-character string.
- **Environment Variables:** Always use `.env` files and **never** commit them to Git (handled by your `.gitignore`).
- **Data Validation:** Every request is validated by `express-validator` in the backend before touching the database.
- **Security Headers:** We have implemented `helmet` to protect against common web attacks.
- **Logging:** Every request is logged using `morgan` so you can see if something goes wrong in real-time.

## 4. Useful TablePlus Shortcuts
- `Ctrl + Enter`: Run the selected SQL query.
- `Ctrl + K`: Refresh the database list/data.
- `Double Click`: Edit any cell directly (like a spreadsheet).
- `Ctrl + Shift + S`: Save changes to the database.
