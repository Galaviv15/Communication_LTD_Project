
# Project Specification: Secure Web System - Comunication_LTD

## 1. Project Overview
Development of a secure web-based information system for an ISP named **Comunication_LTD**. The project focuses on implementing **Secure Coding** practices, cryptographic standards, and demonstrating mitigation of common web vulnerabilities: **SQL Injection (SQLi)** and **Cross-Site Scripting (XSS)**.

## 2. Technical Stack
* **Runtime:** Node.js (Express.js).
* **Database:** MySQL.
* **Cryptography:** `crypto` module for **HMAC-SHA256** (passwords) and **SHA-1** (recovery tokens).
* **Mailing:** `Nodemailer` for real SMTP email transport (Mandatory requirement).
* **Session Management:** `express-session` for cookie-based authentication.
* **Frontend:** HTML5, CSS3, JavaScript (Vanilla).
* **Templating Engine:** **EJS** (Embedded JavaScript templates).

## 3. Configuration & Environment Management
The system **MUST** read its security policies from an external `config.json` file. Sensitive credentials **MUST** be stored in a `.env` file.

## 4. Functional Requirements (Part A - Secure Development)
### 4.1 Authentication & User Management
* **Registration:** Create system users with strict validation against `config.json`.
* **Password Storage:** Passwords **MUST** be stored using **HMAC + unique Salt**.
* **Password Change:** Verify current password, validate complexity, and prevent reuse of the last 3 passwords stored in history.
* **Login System:** * Implement user verification with an account lockout mechanism (3 failed attempts = 30-minute lock).
    * **Success Logic:** A successful login MUST reset the `failed_attempts` counter.
* **Password Recovery (Mailing):**
    * Generate a random token and hash it using **SHA-1** for database storage.
    * **Real Email Delivery:** Send the clear-text token to the user's email via **SMTP**.
    * Verify the hashed token before allowing access to the password reset screen.

### 4.2 Main System Actions
* **Customer Management:** Interface to add new customers (name and sector).
* **Data Reflection:** Display the newly added customer name immediately to facilitate XSS testing.

### 4.3 UI Components & Screens
The system must include the following web interfaces:
* **Login Screen:** User & Password inputs with error feedback for locked accounts.
* **Registration Screen:** Form for system users with password complexity feedback.
* **Password Change Screen:** Fields for current password, new password, and confirmation.
* **Forgot Password Screen:** Email input to trigger the recovery process.
* **Token Entry Screen:** To verify the SHA-1 token received by the user via email.
* **Dashboard / Customer Management:** Form to add customers and a list displaying them.

## 5. Security Vulnerabilities & Mitigation (Part B)
The application will toggle behavior based on an `APP_MODE` environment variable (`vulnerable` vs `secure`).

### 5.1 Vulnerable Version (V1)
* **SQL Injection (SQLi):** Use string concatenation for queries in Login, Register, and Customer actions.
* **Stored XSS:** Render customer names directly into the HTML using EJS raw tags (`<%-`).

### 5.2 Secure Version (V2)
* **SQLi Defense:** Implement **Prepared Statements** (Parameters) for all database interactions.
* **XSS Defense:** Implement **Output Encoding** for special characters (using EJS default `<%=`).

## 6. Project Structure (MVC Architecture)
* **/src**: Contains /routes (Express), /controllers (Logic), /models (DB), and /utils (Mailer, Config).
* **/views**: EJS templates (UI).
* **/public**: Static assets (CSS, Client-side JS).
* **Root**: server.js, config.json, .env, spec.md.

## 7. Database Schema (MySQL)
The database **MUST** implement the following tables:
* **Table `users`**: id, username, email, password_hash, salt, failed_attempts, lockout_until.
* **Table `password_history`**: id, user_id, password_hash, created_at.
* **Table `password_resets`**: id, user_id, token_hash, expires_at, is_used.
* **Table `customers`**: id, customer_name, sector, created_at.

## 8. Project Documentation (README.md)
A comprehensive `README.md` must include:
* **Introduction:** Overview of Comunication_LTD system.
* **Installation Guide:** MySQL setup, `npm install`, and SMTP/Environment configuration.
* **Usage Instructions:** How to toggle between Vulnerable (V1) and Secure (V2) modes.
* **Security Testing:** Examples of payloads for SQLi and XSS to demonstrate the fixes.
* **Changelog:** Dedicated section for tracking updates.