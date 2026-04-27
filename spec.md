Project Specification: Secure Web System (Node.js + MySQL)
1. Project Overview
A secure information system for Comunication_LTD, focused on demonstrating defense-in-depth, cryptographic storage, and mitigation of OWASP Top 10 vulnerabilities (SQLi, XSS).

2. Technical Stack
Runtime: Node.js (Express.js framework)

Database: MySQL (Relational)

Security Libraries: * crypto module (for HMAC and SHA-1)

mysql2 (for prepared statements)

dotenv (for configuration management)

3. Functional Requirements & Security Logic
3.1 Authentication (Part A)
Registration: Endpoint to create system users.

Password Hashing: Implement HMAC using a server-side secret key and a unique per-user salt.

Password Policy (Config Driven): * Logic to validate: Length (10+), Complexity (3/4 types), and Dictionary check (e.g., blocking "admin", "123456").

History check against the last 3 hashes stored in a password_history table.

Login & Lockout: * Track failed attempts in the DB.

If attempts >= 3, set lockout_until timestamp to 30 minutes in the future.

Password Recovery:

Generate a random token.

Store and verify the token using SHA-1 hashing.

3.2 Customer Management
Create Customer: Input name and sector.

Reflective Display: Immediately show the name of the added customer to test for XSS.

4. Security Implementation (The "Dual Version" Requirement)
4.1 Vulnerable Version (/vulnerable or separate branch)
SQLi: Use template literals for queries: SELECT * FROM users WHERE user = '${req.body.user}'.

XSS: Render user input directly into HTML without sanitization or encoding.

4.2 Secure Version (/secure or separate branch)
SQLi Mitigation: Use Prepared Statements (e.g., db.execute('SELECT * FROM users WHERE user = ?', [username])).

XSS Mitigation: Use a template engine that auto-escapes (like EJS) or implement a manual encoding function for special characters (<, >, ", ').

5. Database Schema (MySQL)
users: (id, username, password_hash, salt, email, login_attempts, lockout_until)

password_history: (id, user_id, old_hash, created_at)

customers: (id, customer_name, sector, created_at)