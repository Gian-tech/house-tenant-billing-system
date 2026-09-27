const apiBase = '/api';

const summaryEls = {
  totalTenants: document.getElementById('totalTenants'),
  occupiedUnits: document.getElementById('occupiedUnits'),
  outstandingRent: document.getElementById('outstandingRent'),
  outstandingUtilityBills: document.getElementById('outstandingUtilityBills')
};

const tenantTableBody = document.getElementById('tenantTableBody');
const paymentTableBody = document.getElementById('paymentTableBody');
const utilityTableBody = document.getElementById('utilityTableBody');

const tenantUnitSelect = document.getElementById('tenantUnitSelect');
const rentTenantSelect = document.getElementById('rentTenantSelect');
const utilityTenantSelect = document.getElementById('utilityTenantSelect');
const utilityUnitSelect = document.getElementById('utilityUnitSelect');

let state = {
  tenants: [],
  units: [],
  rentPayments: [],
  utilityBills: []
};

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(Number(value || 0));
}

function statusClass(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('paid') || normalized.includes('active') || normalized.includes('occupied')) return 'status-paid';
  if (normalized.includes('unpaid') || normalized.includes('pending') || normalized.includes('vacant')) return 'status-unpaid';
  return 'status-active';
}

function renderSummary(summary) {
  summaryEls.totalTenants.textContent = summary.totalTenants || 0;
  summaryEls.occupiedUnits.textContent = summary.occupiedUnits || 0;
  summaryEls.outstandingRent.textContent = formatCurrency(summary.outstandingRent || 0);
  summaryEls.outstandingUtilityBills.textContent = formatCurrency(summary.outstandingUtilityBills || 0);
}

function renderSelectOptions(selectElement, items, labelKey, valueKey, placeholder = 'Select one') {
  if (!selectElement) return;
  selectElement.innerHTML = `<option value="">${placeholder}</option>`;

  items.forEach((item) => {
    const option = document.createElement('option');
    option.value = item[valueKey];
    option.textContent = item[labelKey];
    selectElement.appendChild(option);
  });
}

function renderTenants() {
  tenantTableBody.innerHTML = state.tenants.map((tenant) => `
    <tr>
      <td>${tenant.name}</td>
      <td>${tenant.email}</td>
      <td>${tenant.unit_number || 'N/A'}</td>
      <td>${formatCurrency(tenant.monthly_rent || 0)}</td>
      <td><span class="status-badge ${statusClass(tenant.status)}">${tenant.status}</span></td>
    </tr>
  `).join('');
}

function renderRentPayments() {
  paymentTableBody.innerHTML = state.rentPayments.map((payment) => `
    <tr>
      <td>${payment.tenant_name || 'Unknown tenant'}</td>
      <td>${formatCurrency(payment.amount)}</td>
      <td>${payment.method || 'N/A'}</td>
      <td>${payment.payment_date}</td>
      <td><span class="status-badge ${statusClass(payment.status)}">${payment.status}</span></td>
    </tr>
  `).join('');
}

function renderUtilityBills() {
  utilityTableBody.innerHTML = state.utilityBills.map((bill) => `
    <tr>
      <td>${bill.bill_type}</td>
      <td>${bill.unit_number || 'N/A'}</td>
      <td>${formatCurrency(bill.amount)}</td>
      <td>${bill.due_date}</td>
      <td><span class="status-badge ${statusClass(bill.status)}">${bill.status}</span></td>
    </tr>
  `).join('');
}

function populateFormOptions() {
  renderSelectOptions(tenantUnitSelect, state.units, 'unit_number', 'id', 'Choose a unit');
  renderSelectOptions(rentTenantSelect, state.tenants, 'name', 'id', 'Choose a tenant');
  renderSelectOptions(utilityTenantSelect, state.tenants, 'name', 'id', 'Choose a tenant');
  renderSelectOptions(utilityUnitSelect, state.units, 'unit_number', 'id', 'Choose a unit');
}

async function loadSummary() {
  const res = await fetch(`${apiBase}/summary`);
  const summary = await res.json();
  renderSummary(summary);
}

async function loadUnits() {
  const res = await fetch(`${apiBase}/units`);
  state.units = await res.json();
}

async function loadTenants() {
  const res = await fetch(`${apiBase}/tenants`);
  state.tenants = await res.json();
}

async function loadRentPayments() {
  const res = await fetch(`${apiBase}/rent-payments`);
  state.rentPayments = await res.json();
}

async function loadUtilityBills() {
  const res = await fetch(`${apiBase}/utility-bills`);
  state.utilityBills = await res.json();
}

async function refreshData() {
  await Promise.all([
    loadUnits(),
    loadTenants(),
    loadRentPayments(),
    loadUtilityBills(),
    loadSummary()
  ]);

  populateFormOptions();
  renderTenants();
  renderRentPayments();
  renderUtilityBills();
}

async function submitForm(url, formData, successMessage) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });

  const result = await res.json();
  if (!res.ok) {
    throw new Error(result.message || 'Something went wrong.');
  }

  alert(successMessage);
  await refreshData();
}

document.getElementById('unitForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  const payload = Object.fromEntries(formData.entries());

  try {
    await submitForm(`${apiBase}/units`, payload, 'Unit added successfully.');
    event.target.reset();
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById('tenantForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  const payload = Object.fromEntries(formData.entries());

  try {
    await submitForm(`${apiBase}/tenants`, payload, 'Tenant added successfully.');
    event.target.reset();
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById('rentForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  const payload = Object.fromEntries(formData.entries());

  try {
    await submitForm(`${apiBase}/rent-payments`, payload, 'Rent payment recorded successfully.');
    event.target.reset();
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById('utilityForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  const payload = Object.fromEntries(formData.entries());

  try {
    await submitForm(`${apiBase}/utility-bills`, payload, 'Utility bill added successfully.');
    event.target.reset();
  } catch (error) {
    alert(error.message);
  }
});

refreshData().catch((error) => {
  console.error('Failed to load dashboard data:', error);
  alert('Could not load the dashboard data.');
});
