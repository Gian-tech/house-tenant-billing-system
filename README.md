# House Tenant & Billing System

A complete front-end + back-end + database application for managing:
- tenants
- units
- rent payments
- utility bills

## Features
- Dashboard summary cards
- Add and list units
- Add and list tenants
- Record rent payments
- Track utility bills
- SQLite database for persistence
- Express backend API
- Responsive HTML/CSS/JS front-end

## Folder structure

```text
house-tenant-billing-system/
├── public/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── data/
│   └── house_tenant_billing.db
├── .gitignore
├── db.js
├── package.json
├── README.md
├── server.js
└──
```

## Tech stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js + Express
- Database: SQLite

## Installation

1. Clone the project.
2. Open the terminal in the project folder.
3. Install dependencies:

```bash
npm install
```

## Run the app

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

## API endpoints

- GET `/api/summary`
- GET `/api/units`
- POST `/api/units`
- GET `/api/tenants`
- POST `/api/tenants`
- GET `/api/rent-payments`
- POST `/api/rent-payments`
- GET `/api/utility-bills`
- POST `/api/utility-bills`

## Notes
- The SQLite database is created automatically on first run.
- Sample tenant, unit, rent payment, and utility bill records are seeded automatically.
