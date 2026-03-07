import axios from "axios";

const BASE = "http://localhost:5000/company/users";

function authHeaders() {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
}

export async function fetchCompanyUsers() {
  const res = await axios.get(BASE, { headers: authHeaders() });
  return res.data;
}

export async function addCompanyUser(payload: { email: string; role: string; name?: string }) {
  const res = await axios.post(BASE, payload, { headers: authHeaders() });
  return res.data;
}

export async function updateCompanyUserRole(userId: string, role: string) {
  const res = await axios.put(`${BASE}/${userId}/role`, { role }, { headers: authHeaders() });
  return res.data;
}

export async function removeCompanyUser(userId: string) {
  const res = await axios.delete(`${BASE}/${userId}`, { headers: authHeaders() });
  return res.data;
}
