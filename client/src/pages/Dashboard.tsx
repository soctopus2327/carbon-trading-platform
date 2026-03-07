import PageLayout from "../components/layout/PageLayout";
import StatCard from "../components/dashboard/StatCard";
import EmissionsChart from "../components/dashboard/EmissionsChart";
import PortfolioDistribution from "../components/dashboard/PortfolioDistribution";
import { dashboardStats } from "../data/dashboard.mock";

export default function Dashboard({ onLogout }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const companyName =
    user?.companyName ||
    user?.company?.name ||
    user?.company?.companyName ||
    user?.name ||
    "";

  return (
    <PageLayout
      title={companyName ? `Dashboard - ${companyName}` : "Dashboard"}
      description="Overview of your carbon portfolio and trading activity"
      compact
    >
      {/* Stats Section */}
      <div className="grid xl:grid-cols-4 md:grid-cols-2 grid-cols-1 gap-4 mb-6">
        {dashboardStats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-3 grid-cols-1 gap-4 items-stretch">
        
        <div className="lg:col-span-2 h-full">
          <EmissionsChart />
        </div>

        <div className="h-full">
          <PortfolioDistribution />
        </div>

      </div>
    </PageLayout>
  );
}
