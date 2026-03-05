import { useEffect, useState } from "react";
import {
  fetchCompanyDetails,
  approveCompany,
  blockCompany,
  unblockCompany,
  adjustCredits
} from "../../api/platformAdminApi";

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  ACTIVE: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  BLOCKED: "bg-gray-200 text-gray-600",
  MERGED: "bg-blue-100 text-blue-700"
};

export default function CompanyDetailModal({
  companyId,
  onClose
}: {
  companyId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "transactions">("overview");

  // Credit adjustment state
  const [creditInput, setCreditInput] = useState("");
  const [creditOp, setCreditOp] = useState<"SET" | "ADD" | "SUBTRACT">("ADD");
  const [creditLoading, setCreditLoading] = useState(false);
  const [creditMsg, setCreditMsg] = useState("");

  const load = () => {
    setLoading(true);
    fetchCompanyDetails(companyId)
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [companyId]);

  const handleCredits = async () => {
    const val = Number(creditInput);
    if (isNaN(val) || val < 0) return;
    setCreditLoading(true);
    setCreditMsg("");
    try {
      const res = await adjustCredits(companyId, val, creditOp);
      setCreditMsg(`✅ Credits updated. New balance: ${res.carbonCredits}`);
      load();
    } catch (e: any) {
      setCreditMsg("❌ " + (e.response?.data?.message || "Failed"));
    } finally {
      setCreditLoading(false);
    }
  };

  const handleApprove = async () => { await approveCompany(companyId); load(); };
  const handleBlock = async () => { await blockCompany(companyId); load(); };
  const handleUnblock = async () => { await unblockCompany(companyId); load(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Company Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-400">Loading…</div>
        ) : !data ? (
          <div className="p-10 text-center text-red-500">Failed to load</div>
        ) : (
          <>
            {/* Company Summary */}
            <div className="p-6 border-b border-gray-100 flex flex-wrap gap-4 items-start">
              <div className="flex-1 min-w-48">
                <p className="text-xl font-bold text-gray-900">{data.company.name}</p>
                <p className="text-sm text-gray-500 mt-0.5">{data.company.companyType}</p>
                {data.company.location && (
                  <p className="text-xs text-gray-400 mt-1">📍 {data.company.location}</p>
                )}
                {data.company.registrationNumber && (
                  <p className="text-xs text-gray-400">Reg: {data.company.registrationNumber}</p>
                )}
              </div>
              <div className="text-right space-y-2">
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${STATUS_BADGE[data.company.status]}`}>
                  {data.company.status}
                </span>
                <p className="text-2xl font-bold text-green-700">
                  🌿 {data.company.carbonCredits?.toLocaleString()} credits
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="px-6 py-4 bg-gray-50 flex flex-wrap gap-2 border-b border-gray-100">
              {data.company.status === "PENDING" && (
                <button
                  onClick={handleApprove}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700"
                >
                  ✅ Approve
                </button>
              )}
              {data.company.status === "ACTIVE" && (
                <button
                  onClick={handleBlock}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600"
                >
                  🚫 Block
                </button>
              )}
              {data.company.status === "BLOCKED" && (
                <button
                  onClick={handleUnblock}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                >
                  🔓 Unblock
                </button>
              )}
            </div>

            {/* Credit Adjustment */}
            <div className="px-6 py-4 border-b border-gray-100 bg-indigo-50">
              <p className="text-xs font-semibold text-indigo-700 uppercase mb-2">Adjust Carbon Credits</p>
              <div className="flex gap-2 flex-wrap items-center">
                <select
                  value={creditOp}
                  onChange={(e) => setCreditOp(e.target.value as any)}
                  className="border border-indigo-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="ADD">Add</option>
                  <option value="SUBTRACT">Subtract</option>
                  <option value="SET">Set to</option>
                </select>
                <input
                  type="number"
                  value={creditInput}
                  onChange={(e) => setCreditInput(e.target.value)}
                  placeholder="Amount"
                  className="border border-indigo-200 rounded-lg px-3 py-2 text-sm w-32"
                />
                <button
                  onClick={handleCredits}
                  disabled={creditLoading || !creditInput}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  Apply
                </button>
                {creditMsg && <span className="text-xs">{creditMsg}</span>}
              </div>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-4">
              <div className="flex gap-1 border-b border-gray-200">
                {(["overview", "users", "transactions"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`px-4 py-2 text-sm font-semibold capitalize rounded-t-lg transition ${
                      activeTab === t
                        ? "bg-indigo-600 text-white"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === "overview" && (
                <div className="space-y-3 text-sm">
                  <Row label="Company ID" value={data.company._id} />
                  <Row label="Status" value={data.company.status} />
                  <Row label="Type" value={data.company.companyType} />
                  <Row label="Carbon Credits" value={data.company.carbonCredits} />
                  <Row label="Emission Level" value={data.company.emissionLevel} />
                  <Row label="Risk Score" value={data.company.riskScore ?? "—"} />
                  <Row label="Verified By" value={data.company.verifiedBy?.name || "Not yet"} />
                  <Row label="Parent Alliance" value={data.company.parentCompany?.name || "None"} />
                  <Row label="Registered" value={new Date(data.company.createdAt).toLocaleString()} />
                  {data.company.aiRecommendation && (
                    <Row label="Note" value={data.company.aiRecommendation} />
                  )}
                </div>
              )}

              {activeTab === "users" && (
                <div className="space-y-2">
                  {data.allUsers.length === 0 ? (
                    <p className="text-gray-400 text-sm">No users found</p>
                  ) : data.allUsers.map((u: any) => (
                    <div key={u._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                        {u.role}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "transactions" && (
                <div className="space-y-2">
                  {data.recentTransactions.length === 0 ? (
                    <p className="text-gray-400 text-sm">No transactions</p>
                  ) : data.recentTransactions.map((t: any) => (
                    <div key={t._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {t.buyerCompany?.name} ← {t.sellerCompany?.name}
                        </p>
                        <p className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-indigo-600">{t.credits} credits</p>
                        <p className="text-xs text-green-700">${t.totalAmount.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between border-b border-gray-100 pb-2">
      <span className="text-gray-500 font-medium">{label}</span>
      <span className="text-gray-800 font-semibold text-right max-w-xs truncate">{String(value)}</span>
    </div>
  );
}