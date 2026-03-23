import { useEffect, useMemo, useState } from "react";
import PageLayout from "../components/layout/PageLayout";
import { fetchAuditById, fetchMyAudits, generateAuditReport, type AuditRecord } from "../api/auditApi";

type ReportsProps = {
  onLogout?: () => void;
};

export default function Reports({ onLogout: _onLogout }: ReportsProps) {
  void _onLogout;

  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [selectedAuditId, setSelectedAuditId] = useState<string>("");
  const [selectedAudit, setSelectedAudit] = useState<AuditRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [reportPeriod, setReportPeriod] = useState("");

  const latestAudit = useMemo(() => {
    if (selectedAudit) return selectedAudit;
    return audits[0] || null;
  }, [audits, selectedAudit]);

  const loadAudits = async () => {
    try {
      setIsLoading(true);
      const data = await fetchMyAudits();
      setAudits(data);
      if (data[0]?._id) {
        setSelectedAuditId(data[0]._id);
        setSelectedAudit(data[0]);
      }
    } catch {
      setError("Failed to load audit reports");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAudits();
  }, []);

  const onGenerate = async () => {
    if (!reportFile || isGenerating) return;

    try {
      setError("");
      setIsGenerating(true);
      const generated = await generateAuditReport({
        report: reportFile,
        provider: "lmstudio",
        reportPeriod: reportPeriod || undefined,
      });

      const freshAudit = generated.audit;
      setAudits((prev) => [freshAudit, ...prev.filter((item) => item._id !== freshAudit._id)]);
      setSelectedAuditId(freshAudit._id);
      setSelectedAudit(freshAudit);
      setReportFile(null);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? String((err as { response?: { data?: { message?: string } } }).response?.data?.message || "")
          : "";
      setError(message || "Audit generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const onPickAudit = async (id: string) => {
    setSelectedAuditId(id);
    const local = audits.find((item) => item._id === id);
    if (local) {
      setSelectedAudit(local);
    }

    try {
      const full = await fetchAuditById(id);
      setSelectedAudit(full);
      setAudits((prev) => prev.map((item) => (item._id === id ? full : item)));
    } catch {
      setError("Failed to load selected audit");
    }
  };

  return (
    <PageLayout title="Reports" description="View compliance and audit reports">
      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1.9fr] gap-5">
        <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <h2 className="font-bold text-lg text-gray-900">Generate Audit Report</h2>
          <p className="text-sm text-gray-600 mt-1">Upload your emission report PDF and generate an AI-assisted audit.</p>

          <div className="mt-4 space-y-3">
            <input
              type="file"
              accept="application/pdf"
              onChange={(event) => setReportFile(event.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-700"
            />

            <input
              value={reportPeriod}
              onChange={(event) => setReportPeriod(event.target.value)}
              placeholder="Report period (e.g., 2026-Q1)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />

            <button
              type="button"
              onClick={() => void onGenerate()}
              disabled={!reportFile || isGenerating}
              className="rounded-lg px-4 py-2 bg-emerald-600 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isGenerating ? "Generating..." : "Generate Audit"}
            </button>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-bold text-gray-900 mb-2">Audit History</h3>
            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {isLoading ? <p className="text-sm text-gray-500">Loading...</p> : null}
              {!isLoading && audits.length === 0 ? (
                <p className="text-sm text-gray-500">No audits generated yet.</p>
              ) : null}
              {audits.map((audit) => (
                <button
                  key={audit._id}
                  type="button"
                  onClick={() => void onPickAudit(audit._id)}
                  className={`w-full text-left border rounded-lg p-3 ${
                    selectedAuditId === audit._id ? "border-emerald-300 bg-emerald-50" : "border-gray-200 bg-white"
                  }`}
                >
                  <p className="text-sm font-semibold text-gray-900">
                    {audit.reportPeriod || "Unspecified Period"} - {audit.status}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">{new Date(audit.createdAt).toLocaleString()}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 min-h-[540px]">
          <h2 className="font-bold text-lg text-gray-900">Audit Details</h2>

          {!latestAudit ? (
            <p className="text-gray-600 mt-4">Generate your first audit report to view findings and recommendations.</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="border border-gray-200 rounded-lg p-3">
                  <p className="text-gray-500">Status</p>
                  <p className="font-semibold text-gray-900">{latestAudit.status}</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-3">
                  <p className="text-gray-500">Risk Level</p>
                  <p className="font-semibold text-gray-900">{latestAudit.riskLevel || "N/A"}</p>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-bold text-gray-900">Summary</h3>
                <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{latestAudit.summary || "No summary available."}</p>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-bold text-gray-900">Key Findings</h3>
                <ul className="mt-2 space-y-2 text-sm text-gray-700">
                  {(latestAudit.findings || []).map((finding, index) => (
                    <li key={`${index}-${finding.title || "finding"}`} className="border border-gray-100 rounded-md p-2">
                      <p className="font-semibold">{finding.title || `Finding ${index + 1}`}</p>
                      <p>Severity: {finding.severity || "N/A"}</p>
                      {finding.evidence ? <p>Evidence: {finding.evidence}</p> : null}
                      {finding.impact ? <p>Impact: {finding.impact}</p> : null}
                    </li>
                  ))}
                  {(latestAudit.findings || []).length === 0 ? <li>No findings generated.</li> : null}
                </ul>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-bold text-gray-900">Recommendations</h3>
                <ul className="mt-2 space-y-2 text-sm text-gray-700">
                  {(latestAudit.recommendations || []).map((item, index) => (
                    <li key={`${index}-${item.action || "recommendation"}`} className="border border-gray-100 rounded-md p-2">
                      <p className="font-semibold">{item.action || `Recommendation ${index + 1}`}</p>
                      <p>Priority: {item.priority || "N/A"}</p>
                      {item.rationale ? <p>Rationale: {item.rationale}</p> : null}
                    </li>
                  ))}
                  {(latestAudit.recommendations || []).length === 0 ? <li>No recommendations generated.</li> : null}
                </ul>
              </div>

              {latestAudit.errorMessage ? (
                <div className="border border-red-200 bg-red-50 rounded-lg p-3 text-sm text-red-700">
                  {latestAudit.errorMessage}
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </PageLayout>
  );
}
