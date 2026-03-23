import axios from "axios";

const BASE = "http://localhost:5000/audit";

function authHeaders() {
  const token = localStorage.getItem("token") || localStorage.getItem("platformAdminToken");
  return { Authorization: `Bearer ${token}` };
}

export type AuditFinding = {
  title?: string;
  severity?: string;
  evidence?: string;
  impact?: string;
};

export type AuditRecommendation = {
  action?: string;
  priority?: string;
  rationale?: string;
};

export type AuditRecord = {
  _id: string;
  status: "PENDING" | "GENERATED" | "FAILED";
  reportPeriod?: string;
  sourceDocumentName?: string;
  summary?: string;
  findings?: AuditFinding[];
  recommendations?: AuditRecommendation[];
  riskLevel?: string;
  limitations?: string[];
  errorMessage?: string;
  createdAt: string;
  generatedAt?: string;
  meta?: {
    provider?: string;
    model?: string;
  };
};

export async function generateAuditReport(params: {
  report: File;
  provider?: "openai" | "lmstudio";
  reportPeriod?: string;
}) {
  const formData = new FormData();
  formData.append("report", params.report);
  if (params.provider) formData.append("provider", params.provider);
  if (params.reportPeriod) formData.append("reportPeriod", params.reportPeriod);

  const res = await axios.post<{ message: string; audit: AuditRecord }>(`${BASE}/generate`, formData, {
    headers: {
      ...authHeaders(),
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
}

export async function fetchMyAudits() {
  const res = await axios.get<AuditRecord[]>(`${BASE}/mine`, {
    headers: authHeaders(),
  });
  return res.data;
}

export async function fetchAuditById(id: string) {
  const res = await axios.get<AuditRecord>(`${BASE}/${id}`, {
    headers: authHeaders(),
  });
  return res.data;
}
