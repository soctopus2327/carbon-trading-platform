import { useEffect, useState, type ChangeEvent } from "react";
import axios from "axios";
import PageLayout from "../components/layout/PageLayout";
import {
  DASHBOARD_COMPANY_STORAGE_KEY,
  getDashboardCompanyOptions,
  getDashboardDataset,
  parseDashboardUploadPayload,
  saveUploadedDashboardData,
} from "../data/dashboard.mock";

type SettingsProps = {
  setPage?: (page: string) => void;
};

type CompanyData = {
  name?: string;
  companyType?: string;
  carbonCredits?: number;
  status?: string;
};

type UploadFeedback = {
  type: "success" | "error" | "";
  message: string;
};

export default function Settings({ setPage }: SettingsProps) {
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeUsers, setActiveUsers] = useState<number | null>(null);
  const [activeUsersLoading, setActiveUsersLoading] = useState(true);
  const [companyOptions, setCompanyOptions] = useState<string[]>(() => getDashboardCompanyOptions());
  const [uploadFeedback, setUploadFeedback] = useState<UploadFeedback>({ type: "", message: "" });
  const [selectedDashboardCompany, setSelectedDashboardCompany] = useState<string>(
    localStorage.getItem(DASHBOARD_COMPANY_STORAGE_KEY) || getDashboardCompanyOptions()[0]
  );

  useEffect(() => {
    fetchCompanyData();
    fetchActiveUsersCount();
  }, []);

  const fetchCompanyData = async () => {
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      if (!token || !user?.company) {
        setLoading(false);
        return;
      }

      const response = await axios.get("http://localhost:5000/company/dashboard", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setCompany(response.data);
      if (activeUsers === null && Array.isArray(response.data?.users)) {
        setActiveUsers(response.data.users.length);
      }
    } catch (err) {
      console.error("Error fetching company data", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveUsersCount = async () => {
    try {
      setActiveUsersLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        setActiveUsersLoading(false);
        return;
      }

      const response = await axios.get("http://localhost:5000/company/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const users = Array.isArray(response.data?.users) ? response.data.users : [];
      setActiveUsers(users.length);
    } catch {
      // If this endpoint is role-restricted, keep fallback from company dashboard payload.
      setActiveUsers((prev) => prev);
    } finally {
      setActiveUsersLoading(false);
    }
  };

  const previewDataset = getDashboardDataset(selectedDashboardCompany || company?.name);

  const handleDashboardCompanyChange = (value: string) => {
    setSelectedDashboardCompany(value);
    localStorage.setItem(DASHBOARD_COMPANY_STORAGE_KEY, value);
  };

  const handleDatasetUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileText = await file.text();
      const payload = JSON.parse(fileText);
      const parsed = parseDashboardUploadPayload(payload);
      saveUploadedDashboardData(parsed);
      const updatedOptions = getDashboardCompanyOptions();
      setCompanyOptions(updatedOptions);
      const nextCompany = Object.keys(parsed)[0];
      setSelectedDashboardCompany(nextCompany);
      localStorage.setItem(DASHBOARD_COMPANY_STORAGE_KEY, nextCompany);
      setUploadFeedback({
        type: "success",
        message: `Uploaded ${Object.keys(parsed).length} company dataset(s) from ${file.name}.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload dataset file.";
      setUploadFeedback({ type: "error", message });
    } finally {
      event.target.value = "";
    }
  };

  if (loading) {
    return (
      <PageLayout title="Settings">
        <div className="text-center py-10 text-gray-700" role="status" aria-live="polite">
          Loading settings...
        </div>
      </PageLayout>
    );
  }

  if (!company) {
    return (
      <PageLayout title="Settings">
        <section
          aria-labelledby="settings-empty-title"
          className="bg-white rounded-xl shadow-md border border-gray-100 p-8 max-w-2xl text-gray-900"
        >
          <h2 id="settings-empty-title" className="text-2xl font-bold mb-4">
            No Company Registered
          </h2>
          <p className="text-gray-700 mb-6">You need to register a company first to access all features.</p>
          <button
            onClick={() => setPage && setPage("register")}
            className="bg-green-700 text-white px-6 py-3 rounded-lg hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 transition font-semibold"
          >
            Register Company
          </button>
        </section>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Settings">
      <main aria-labelledby="company-settings-title" className="w-full max-w-none text-gray-900">
        <h2 id="company-settings-title" className="text-2xl font-bold mb-2">
          Company Settings
        </h2>
        <p className="text-sm text-gray-700 mb-6">
          Left: company profile. Right: dashboard data source and upload.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch w-full">
          <section
            aria-labelledby="company-profile-title"
            className="bg-white rounded-xl shadow-md border border-gray-100 p-6 h-full"
          >
            <h3 id="company-profile-title" className="text-lg font-semibold text-gray-900 mb-4">
              Company Profile
            </h3>

            <div className="mb-6">
              <label htmlFor="company-name" className="text-sm font-semibold text-gray-800">
                Company Name
              </label>
              <input
                id="company-name"
                type="text"
                className="w-full mt-2 border-2 border-gray-300 rounded-lg px-4 py-3 bg-gray-50 text-gray-900"
                value={company.name || ""}
                readOnly
                aria-readonly="true"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="company-type" className="text-sm font-semibold text-gray-800">
                Company Type
              </label>
              <input
                id="company-type"
                type="text"
                className="w-full mt-2 border-2 border-gray-300 rounded-lg px-4 py-3 bg-gray-50 text-gray-900"
                value={company.companyType || ""}
                readOnly
                aria-readonly="true"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="credits-balance" className="text-sm font-semibold text-gray-800">
                Carbon Credits Balance
              </label>
              <div
                id="credits-balance"
                className="w-full mt-2 border-2 border-green-200 rounded-lg px-4 py-3 bg-green-50 text-2xl font-bold text-green-800"
                role="status"
                aria-live="polite"
              >
                {company.carbonCredits || "0"} tons
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="active-users" className="text-sm font-semibold text-gray-800">
                Active Users
              </label>
              <div
                id="active-users"
                className="w-full mt-2 border-2 border-blue-200 rounded-lg px-4 py-3 bg-blue-50 text-2xl font-bold text-blue-800"
                role="status"
                aria-live="polite"
              >
                {activeUsersLoading ? "Loading..." : `${activeUsers ?? 0} users`}
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-800">Account Status</p>
              <div className="mt-2">
                <span className="inline-block bg-green-100 text-green-900 px-4 py-2 rounded-full font-semibold">
                  {company.status || "ACTIVE"}
                </span>
              </div>
            </div>

          </section>

          <aside
            aria-labelledby="dashboard-data-title"
            className="bg-white rounded-xl shadow-md border border-gray-100 p-6 h-full"
          >
            <h3 id="dashboard-data-title" className="text-lg font-semibold text-gray-900 mb-4">
              Dashboard Data
            </h3>

            <div className="mb-6">
              <label htmlFor="dashboard-company" className="text-sm font-semibold text-gray-800">
                Company Dataset
              </label>
              <select
                id="dashboard-company"
                className="w-full mt-2 border-2 border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900"
                value={selectedDashboardCompany}
                onChange={(event) => handleDashboardCompanyChange(event.target.value)}
              >
                {companyOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label htmlFor="dataset-upload" className="text-sm font-semibold text-gray-800">
                Upload JSON Dataset
              </label>
              <input
                id="dataset-upload"
                type="file"
                accept=".json,application/json"
                onChange={handleDatasetUpload}
                className="w-full mt-2 border-2 border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-green-100 file:text-green-900"
              />
              {uploadFeedback.message && (
                <p
                  className={`text-sm mt-3 ${uploadFeedback.type === "error" ? "text-red-700" : "text-green-800"}`}
                  role={uploadFeedback.type === "error" ? "alert" : "status"}
                  aria-live={uploadFeedback.type === "error" ? "assertive" : "polite"}
                >
                  {uploadFeedback.message}
                </p>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-800 mb-2">Current Dataset Preview</p>
              <pre
                className="text-xs text-gray-900 bg-gray-50 border border-gray-300 rounded-lg p-3 overflow-auto max-h-80"
                aria-label="Mock dashboard data preview"
                tabIndex={0}
              >
                {JSON.stringify(previewDataset, null, 2)}
              </pre>
            </div>
          </aside>
        </div>
      </main>
    </PageLayout>
  );
}
