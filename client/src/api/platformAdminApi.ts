import axios from "axios";

const BASE = "http://localhost:5000/platform-admin";

function getHeaders() {
  const token = localStorage.getItem("platformAdminToken");
  return { Authorization: `Bearer ${token}` };
}

// ── AUTH ──────────────────────────────────────────
export async function platformAdminLogin(email: string, password: string) {
  const res = await axios.post(`${BASE}/auth/login`, { email, password });
  return res.data; // { token, user }
}

// ── DASHBOARD ─────────────────────────────────────
export async function fetchDashboardStats() {
  const res = await axios.get(`${BASE}/dashboard`, { headers: getHeaders() });
  return res.data;
}

// ── COMPANIES ─────────────────────────────────────
export async function fetchCompanies(params: Record<string, string | number> = {}) {
  const res = await axios.get(`${BASE}/companies`, {
    headers: getHeaders(),
    params
  });
  return res.data; // { companies, total, page, totalPages }
}

export async function fetchCompanyDetails(id: string) {
  const res = await axios.get(`${BASE}/companies/${id}`, { headers: getHeaders() });
  return res.data; // { company, adminUsers, allUsers, recentTransactions }
}

export async function approveCompany(id: string) {
  const res = await axios.put(`${BASE}/companies/${id}/approve`, {}, { headers: getHeaders() });
  return res.data;
}

export async function rejectCompany(id: string, reason?: string) {
  const res = await axios.put(
    `${BASE}/companies/${id}/reject`,
    { reason },
    { headers: getHeaders() }
  );
  return res.data;
}

export async function blockCompany(id: string, reason?: string) {
  const res = await axios.put(
    `${BASE}/companies/${id}/block`,
    { reason },
    { headers: getHeaders() }
  );
  return res.data;
}

export async function unblockCompany(id: string) {
  const res = await axios.put(`${BASE}/companies/${id}/unblock`, {}, { headers: getHeaders() });
  return res.data;
}

export async function adjustCredits(
  id: string,
  credits: number,
  operation: "SET" | "ADD" | "SUBTRACT"
) {
  const res = await axios.put(
    `${BASE}/companies/${id}/credits`,
    { credits, operation },
    { headers: getHeaders() }
  );
  return res.data;
}

export async function deleteCompany(id: string) {
  const res = await axios.delete(`${BASE}/companies/${id}`, { headers: getHeaders() });
  return res.data;
}

// ── USERS ─────────────────────────────────────────
export async function fetchUsers(params: Record<string, string | number> = {}) {
  const res = await axios.get(`${BASE}/users`, {
    headers: getHeaders(),
    params
  });
  return res.data; // { users, total, page, totalPages }
}

export async function deleteUser(id: string) {
  const res = await axios.delete(`${BASE}/users/${id}`, { headers: getHeaders() });
  return res.data;
}

// ── TRANSACTIONS ──────────────────────────────────
export async function fetchTransactions(params: Record<string, string | number> = {}) {
  const res = await axios.get(`${BASE}/transactions`, {
    headers: getHeaders(),
    params
  });
  return res.data; // { transactions, total, page, totalPages }
}