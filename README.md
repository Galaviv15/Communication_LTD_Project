# Comunication_LTD Secure Web System

Web-based information system for Comunication_LTD with two operation modes:
- `vulnerable`: intentionally demonstrates SQL Injection and Stored XSS.
- `secure`: applies prepared statements and output encoding defenses.

Important: the vulnerable mode and runtime mode switch exist only for learning purposes and project presentation simplicity.

## Features

- Registration with password policy validation from `config.json`
- HMAC-SHA256 password storage with per-user unique salt
- Login lockout: 3 failed attempts -> 30-minute lock
- Session-based authentication using `express-session`
- Password change with last-3 password reuse prevention
- Password recovery with SHA-1 token hash and SMTP email delivery
- Customer management page for SQLi/XSS testing in both modes

## Installation Guide

### 1. Prerequisites

- Node.js 18+
- MySQL 8+

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Create `.env` based on `.env.example`.

Required values:
- `APP_MODE=secure` or `APP_MODE=vulnerable`
- `SESSION_SECRET`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `HMAC_SECRET`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

Recommended database name: `communication_ltd`

### 4. Database setup (MySQL)

Run the schema file:

```bash
mysql -u root -p < db/schema.sql
```

### 5. Security policy setup

Adjust password and lockout policies in `config.json`.

## Usage Instructions

### Start application

Development mode:

```bash
npm run dev
```

Production-like run:

```bash
npm start
```

### Toggle Vulnerable vs Secure

Initial mode is set in `.env`:

- `APP_MODE=vulnerable` for demonstration mode
- `APP_MODE=secure` for protected mode

If `APP_MODE` is missing or invalid, the app intentionally fails startup.

After login, mode can be changed directly from the Dashboard UI using the mode selector.
This runtime toggle is intentionally included only for learning and presentation flow.

### Web UI

Default URL: `http://localhost:3000`

Screens:
- `/login`
- `/register`
- `/forgot-password`
- `/verify-token`
- `/reset-password`
- `/change-password`
- `/dashboard`

## SMTP Configuration Guide

- Use a valid SMTP provider and credentials.
- For providers requiring app passwords (e.g. Gmail), generate an app password and place it in `SMTP_PASS`.
- Ensure firewall/network allows outbound SMTP traffic.

Recovery flow behavior:
- A reset token is generated in plaintext.
- Only SHA-1 hash of that token is stored in DB.
- Plain token is sent to user email via SMTP.

## Security Testing

Use only in local/test environments.

### SQL Injection payload examples

Login username in vulnerable mode:

```text
' OR '1'='1
```

Customer name in vulnerable mode:

```text
test'); DROP TABLE customers; --
```

Expected result:
- In `vulnerable` mode: query concatenation is exploitable in required flows.
- In `secure` mode: prepared statements prevent injection behavior.

### Stored XSS payload example

Customer name in vulnerable mode:

```html
<script>alert('XSS')</script>
```

Expected result:
- In `vulnerable` mode: payload executes (raw EJS rendering).
- In `secure` mode: payload is displayed as text (escaped EJS output).

## Project Structure

```text
.
├── db/
│   └── schema.sql
├── public/
│   └── css/
├── src/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   └── utils/
├── views/
├── config.json
├── server.js
└── README.md
```

## Changelog

### 2026-04-27
- Initial project scaffold created
- Implemented authentication, session, password change, and reset flows
- Implemented mode toggle (`vulnerable` / `secure`) for SQLi and XSS demonstrations
- Added MySQL schema and full EJS UI screens
- Added runtime web UI mode switcher on Dashboard for demo/learning simplicity
