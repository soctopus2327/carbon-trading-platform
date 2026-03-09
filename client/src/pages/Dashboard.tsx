import { useState, type ChangeEvent } from "react";
import PageLayout from "../components/layout/PageLayout";
import StatCard from "../components/dashboard/StatCard";
import EmissionsChart from "../components/dashboard/EmissionsChart";
import PortfolioDistribution from "../components/dashboard/PortfolioDistribution";
import {
  DASHBOARD_COMPANY_STORAGE_KEY,
  getDashboardDataset,
  getUploadedDashboardData,
  parseDashboardUploadPayload,
  saveUploadedDashboardData,
} from "../data/dashboard.mock";

export default function Dashboard() {
  const [uploadFeedback, setUploadFeedback] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const companyName =
    user?.companyName ||
    user?.company?.name ||
    user?.company?.companyName ||
    user?.name ||
    "";
  const hasRegisteredCompany = Boolean(
    user?.company || user?.companyName || user?.company?.name || user?.company?.companyName
  );

  const uploadedData = getUploadedDashboardData();
  const uploadedCompanies = Object.keys(uploadedData);
  const selectedCompany = localStorage.getItem(DASHBOARD_COMPANY_STORAGE_KEY);
  const effectiveCompany =
    selectedCompany ||
    companyName ||
    (!hasRegisteredCompany && uploadedCompanies.length ? uploadedCompanies[0] : "");
  const dashboardData = getDashboardDataset(effectiveCompany);
  const titleCompany = effectiveCompany || dashboardData.company;

  const handleDatasetUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileText = await file.text();
      const payload = JSON.parse(fileText);
      const parsed = parseDashboardUploadPayload(payload);
      saveUploadedDashboardData(parsed);
      const nextCompany = Object.keys(parsed)[0];
      localStorage.setItem(DASHBOARD_COMPANY_STORAGE_KEY, nextCompany);
      setUploadFeedback(`Uploaded ${Object.keys(parsed).length} company dataset(s) from ${file.name}.`);
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload dashboard dataset.";
      setUploadFeedback(message);
    } finally {
      event.target.value = "";
    }
  };

  if (!hasRegisteredCompany && uploadedCompanies.length === 0) {
    return (
      <PageLayout title="Dashboard" description="Upload dataset to render dashboard for unregistered company" compact>
        <div
          key={refreshKey}
          className="bg-white rounded-xl border border-dashed border-gray-300 p-8 max-w-2xl"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-3">No Company Registered</h2>
          <p className="text-gray-600 mb-6">
            Your dashboard is empty. Upload a JSON dataset file to populate dashboard cards and charts.
          </p>
          <label htmlFor="dashboard-empty-upload" className="text-sm font-semibold text-gray-800">
            Upload Dashboard Dataset (JSON)
          </label>
          <input
            id="dashboard-empty-upload"
            type="file"
            accept=".json,application/json"
            onChange={handleDatasetUpload}
            className="w-full mt-2 border-2 border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-green-100 file:text-green-900"
          />
          {uploadFeedback && <p className="text-sm text-green-700 mt-3">{uploadFeedback}</p>}
        </div>
      </PageLayout>
    );
  }

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
