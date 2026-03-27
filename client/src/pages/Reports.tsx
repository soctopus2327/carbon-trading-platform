import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import PageLayout from "../components/layout/PageLayout";
import {
  fetchAuditById,
  fetchMyAudits,
  generateAuditReport,
  type AuditRecord,
} from "../api/auditApi";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ─── Scrollbar + viewport lock styles ───────────────────────────────────── */
const SCROLL_STYLE = `
  .audit-scroll::-webkit-scrollbar { width: 4px; }
  .audit-scroll::-webkit-scrollbar-track { background: transparent; }
  .audit-scroll::-webkit-scrollbar-thumb { background: #111; border-radius: 99px; }
  .audit-scroll::-webkit-scrollbar-thumb:hover { background: #333; }
  .audit-scroll { scrollbar-width: thin; scrollbar-color: #111 transparent; }
  html, body, #root { overflow: hidden !important; height: 100% !important; }
`;

type ReportsProps = { onLogout?: () => void };

/* ─── Severity badge ──────────────────────────────────────────────────────── */
const SeverityBadge = ({ level }: { level?: string }) => {
  const map: Record<string, string> = {
    HIGH: "bg-red-50 text-red-600 ring-1 ring-red-200",
    MEDIUM: "bg-amber-50 text-amber-600 ring-1 ring-amber-200",
    LOW: "bg-sky-50 text-sky-600 ring-1 ring-sky-200",
  };
  const cls = map[(level ?? "").toUpperCase()] ?? "bg-gray-100 text-gray-500";
  return (
    <span className={`inline-block text-[11px] font-semibold uppercase tracking-wide px-2.5 py-0.5 rounded-full ${cls}`}>
      {level ?? "N/A"}
    </span>
  );
};

/* ─── Priority chip ───────────────────────────────────────────────────────── */
const PriorityChip = ({ p }: { p?: string }) => {
  const map: Record<string, string> = {
    HIGH: "bg-red-50 text-red-600",
    MEDIUM: "bg-amber-50 text-amber-600",
    LOW: "bg-emerald-50 text-emerald-700",
  };
  return (
    <span className={`text-[11px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${map[(p ?? "").toUpperCase()] ?? "bg-gray-100 text-gray-500"}`}>
      {p ?? "N/A"}
    </span>
  );
};

/* ─── Risk colour ─────────────────────────────────────────────────────────── */
const riskColor = (r?: string) => {
  const m: Record<string, string> = {
    HIGH: "text-red-500",
    MEDIUM: "text-amber-500",
    LOW: "text-emerald-500",
  };
  return m[(r ?? "").toUpperCase()] ?? "text-gray-700";
};

/* ════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════════════════ */
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
  const [fileInputKey, setFileInputKey] = useState(0);

  const latestAudit = useMemo(() => {
    if (selectedAudit) return selectedAudit;
    return audits[0] || null;
  }, [audits, selectedAudit]);

  /* ── Patch ancestor heights so nothing outside our panels scrolls ── */
  const wrapRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!wrapRef.current) return;
    const patched: Array<{ el: HTMLElement; prevOverflow: string; prevHeight: string }> = [];
    let el = wrapRef.current.parentElement;
    while (el && el.id !== "root") {
      patched.push({ el, prevOverflow: el.style.overflow, prevHeight: el.style.height });
      el.style.overflow = "hidden";
      el.style.height = "100%";
      el = el.parentElement;
    }
    return () => {
      patched.forEach(({ el, prevOverflow, prevHeight }) => {
        el.style.overflow = prevOverflow;
        el.style.height = prevHeight;
      });
    };
  }, []);

  /* ── Data loaders ── */
  const loadAudits = async () => {
    try {
      setIsLoading(true);
      setError("");
      const data = await fetchMyAudits();
      setAudits(data);
      if (data.length > 0 && data[0]?._id) {
        setSelectedAuditId(data[0]._id);
        setSelectedAudit(data[0]);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load audit reports.");
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
        reportPeriod: reportPeriod.trim() || undefined,
      });
      const freshAudit = generated.audit;
      setAudits((prev) => [freshAudit, ...prev.filter((a) => a._id !== freshAudit._id)]);
      setSelectedAuditId(freshAudit._id);
      setSelectedAudit(freshAudit);
      setReportFile(null);
      setReportPeriod("");
      setFileInputKey((prev) => prev + 1);
    } catch (err: unknown) {
      const message = (err as any)?.response?.data?.message || "Audit generation failed.";
      setError(message);
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const onPickAudit = async (id: string) => {
    setSelectedAuditId(id);
    const local = audits.find((a) => a._id === id);
    if (local) setSelectedAudit(local);
    try {
      const full = await fetchAuditById(id);
      setSelectedAudit(full);
      setAudits((prev) => prev.map((a) => (a._id === id ? full : a)));
    } catch (err) {
      console.error(err);
      setError("Failed to load audit details.");
    }
  };

  /* ── PDF export ── */
  const downloadAuditPDF = () => {
    if (!latestAudit) {
      alert("No audit selected.");
      return;
    }
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129);
    doc.text("Carbon Credit Audit Report", pageWidth / 2, y, { align: "center" });
    y += 18;

    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`Report Period: ${latestAudit.reportPeriod || "Unspecified"}`, 20, y); y += 8;
    doc.text(`Status: ${latestAudit.status}`, 20, y); y += 8;
    doc.text(`Risk Level: ${latestAudit.riskLevel || "N/A"}`, 20, y); y += 8;
    doc.text(`Generated: ${new Date(latestAudit.createdAt).toLocaleString()}`, 20, y); y += 15;

    doc.setFontSize(14);
    doc.setTextColor(16, 185, 129);
    doc.text("Executive Summary", 20, y);
    y += 10;

    doc.setFontSize(11);
    doc.setTextColor(0);
    const summaryLines = doc.splitTextToSize(latestAudit.summary || "No summary available.", pageWidth - 40);
    doc.text(summaryLines, 20, y);
    y += summaryLines.length * 6 + 15;

    const findingsData = (latestAudit.findings || []).map((f, i) => [
      i + 1,
      f.title || `Finding ${i + 1}`,
      f.severity || "N/A",
      f.impact || "-",
    ]);
    autoTable(doc, {
      startY: y,
      head: [["#", "Title", "Severity", "Impact"]],
      body: findingsData.length ? findingsData : [["-", "No findings generated", "-", "-"]],
      theme: "striped",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [16, 185, 129], textColor: 255 },
    });

    y = (doc as any).lastAutoTable?.finalY + 18 || y + 50;

    const recsData = (latestAudit.recommendations || []).map((r, i) => [
      i + 1,
      r.action || `Recommendation ${i + 1}`,
      r.priority || "N/A",
      r.rationale ? r.rationale.substring(0, 80) + "..." : "-",
    ]);
    autoTable(doc, {
      startY: y,
      head: [["#", "Action", "Priority", "Rationale"]],
      body: recsData.length ? recsData : [["-", "No recommendations generated", "-", "-"]],
      theme: "striped",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [16, 185, 129], textColor: 255 },
    });

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(128);
      doc.text(
        "Confidential • Generated by Carbon Credit Platform",
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 12,
        { align: "center" }
      );
    }

    doc.save(`Audit_Report_${latestAudit.reportPeriod || "Unspecified"}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  /* ════════════════════ RENDER ════════════════════ */
  return (
    <PageLayout title="Reports" description="View compliance and audit reports">
      <style>{SCROLL_STYLE}</style>

      {/*
        wrapRef: useLayoutEffect above walks up the DOM from here,
        setting every ancestor div to overflow:hidden + height:100%
        so nothing outside our two inner panels can scroll.
      */}
      <div ref={wrapRef} className="flex flex-col h-full overflow-hidden">
        <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-5 flex-1 min-h-0 overflow-hidden">

          {/* ══════════════ LEFT PANEL ══════════════ */}
          <div className="flex flex-col gap-4 min-h-0 overflow-hidden">

            {/* Generate card — fixed height, never scrolls */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 shrink-0">
              <p className="text-[11px] uppercase tracking-widest text-emerald-500 font-semibold mb-1">New Audit</p>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Generate Report</h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Emission Report PDF</label>
                  <label className="flex items-center gap-3 cursor-pointer border border-dashed border-gray-200 hover:border-emerald-400 rounded-xl px-4 py-3 transition-colors group">
                    <span className="text-2xl">📎</span>
                    <span className="text-sm text-gray-500 group-hover:text-emerald-600 truncate flex-1">
                      {reportFile ? reportFile.name : "Click to choose PDF…"}
                    </span>
                    <input
                      key={fileInputKey}
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                      className="sr-only"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Report Period <span className="text-gray-300">(optional)</span>
                  </label>
                  <input
                    value={reportPeriod}
                    onChange={(e) => setReportPeriod(e.target.value)}
                    placeholder="e.g. 2026-Q1"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-gray-300"
                  />
                </div>

                <button
                  onClick={() => void onGenerate()}
                  disabled={!reportFile || isGenerating}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300
                             text-white text-sm font-semibold rounded-xl transition-all disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Generating…
                    </span>
                  ) : (
                    "Generate Audit Report"
                  )}
                </button>

                {error && (
                  <p className="text-xs text-red-500 text-center bg-red-50 rounded-lg px-3 py-2">{error}</p>
                )}
              </div>
            </div>

            {/* History card — fills remaining space, ONLY THIS SCROLLS */}
            <div className="flex flex-col bg-white border border-gray-100 rounded-2xl shadow-sm p-5 min-h-0 flex-1 overflow-hidden">
              <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-3">Audit History</p>

              <div className="audit-scroll flex-1 overflow-y-auto -mr-1 pr-1 min-h-0">
                {isLoading ? (
                  <div className="flex flex-col gap-2.5 mt-1">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="h-16 rounded-xl bg-gray-50 animate-pulse" />
                    ))}
                  </div>
                ) : audits.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 mt-8">No audits yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {audits.map((audit) => {
                      const active = selectedAuditId === audit._id;
                      return (
                        <button
                          key={audit._id}
                          onClick={() => void onPickAudit(audit._id)}
                          className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all ${
                            active
                              ? "border-emerald-400 bg-emerald-50 shadow-sm"
                              : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <p className={`text-sm font-semibold truncate ${active ? "text-emerald-700" : "text-gray-800"}`}>
                                {audit.reportPeriod || "Unspecified Period"}
                              </p>
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                {new Date(audit.createdAt).toLocaleDateString("en-GB", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold mt-0.5 ${
                                audit.status === "GENERATED"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {audit.status}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>
          {/* end left panel */}

          {/* ══════════════ RIGHT PANEL ══════════════ */}
          <div className="flex flex-col bg-white border border-gray-100 rounded-2xl shadow-sm min-h-0 overflow-hidden">

            {/* Header — fixed, never scrolls */}
            <div className="shrink-0 px-7 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-emerald-500 font-semibold">Report</p>
                <h2 className="text-lg font-bold text-gray-900 mt-0.5">Audit Details</h2>
              </div>
              {latestAudit && (
                <button
                  onClick={downloadAuditPDF}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700
                             text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-emerald-200"
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Download PDF
                </button>
              )}
            </div>

            {/* Content — ONLY THIS AREA SCROLLS */}
            <div className="audit-scroll flex-1 overflow-y-auto min-h-0 px-7 py-6">
              {!latestAudit ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 gap-3">
                  <span className="text-5xl">📋</span>
                  <p className="text-sm">
                    Generate your first audit report
                    <br />
                    to view findings and recommendations.
                  </p>
                </div>
              ) : (
                <div className="space-y-6 max-w-3xl">

                  {/* Stat row */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="border border-gray-100 rounded-xl p-4">
                      <p className="text-[11px] uppercase tracking-widest text-gray-400 font-medium mb-1">Period</p>
                      <p className="text-base font-bold text-gray-800 truncate">{latestAudit.reportPeriod || "—"}</p>
                    </div>
                    <div className="border border-gray-100 rounded-xl p-4">
                      <p className="text-[11px] uppercase tracking-widest text-gray-400 font-medium mb-1">Status</p>
                      <p className={`text-base font-bold ${latestAudit.status === "GENERATED" ? "text-emerald-600" : "text-amber-600"}`}>
                        {latestAudit.status}
                      </p>
                    </div>
                    <div className="border border-gray-100 rounded-xl p-4">
                      <p className="text-[11px] uppercase tracking-widest text-gray-400 font-medium mb-1">Risk Level</p>
                      <p className={`text-base font-bold ${riskColor(latestAudit.riskLevel)}`}>
                        {latestAudit.riskLevel || "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Summary */}
                  <section className="border border-gray-100 rounded-xl p-5">
                    <p className="text-[11px] uppercase tracking-widest text-emerald-500 font-semibold mb-3">
                      Executive Summary
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {latestAudit.summary || "No summary available."}
                    </p>
                  </section>

                  {/* Findings */}
                  <section className="border border-gray-100 rounded-xl p-5">
                    <p className="text-[11px] uppercase tracking-widest text-emerald-500 font-semibold mb-4">
                      Key Findings
                    </p>
                    {(latestAudit.findings || []).length > 0 ? (
                      <div className="space-y-4">
                        {(latestAudit.findings || []).map((finding, i) => (
                          <div key={i} className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3 flex-wrap">
                                <p className="text-sm font-semibold text-gray-800">
                                  {finding.title || `Finding ${i + 1}`}
                                </p>
                                <SeverityBadge level={finding.severity} />
                              </div>
                              {finding.impact && (
                                <p className="text-xs text-gray-500 mt-1.5">{finding.impact}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No findings available.</p>
                    )}
                  </section>

                  {/* Recommendations */}
                  <section className="border border-gray-100 rounded-xl p-5">
                    <p className="text-[11px] uppercase tracking-widest text-emerald-500 font-semibold mb-4">
                      Recommendations
                    </p>
                    {(latestAudit.recommendations || []).length > 0 ? (
                      <div className="space-y-3">
                        {(latestAudit.recommendations || []).map((rec, i) => (
                          <div key={i} className="border border-gray-100 rounded-xl p-4">
                            <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                              <p className="text-sm font-semibold text-gray-800">{rec.action}</p>
                              <PriorityChip p={rec.priority} />
                            </div>
                            {rec.rationale && (
                              <p className="text-xs text-gray-500 leading-relaxed">{rec.rationale}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No recommendations available.</p>
                    )}
                  </section>

                </div>
              )}
            </div>

          </div>
          {/* end right panel */}

        </div>
        {/* end grid */}
      </div>
      {/* end ref wrapper */}
    </PageLayout>
  );
}