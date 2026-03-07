import { useCallback, useEffect, useMemo, useState } from "react";
import PageLayout from "../components/layout/PageLayout";
import {
  addCompanyUser,
  fetchCompanyUsers,
  removeCompanyUser,
  updateCompanyUserRole
} from "../api/companyUsersApi";

const MANAGEABLE_ROLES = ["ADMIN", "TRADER", "AUDITOR", "VIEWER"] as const;

type ManagedUser = {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

function getCurrentRole() {
  const rawUser = localStorage.getItem("user");
  if (rawUser) {
    try {
      const parsed = JSON.parse(rawUser);
      //console.log(parsed.role);
      if (parsed?.role) return parsed.role;
    } catch {
      // fallback below
    }
  }

  return localStorage.getItem("role");
}

export default function ManagePeople({ setPage }: { setPage: (page: string) => void }) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<(typeof MANAGEABLE_ROLES)[number]>("VIEWER");

  const role = useMemo(() => getCurrentRole(), []);
  const currentUserId = useMemo(() => {
    try {
      const rawUser = localStorage.getItem("user");
      return rawUser ? JSON.parse(rawUser)?._id || null : null;
    } catch {
      return null;
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const data = await fetchCompanyUsers();
      setUsers(data.users || []);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setPage("dashboard");
        window.history.replaceState({}, "", "/dashboard");
        return;
      }
      setErrorMessage(err.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role !== "ADMIN") {
      setPage("dashboard");
      window.history.replaceState({}, "", "/dashboard");
      return;
    }

    loadUsers();
  }, [loadUsers, role, setPage]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage("");
    setErrorMessage("");

    try {
      const data = await addCompanyUser({
        email: newEmail.trim(),
        role: newRole,
        name: newName.trim() || undefined
      });

      if (data.user) {
        setUsers((prev) => {
          const withoutExisting = prev.filter((u) => u._id !== data.user._id);
          return [data.user, ...withoutExisting];
        });
      } else {
        await loadUsers();
      }
      setNewEmail("");
      setNewName("");
      setNewRole("VIEWER");

      const tempPasswordMessage = data.tempPassword
        ? ` Temporary password: ${data.tempPassword}`
        : "";
      setStatusMessage(`${data.message}.${tempPasswordMessage}`);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setPage("dashboard");
        window.history.replaceState({}, "", "/dashboard");
        return;
      }
      setErrorMessage(err.response?.data?.message || "Failed to add user");
    }
  };

  const handleRoleChange = async (userId: string, roleValue: string) => {
    setSavingUserId(userId);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const data = await updateCompanyUserRole(userId, roleValue);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: data.user?.role || roleValue } : u))
      );
      setStatusMessage("User role updated successfully.");
    } catch (err: any) {
      if (err.response?.status === 403) {
        setPage("dashboard");
        window.history.replaceState({}, "", "/dashboard");
        return;
      }
      setErrorMessage(err.response?.data?.message || "Failed to update role");
    } finally {
      setSavingUserId(null);
    }
  };

  const handleRemove = async (userId: string) => {
    setSavingUserId(userId);
    setErrorMessage("");
    setStatusMessage("");

    try {
      await removeCompanyUser(userId);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      setStatusMessage("User removed successfully.");
    } catch (err: any) {
      if (err.response?.status === 403) {
        setPage("dashboard");
        window.history.replaceState({}, "", "/dashboard");
        return;
      }
      setErrorMessage(err.response?.data?.message || "Failed to remove user");
    } finally {
      setSavingUserId(null);
    }
  };

  if (role !== "ADMIN") {
    return (
      <PageLayout title="Access Denied">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3">
          Access denied. Only company admin can manage users.
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Manage People" description="Manage users in your company only.">
      <div className="space-y-6">
        <form
          onSubmit={handleAddUser}
          className="bg-white border border-gray-200 rounded-xl p-5 grid gap-4 md:grid-cols-4"
        >
          <input
            type="text"
            placeholder="Name (optional)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="email"
            placeholder="Email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as (typeof MANAGEABLE_ROLES)[number])}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {MANAGEABLE_ROLES.map((roleOption) => (
              <option key={roleOption} value={roleOption}>
                {roleOption}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-green-700"
          >
            Add User
          </button>
        </form>

        {statusMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
            {statusMessage}
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {errorMessage}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No users found in your company.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="border-b border-gray-100">
                    <td className="px-4 py-3">{user.name}</td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">
                      {currentUserId === user._id ? (
                        <span className="inline-flex px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-semibold">
                          ADMIN (self)
                        </span>
                      ) : (
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user._id, e.target.value)}
                          disabled={savingUserId === user._id}
                          className="border border-gray-300 rounded-md px-2 py-1 text-xs"
                        >
                          {MANAGEABLE_ROLES.map((roleOption) => (
                            <option key={roleOption} value={roleOption}>
                              {roleOption}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                        ACTIVE
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {currentUserId === user._id ? (
                        <span className="px-3 py-1.5 rounded-md text-xs font-semibold border border-gray-200 bg-gray-100 text-gray-500">
                          Cannot remove self
                        </span>
                      ) : (
                      <button
                        type="button"
                        onClick={() => handleRemove(user._id)}
                        disabled={savingUserId === user._id}
                        className="px-3 py-1.5 rounded-md text-xs font-semibold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-60"
                      >
                        Remove User
                      </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageLayout>
  );
}
