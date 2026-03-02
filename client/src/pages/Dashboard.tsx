import PageLayout from "../components/layout/PageLayout";
import StatCard from "../components/dashboard/StatCard";
import EmissionsChart from "../components/dashboard/EmissionsChart";
import PortfolioDistribution from "../components/dashboard/PortfolioDistribution";
import { dashboardStats } from "../data/dashboard.mock";

export default function Dashboard({ onLogout }) {
  return (
    <PageLayout
      title="Dashboard"
      description="Overview of your carbon portfolio and trading activity"
    >
      {/* Stats Section */}
      <div className="grid xl:grid-cols-4 md:grid-cols-2 grid-cols-1 gap-8 mb-12">
        {dashboardStats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-3 grid-cols-1 gap-12">
        
        <div className="lg:col-span-2">
          <EmissionsChart />
        </div>

        <div>
          <PortfolioDistribution />
        </div>

      </div>
    </PageLayout>
  );
}