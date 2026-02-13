import PageLayout from "../components/layout/PageLayout";
import StatCard from "../components/dashboard/StatCard";
import EmissionsChart from "../components/dashboard/EmissionsChart";
import PortfolioDistribution from "../components/dashboard/PortfolioDistribution";
import { dashboardStats } from "../data/dashboard.mock";

export default function Dashboard() {
  return (
    <PageLayout>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-gray-500 mb-6">
        Overview of your sustainability performance
      </p>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        {dashboardStats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <EmissionsChart />
        </div>
        <PortfolioDistribution />
      </div>
    </PageLayout>
  );
}
