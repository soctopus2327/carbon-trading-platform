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

import {
  Search,
  Filter,
  RefreshCcw,
  Building2,
  CreditCard,
  Calendar,
  Loader2,
  Trash2,
  ChevronRight,
  ChevronLeft
} from "lucide-react";

type Status = "ALL" | "PENDING" | "ACTIVE" | "REJECTED" | "BLOCKED";

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
  REJECTED: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20",
  BLOCKED: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20"
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

      setCompanies(data.companies || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);

    } catch {

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

    if (reasonModal.action === "reject")
      await rejectCompany(reasonModal.id, reason);
    else
      await blockCompany(reasonModal.id, reason);

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

  const resetFilters = () => {

    setSearch("");
    setFilterStatus("ALL");
    setFilterType("ALL");
    setPage(1);
  };

  const iconBtnClasses =
    "p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition";

  return (

    <div className="p-8 min-h-full bg-[#F8FAFC] space-y-8">

      {/* Header */}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

        <div>

          <h1 className="text-3xl font-bold text-slate-900">
            Company Management
          </h1>

          <div className="flex items-center gap-2 mt-2 text-slate-500 text-sm">
            <Building2 className="h-4 w-4" />
            <span>{total.toLocaleString()} registered entities</span>
          </div>

        </div>

        <button
          onClick={loadCompanies}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 rounded-xl text-white text-sm font-semibold hover:bg-emerald-700 transition shadow"
        >

          <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />

          Refresh

        </button>

      </div>

      {/* Filters */}

      <div className="flex flex-col lg:flex-row gap-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">

        <div className="relative flex-1">

          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />

          <input
            type="text"
            placeholder="Search company..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
          />

        </div>

        <div className="flex gap-3 flex-wrap">

          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value as Status); setPage(1); }}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
          >

            {["ALL", "PENDING", "ACTIVE", "REJECTED", "BLOCKED"].map((s) => (
              <option key={s} value={s}>
                {s === "ALL" ? "All Statuses" : s}
              </option>
            ))}

          </select>

          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
          >

            {["ALL", "INDIVIDUAL", "COMPANY", "ALLIANCE"].map((t) => (
              <option key={t} value={t}>
                {t === "ALL" ? "All Types" : t}
              </option>
            ))}

          </select>

          <button
            onClick={resetFilters}
            className="px-5 py-3 text-sm font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl shadow-sm"
          >
            Clear Filters
          </button>

        </div>

      </div>

      {/* Table */}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        <table className="w-full">

          <thead className="bg-slate-50 border-b border-slate-200">

            <tr>

              {["Company", "Type", "Status", "Credits", "Registered", "Actions"].map((h) => (
                <th
                  key={h}
                  className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase"
                >
                  {h}
                </th>
              ))}

            </tr>

          </thead>

          <tbody className="divide-y divide-slate-100">

            {loading ? (

              <tr>
                <td colSpan={6} className="py-20 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-500" />
                </td>
              </tr>

            ) : companies.length === 0 ? (

              <tr>
                <td colSpan={6} className="py-20 text-center text-slate-400">
                  No companies found
                </td>
              </tr>

            ) : (

              companies.map((c) => (

                <tr key={c._id} className="hover:bg-slate-50">

                  {/* Company */}

                  <td className="px-6 py-4">

                    <div className="flex items-center gap-3">

                      <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                        {c.name?.charAt(0)}
                      </div>

                      <button
                        onClick={() => setSelectedCompany(c._id)}
                        className="font-semibold text-slate-900 hover:text-emerald-600"
                      >
                        {c.name}
                      </button>

                    </div>

                  </td>

                  <td className="px-6 py-4 text-slate-600">{c.companyType}</td>

                  <td className="px-6 py-4">

                    <span
                      className={`px-2.5 py-1 text-xs font-semibold rounded-full ${STATUS_BADGE[c.status]}`}
                    >
                      {c.status}
                    </span>

                  </td>

                  <td className="px-6 py-4 font-semibold text-slate-700">
                    {c.carbonCredits?.toLocaleString()}
                  </td>

                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>

                  <td className="px-6 py-4">

                    <div className="flex items-center gap-2">

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

                      <button
                        onClick={() => setSelectedCompany(c._id)}
                        className={iconBtnClasses}
                      >
                        <ChevronRight size={16} />
                      </button>

                      <button
                        onClick={() => setConfirmDelete(c._id)}
                        className={iconBtnClasses}
                      >
                        <Trash2 size={16} />
                      </button>

                    </div>

                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>

      {/* Pagination */}

      {totalPages > 1 && (

        <div className="flex justify-end gap-2">

          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="p-2 border rounded-lg bg-white"
          >
            <ChevronLeft size={16} />
          </button>

          <button
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            className="p-2 border rounded-lg bg-white"
          >
            <ChevronRight size={16} />
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
          placeholder="Provide reason..."
          onConfirm={handleRejectWithReason}
          onCancel={() => setReasonModal(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete Company"
          message="This action cannot be undone."
          confirmLabel="Delete"
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
  color: "green" | "red" | "orange";
  onClick: () => void;
}) {

  const cls = {
    green: "bg-emerald-600 text-white hover:bg-emerald-700",
    red: "bg-rose-50 text-rose-600 hover:bg-rose-100",
    orange: "bg-amber-50 text-amber-600 hover:bg-amber-100"
  };

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${cls[color]}`}
    >
      {children}
    </button>
  );
}