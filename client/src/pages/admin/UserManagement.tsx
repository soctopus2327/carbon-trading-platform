import { useEffect, useState, useCallback } from "react";
import { fetchUsers, deleteUser } from "../../api/platformAdminApi";
import ConfirmModal from "../../components/admin/ConfirmModal";

const ROLE_BADGE: Record<string, string> = {
  ADMIN: "bg-indigo-100 text-indigo-700",
  TRADER: "bg-purple-100 text-purple-700",
  AUDITOR: "bg-teal-100 text-teal-700",
  VIEWER: "bg-gray-100 text-gray-600"
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
      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      // handle silently
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

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500 text-sm mt-1">{total} users across all companies</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <input
          type="text"
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 w-52"
        />

        <select
          value={filterRole}
          onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
        >
          {["ALL", "ADMIN", "TRADER", "AUDITOR", "VIEWER"].map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <button
          onClick={() => { setSearch(""); setFilterRole("ALL"); setPage(1); }}
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
              {["Name", "Email", "Role", "Company", "Company Status", "Joined", "Actions"].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-400">Loading…</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-400">No users found</td>
              </tr>
            ) : users.map((u) => (
              <tr key={u._id} className="hover:bg-gray-50 transition">
                <td className="px-5 py-3 font-semibold text-gray-900">{u.name}</td>
                <td className="px-5 py-3 text-gray-500">{u.email}</td>
                <td className="px-5 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ROLE_BADGE[u.role] || "bg-gray-100"}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-700">{u.company?.name || "—"}</td>
                <td className="px-5 py-3">
                  {u.company?.status ? (
                    <span className="text-xs text-gray-500">{u.company.status}</span>
                  ) : "—"}
                </td>
                <td className="px-5 py-3 text-gray-400 text-xs">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => setConfirmDelete(u._id)}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold border bg-red-50 text-red-600 hover:bg-red-100 border-red-200 transition"
                  >
                    Delete
                  </button>
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

      {confirmDelete && (
        <ConfirmModal
          title="Delete User"
          message="This will permanently remove the user from the platform."
          confirmLabel="Delete User"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}