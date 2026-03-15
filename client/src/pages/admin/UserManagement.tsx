import { useEffect, useState, useCallback } from "react";
import { fetchUsers, deleteUser } from "../../api/platformAdminApi";
import ConfirmModal from "../../components/admin/ConfirmModal";
import { 
  Search, 
  Filter, 
  RefreshCcw, 
  Users, 
  Mail, 
  ShieldCheck, 
  Building2, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2
} from "lucide-react";

const ROLE_BADGE: Record<string, string> = {
  ADMIN: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
  TRADER: "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20",
  AUDITOR: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20",
  VIEWER: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20"
};

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [filterRole, setFilterRole] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (filterRole !== "ALL") params.role = filterRole;
      if (search.trim()) params.search = search.trim();

      const data = await fetchUsers(params);
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      // handled silently
    } finally {
      setLoading(false);
    }
  }, [page, filterRole, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await deleteUser(confirmDelete);
    setConfirmDelete(null);
    loadUsers();
  };

  const resetFilters = () => {
    setSearch("");
    setFilterRole("ALL");
    setPage(1);
  };

  return (
    <div className="p-8 min-h-full bg-[#F8FAFC] space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">User Management</h1>
          <div className="flex items-center gap-2 mt-2 text-slate-500 text-sm">
            <Users className="h-4 w-4" />
            <span>Managing {total.toLocaleString()} active platform users</span>
          </div>
        </div>
        <button 
          onClick={loadUsers}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 rounded-xl text-white text-sm font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 active:scale-95"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col lg:flex-row gap-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email address..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl shadow-inner">
            <ShieldCheck className="h-4 w-4 text-slate-400" />
            <select
              value={filterRole}
              onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
              className="bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer"
            >
              {["ALL", "ADMIN", "TRADER", "AUDITOR", "VIEWER"].map((r) => (
                <option key={r} value={r}>{r === "ALL" ? "All Roles" : r}</option>
              ))}
            </select>
          </div>

          <button
            onClick={resetFilters}
            className="px-5 py-3 text-sm font-bold text-white hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {["User Details", "Role", "Organization", "Account Status", "Joined", "Actions"].map((h) => (
                  <th key={h} className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-24">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
                      <span className="text-slate-400 font-medium">Fetching users...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 opacity-40">
                      <Users className="h-10 w-10 text-slate-300" />
                      <p className="text-slate-500 font-medium">No users found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-5">
                      <p className="text-slate-900 font-bold">{u.name}</p>
                      <div className="flex items-center gap-1 mt-0.5 text-slate-400 text-xs">
                        <Mail className="h-3 w-3" />
                        {u.email}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight ${ROLE_BADGE[u.role]}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                        <Building2 className="h-3.5 w-3.5 text-slate-300" />
                        <span className="text-sm">{u.company?.name || "Unassigned"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                       {u.company?.status ? (
                        <span className="text-xs font-semibold text-slate-500 px-2 py-1 bg-slate-100 rounded-md">
                          {u.company.status}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-6 py-5 text-slate-500 text-xs font-medium">
                      {new Date(u.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-5">
                      <button
                        onClick={() => setConfirmDelete(u._id)}
                        className="p-2 hover:bg-rose-50 rounded-lg text-slate-300 hover:text-rose-600 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Showing Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmModal
          title="Revoke User Access"
          message={`Are you sure you want to permanently delete ${users.find(u => u._id === confirmDelete)?.name}? This will revoke all platform permissions immediately.`}
          confirmLabel="Delete Permanently"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}