## 1. Project OverviewDevelopment of a secure web-based information system for an ISP named Comunication_LTD. 
The project focuses on implementing Secure Coding practices, cryptographic standards, and demonstrating mitigation of common web vulnerabilities such as SQL Injection (SQLi) and Cross-Site Scripting (XSS).

## 2. Technical Stack
Runtime: Node.js (Express.js).
Database: MySQL.
Cryptography: crypto module for HMAC (passwords) and SHA-1 (recovery tokens).
Database Driver: mysql2 (to support Prepared Statements for mitigation).
Frontend: HTML5, CSS3, JavaScript (Vanilla)
Templating Engine: EJS (Embedded JavaScript templates)

## 3. Configuration Management (Dynamic Policy)
The system MUST read its security policies from an external config.json file to allow changing security constraints without modifying the source code.

## 4. Functional Requirements (Part A - Secure Development)
    4.1 Authentication & User Management
    - Registration: Create internal system users with strict validation against the password_policy defined in config.json.
    - Password Storage: Passwords MUST be stored using HMAC + Salt.
    - Password Change: Verify existing password, validate new password complexity, and ensure the new password is not in the history of the last 3 passwords.
    - Login System: Implement user verification with an account lockout mechanism (3 failed attempts lock the account for 30 minutes).
    - Password Recovery:
        - Generate a random value/token.
        - Hash the token using SHA-1.
        - Verify the token before allowing access to the reset screen.
    4.2 Main System Actions
    - Customer Management: Interface to add new customers (name and sector).
    - Data Reflection: Display the name of the newly added customer immediately to facilitate XSS testing.
    4.3 UI Components & Screens
    The system must include the following web interfaces:
    - Login Screen: User & Password inputs. Display appropriate error messages for incorrect credentials or locked accounts.
    - Registration Screen: Form for new system users. Must provide feedback on password complexity requirements.
    - Password Change Screen: Fields for current password, new password, and confirmation.
    - Forgot Password Screen: Input for email to trigger a recovery token.
    - Token Entry Screen: To verify the SHA-1 token received by the user.
    - Dashboard / Customer Management: A form to add customers and a table/list displaying the added customers (used for XSS demonstration).

## 5. Security Vulnerabilities & Mitigation (Part B)
The project requires two versions of the code to be submitted.
    5.1 Vulnerable Version (V1)
    - SQL Injection (SQLi): Implement Registration, Login, and Customer Management using string concatenation for queries.
    - Stored XSS: Render customer names directly into the HTML without sanitization, allowing script execution.
    5.2 Secure Version (V2)
    - SQLi Defense: Implement Prepared Statements (Parameters) for all database interactions.
    - XSS Defense: Implement Output Encoding for special characters (e.g., <, >, &).


## 6. Project Documentation (README.md)
A comprehensive README.md must be maintained and updated as features are added.
README Structure:
- Introduction: 
Overview of the Comunication_LTD system.
- Installation Guide:
    - Database setup (MySQL) using the provided schema.
    - Dependency installation (npm install).
    - Environment/Config setup.
- Usage Instructions:
    - How to toggle or run the Vulnerable (V1) vs. Secure (V2) versions.
    - Accessing the Web UI.
- Security Testing: 
Examples of payloads for SQLi and XSS to demonstrate the vulnerabilities and their fixes.
- Changelog: 
A dedicated section updated with every major feature or fix.

## 7. Database Schema (MySQL)
The database MUST implement the following tables to support the requirements:
- Table: users
id (INT, PK, AUTO_INCREMENT)
username (VARCHAR, UNIQUE)
email (VARCHAR) 
password_hash (VARCHAR) - Stores HMAC result.
salt (VARCHAR) - Unique per-user salt.
failed_attempts (INT, DEFAULT 0)
lockout_until (DATETIME, NULL)
- Table: password_history
id (INT, PK, AUTO_INCREMENT)
user_id (INT, FK to users.id)
password_hash (VARCHAR)
created_at (TIMESTAMP)
- Table: customers
id (INT, PK, AUTO_INCREMENT)
customer_name (VARCHAR) - Field for XSS/SQLi testing.
sector (VARCHAR) 
created_at (TIMESTAMP)

 ## 8. Project Structure (MVC Architecture)
The project will follow a standard MVC structure to ensure maintainability and separation of logic from presentation.

/comunication_ltd_project
│
├── /src
│   ├── /routes          # Express routes for Auth, Password, and Customer actions.
│   ├── /controllers     # Logic handling for security protocols (HMAC, SHA-1, SQL queries).
│   ├── /models          # Database connection and Schema definitions.
│   └── /utils           # Helpers: Config loader, Password Validator, Crypto tools.
│
├── /views               # Frontend templates (EJS/HTML).
│   ├── login.ejs, register.ejs, dashboard.ejs, etc.
│
├── /public              # Static assets (CSS, Client-side JS).
│
├── config.json          # Dynamic security policy (min_length, history, lockout).
├── .env                 # Environment variables (DB_PASSWORD, HMAC_SECRET).
├── server.js            # Main entry point.
└── spec.md              # Project instructions.