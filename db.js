const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'house_tenant_billing.db');
const db = new sqlite3.Database(dbPath);

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });

const setupDatabase = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unit_number TEXT UNIQUE NOT NULL,
      unit_type TEXT NOT NULL,
      monthly_rent REAL NOT NULL,
      status TEXT DEFAULT 'Occupied'
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS tenants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      unit_id INTEGER,
      move_in_date TEXT,
      status TEXT DEFAULT 'Active',
      FOREIGN KEY (unit_id) REFERENCES units(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS rent_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      method TEXT,
      status TEXT DEFAULT 'Paid',
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS utility_bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER,
      unit_id INTEGER,
      bill_type TEXT NOT NULL,
      amount REAL NOT NULL,
      due_date TEXT NOT NULL,
      bill_month TEXT NOT NULL,
      status TEXT DEFAULT 'Unpaid',
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (unit_id) REFERENCES units(id)
    )
  `);

  await run(`
    INSERT OR IGNORE INTO units (id, unit_number, unit_type, monthly_rent, status)
    VALUES
      (1, 'A-101', 'Studio', 1200, 'Occupied'),
      (2, 'A-202', '1BR', 1700, 'Occupied'),
      (3, 'B-305', '2BR', 2200, 'Vacant')
  `);

  await run(`
    INSERT OR IGNORE INTO tenants (id, name, email, phone, unit_id, move_in_date, status)
    VALUES
      (1, 'Maria Johnson', 'maria@example.com', '+1-555-1001', 1, '2024-01-15', 'Active'),
      (2, 'David Smith', 'david@example.com', '+1-555-1002', 2, '2024-03-01', 'Active'),
      (3, 'Noah Brown', 'noah@example.com', '+1-555-1003', 3, '2025-01-11', 'Pending')
  `);

  await run(`
    INSERT OR IGNORE INTO rent_payments (id, tenant_id, amount, payment_date, method, status)
    VALUES
      (1, 1, 1200, '2025-09-01', 'Bank Transfer', 'Paid'),
      (2, 2, 1700, '2025-09-01', 'Bank Transfer', 'Unpaid'),
      (3, 1, 1200, '2025-08-01', 'Cash', 'Paid')
  `);

  await run(`
    INSERT OR IGNORE INTO utility_bills (id, tenant_id, unit_id, bill_type, amount, due_date, bill_month, status)
    VALUES
      (1, 1, 1, 'Electricity', 135.50, '2025-09-10', 'September 2025', 'Paid'),
      (2, 2, 2, 'Water', 95.00, '2025-09-12', 'September 2025', 'Unpaid'),
      (3, 2, 2, 'Internet', 60.00, '2025-09-15', 'September 2025', 'Unpaid')
  `);
};

setupDatabase()
  .then(() => console.log('Database initialized successfully.'))
  .catch((error) => {
    console.error('Failed to initialize database:', error.message);
    process.exit(1);
  });

module.exports = { db };
