import PageLayout from "../components/layout/PageLayout";
import StatCard from "../components/dashboard/StatCard";
import EmissionsChart from "../components/dashboard/EmissionsChart";
import PortfolioDistribution from "../components/dashboard/PortfolioDistribution";
import {
  DASHBOARD_COMPANY_STORAGE_KEY,
  getDashboardDataset,
} from "../data/dashboard.mock";

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const companyName =
    user?.companyName ||
    user?.company?.name ||
    user?.company?.companyName ||
    user?.name ||
    "";
  const selectedCompany = localStorage.getItem(DASHBOARD_COMPANY_STORAGE_KEY);
  const dashboardData = getDashboardDataset(selectedCompany || companyName);
  const titleCompany = selectedCompany || companyName || dashboardData.company;

  return (
    <PageLayout
      title={titleCompany ? `Dashboard - ${titleCompany}` : "Dashboard"}
      description="Overview of your carbon portfolio and trading activity"
      compact
    >
      {/* Stats Section */}
      <div className="grid xl:grid-cols-4 md:grid-cols-2 grid-cols-1 gap-4 mb-6">
        {dashboardData.stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-3 grid-cols-1 gap-4 items-stretch">
        
        <div className="lg:col-span-2 h-full">
          <EmissionsChart data={dashboardData.emissionsTrend} />
        </div>

        <div className="h-full">
          <PortfolioDistribution projects={dashboardData.portfolioDistribution} />
        </div>

      </div>
    </PageLayout>
  );
}
