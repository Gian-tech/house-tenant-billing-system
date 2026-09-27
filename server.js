const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });

const getOne = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });

app.get('/api/summary', async (req, res) => {
  try {
    const [totals, occupancy, outstandingRent, outstandingBills] = await Promise.all([
      getOne('SELECT COUNT(*) AS totalTenants FROM tenants'),
      getOne('SELECT COUNT(*) AS occupiedUnits FROM units WHERE status = ?', ['Occupied']),
      getOne('SELECT COALESCE(SUM(amount), 0) AS outstandingRent FROM rent_payments WHERE status = ?', ['Unpaid']),
      getOne('SELECT COALESCE(SUM(amount), 0) AS outstandingUtilityBills FROM utility_bills WHERE status = ?', ['Unpaid'])
    ]);

    res.json({
      totalTenants: totals.totalTenants,
      occupiedUnits: occupancy.occupiedUnits,
      outstandingRent: outstandingRent.outstandingRent,
      outstandingUtilityBills: outstandingBills.outstandingUtilityBills
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get dashboard summary', error: error.message });
  }
});

app.get('/api/units', async (req, res) => {
  try {
    const units = await query('SELECT * FROM units ORDER BY id ASC');
    res.json(units);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load units', error: error.message });
  }
});

app.post('/api/units', async (req, res) => {
  const { unit_number, unit_type, monthly_rent, status = 'Occupied' } = req.body;

  if (!unit_number || !unit_type || !monthly_rent) {
    return res.status(400).json({ message: 'Unit number, type, and monthly rent are required.' });
  }

  try {
    const result = await run(
      'INSERT INTO units (unit_number, unit_type, monthly_rent, status) VALUES (?, ?, ?, ?)',
      [unit_number, unit_type, Number(monthly_rent), status]
    );
    res.status(201).json({ message: 'Unit added successfully', id: result.id });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add unit', error: error.message });
  }
});

app.get('/api/tenants', async (req, res) => {
  try {
    const tenants = await query(`
      SELECT t.*, u.unit_number, u.monthly_rent
      FROM tenants t
      LEFT JOIN units u ON u.id = t.unit_id
      ORDER BY t.id ASC
    `);
    res.json(tenants);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load tenants', error: error.message });
  }
});

app.post('/api/tenants', async (req, res) => {
  const { name, email, phone, unit_id, move_in_date, status = 'Active' } = req.body;

  if (!name || !email || !unit_id) {
    return res.status(400).json({ message: 'Name, email, and unit are required.' });
  }

  try {
    const result = await run(
      'INSERT INTO tenants (name, email, phone, unit_id, move_in_date, status) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, phone || '', Number(unit_id), move_in_date || new Date().toISOString().split('T')[0], status]
    );

    await run('UPDATE units SET status = ? WHERE id = ?', ['Occupied', Number(unit_id)]);
    res.status(201).json({ message: 'Tenant added successfully', id: result.id });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add tenant', error: error.message });
  }
});

app.get('/api/rent-payments', async (req, res) => {
  try {
    const payments = await query(`
      SELECT rp.*, t.name AS tenant_name, u.unit_number
      FROM rent_payments rp
      LEFT JOIN tenants t ON t.id = rp.tenant_id
      LEFT JOIN units u ON u.id = t.unit_id
      ORDER BY rp.payment_date DESC
    `);
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load rent payments', error: error.message });
  }
});

app.post('/api/rent-payments', async (req, res) => {
  const { tenant_id, amount, payment_date, method, status = 'Paid' } = req.body;

  if (!tenant_id || !amount || !payment_date) {
    return res.status(400).json({ message: 'Tenant, amount, and payment date are required.' });
  }

  try {
    const result = await run(
      'INSERT INTO rent_payments (tenant_id, amount, payment_date, method, status) VALUES (?, ?, ?, ?, ?)',
      [Number(tenant_id), Number(amount), payment_date, method || 'Bank Transfer', status]
    );
    res.status(201).json({ message: 'Payment recorded', id: result.id });
  } catch (error) {
    res.status(500).json({ message: 'Failed to record payment', error: error.message });
  }
});

app.get('/api/utility-bills', async (req, res) => {
  try {
    const bills = await query(`
      SELECT ub.*, t.name AS tenant_name, u.unit_number
      FROM utility_bills ub
      LEFT JOIN tenants t ON t.id = ub.tenant_id
      LEFT JOIN units u ON u.id = ub.unit_id
      ORDER BY ub.due_date DESC
    `);
    res.json(bills);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load utility bills', error: error.message });
  }
});

app.post('/api/utility-bills', async (req, res) => {
  const { tenant_id, unit_id, bill_type, amount, due_date, bill_month, status = 'Unpaid' } = req.body;

  if (!bill_type || !amount || !due_date || !bill_month) {
    return res.status(400).json({ message: 'Bill type, amount, due date, and billing month are required.' });
  }

  try {
    const result = await run(
      'INSERT INTO utility_bills (tenant_id, unit_id, bill_type, amount, due_date, bill_month, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [tenant_id ? Number(tenant_id) : null, unit_id ? Number(unit_id) : null, bill_type, Number(amount), due_date, bill_month, status]
    );
    res.status(201).json({ message: 'Utility bill added', id: result.id });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add utility bill', error: error.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`House Tenant & Billing System running on http://localhost:${PORT}`);
});
