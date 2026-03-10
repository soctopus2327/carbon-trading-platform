import { useEffect, useState, useCallback } from "react";
import {
  fetchCompanies,
  approveCompany,
  rejectCompany,
  blockCompany,
  unblockCompany,
  deleteCompany
} from "../../api/platformAdminApi";
import CompanyDetailModal from "../../components/admin/CompanyDetailModal";
import ReasonModal from "../../components/admin/ReasonModal";
import ConfirmModal from "../../components/admin/ConfirmModal";

type Status = "ALL" | "PENDING" | "ACTIVE" | "REJECTED" | "BLOCKED";

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  ACTIVE: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  BLOCKED: "bg-gray-200 text-gray-600",
  MERGED: "bg-blue-100 text-blue-700"
};

export default function CompanyManagement() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [filterStatus, setFilterStatus] = useState<Status>("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [reasonModal, setReasonModal] = useState<{ action: "reject" | "block"; id: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 15 };
      if (filterStatus !== "ALL") params.status = filterStatus;
      if (filterType !== "ALL") params.type = filterType;
      if (search.trim()) params.search = search.trim();

      const data = await fetchCompanies(params);
      setCompanies(data.companies);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterType, search]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const handleApprove = async (id: string) => {
    await approveCompany(id);
    loadCompanies();
  };

  const handleRejectWithReason = async (reason: string) => {
    if (!reasonModal) return;
    if (reasonModal.action === "reject") await rejectCompany(reasonModal.id, reason);
    else await blockCompany(reasonModal.id, reason);
    setReasonModal(null);
    loadCompanies();
  };

  const handleUnblock = async (id: string) => {
    await unblockCompany(id);
    loadCompanies();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await deleteCompany(confirmDelete);
    setConfirmDelete(null);
    loadCompanies();
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Management</h1>
          <p className="text-gray-500 text-sm mt-1">{total} total companies</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <input
          type="text"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 w-48"
        />

        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value as Status); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
        >
          {["ALL", "PENDING", "ACTIVE", "REJECTED", "BLOCKED"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
        >
          {["ALL", "INDIVIDUAL", "COMPANY", "ALLIANCE"].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <button
          onClick={() => { setSearch(""); setFilterStatus("ALL"); setFilterType("ALL"); setPage(1); }}
          className="text-xs text-indigo-500 hover:underline ml-1"
        >
          Reset
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Company", "Type", "Status", "Credits", "Registered", "Actions"].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400">Loading…</td>
              </tr>
            ) : companies.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400">No companies found</td>
              </tr>
            ) : companies.map((c) => (
              <tr key={c._id} className="hover:bg-gray-50 transition">
                <td className="px-5 py-3 font-semibold text-gray-900">
                  <button
                    onClick={() => setSelectedCompany(c._id)}
                    className="text-indigo-600 hover:underline font-semibold"
                  >
                    {c.name}
                  </button>
                </td>
                <td className="px-5 py-3 text-gray-600">{c.companyType}</td>
                <td className="px-5 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[c.status] || ""}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-700">{c.carbonCredits?.toLocaleString()}</td>
                <td className="px-5 py-3 text-gray-400 text-xs">
                  {new Date(c.createdAt).toLocaleDateString()}
                </td>
                <td className="px-5 py-3">
                  <div className="flex gap-2 flex-wrap">
                    {c.status === "PENDING" && (
                      <>
                        <ActionBtn color="green" onClick={() => handleApprove(c._id)}>Approve</ActionBtn>
                        <ActionBtn color="red" onClick={() => setReasonModal({ action: "reject", id: c._id })}>Reject</ActionBtn>
                      </>
                    )}
                    {c.status === "ACTIVE" && (
                      <ActionBtn color="orange" onClick={() => setReasonModal({ action: "block", id: c._id })}>Block</ActionBtn>
                    )}
                    {c.status === "BLOCKED" && (
                      <ActionBtn color="green" onClick={() => handleUnblock(c._id)}>Unblock</ActionBtn>
                    )}
                    <ActionBtn color="gray" onClick={() => setSelectedCompany(c._id)}>Details</ActionBtn>
                    <ActionBtn color="red" onClick={() => setConfirmDelete(c._id)}>Delete</ActionBtn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-3 justify-end">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            Next →
          </button>
        </div>
      )}

      {/* Modals */}
      {selectedCompany && (
        <CompanyDetailModal
          companyId={selectedCompany}
          onClose={() => { setSelectedCompany(null); loadCompanies(); }}
        />
      )}

      {reasonModal && (
        <ReasonModal
          title={reasonModal.action === "reject" ? "Reject Company" : "Block Company"}
          placeholder={`Reason for ${reasonModal.action}ing…`}
          onConfirm={handleRejectWithReason}
          onCancel={() => setReasonModal(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete Company"
          message="This will permanently delete the company and all its users. This action cannot be undone."
          confirmLabel="Delete Permanently"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function ActionBtn({
  children,
  color,
  onClick
}: {
  children: React.ReactNode;
  color: "green" | "red" | "orange" | "gray";
  onClick: () => void;
}) {
  const cls = {
    green: "bg-green-50 text-green-700 hover:bg-green-100 border-green-200",
    red: "bg-red-50 text-red-600 hover:bg-red-100 border-red-200",
    orange: "bg-orange-50 text-orange-600 hover:bg-orange-100 border-orange-200",
    gray: "bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200"
  };
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition ${cls[color]}`}
    >
      {children}
    </button>
  );
}