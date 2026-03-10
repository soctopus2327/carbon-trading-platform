import { useEffect, useState } from "react";
import { fetchDashboardStats } from "../../api/platformAdminApi";

interface Stats {
  totalCompanies: number;
  pendingCompanies: number;
  activeCompanies: number;
  rejectedCompanies: number;
  blockedCompanies: number;
  totalUsers: number;
  totalTrades: number;
  totalTransactions: number;
  totalCarbonCredits: number;
}

interface StatCardProps {
  label: string;
  value: number | string;
  color: string;
  icon: string;
}

function StatCard({ label, value, color, icon }: StatCardProps) {
  return (
    <div className={`bg-white rounded-xl p-5 border-l-4 ${color} shadow-sm`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <span className="text-3xl opacity-60">{icon}</span>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboardStats()
      .then(setStats)
      .catch(() => setError("Failed to load stats"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-gray-500 animate-pulse">Loading dashboard…</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!stats) return null;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
        <p className="text-gray-500 text-sm mt-1">Real-time stats across all companies and users</p>
      </div>

      {/* Row 1: Companies */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Companies</h2>
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
          <StatCard label="Total" value={stats.totalCompanies} color="border-indigo-500" icon="🏢" />
          <StatCard label="Pending" value={stats.pendingCompanies} color="border-yellow-400" icon="⏳" />
          <StatCard label="Active" value={stats.activeCompanies} color="border-green-500" icon="✅" />
          <StatCard label="Rejected" value={stats.rejectedCompanies} color="border-red-400" icon="❌" />
          <StatCard label="Blocked" value={stats.blockedCompanies} color="border-gray-400" icon="🚫" />
        </div>
      </div>

      {/* Row 2: Platform */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Platform Activity</h2>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={stats.totalUsers} color="border-blue-500" icon="👥" />
          <StatCard label="Trade Listings" value={stats.totalTrades} color="border-purple-500" icon="📋" />
          <StatCard label="Transactions" value={stats.totalTransactions} color="border-teal-500" icon="💱" />
          <StatCard
            label="Carbon Credits"
            value={stats.totalCarbonCredits.toLocaleString()}
            color="border-green-600"
            icon="🌿"
          />
        </div>
      </div>
    </div>
  );
}