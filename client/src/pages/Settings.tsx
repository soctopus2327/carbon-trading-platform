import { useEffect, useState } from "react";
import axios from "axios";
import PageLayout from "../components/layout/PageLayout";

export default function Settings({ setPage, onLogout }) {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const fetchCompanyData = async () => {
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user"));

      if (!token || !user?.company) {
        setLoading(false);
        return;
      }

      const response = await axios.get(
        "http://localhost:5000/company/dashboard",
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setCompany(response.data);
    } catch (err) {
      console.error("Error fetching company data", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="Settings">
        <div className="text-center py-10 text-gray-600">Loading...</div>
      </PageLayout>
    );
  }

  if (!company) {
    return (
      <PageLayout title="Settings">
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-8 max-w-2xl text-gray-900">
          <h2 className="text-2xl font-bold mb-4">No Company Registered</h2>
          <p className="text-gray-600 mb-6">
            You need to register a company first to access all features.
          </p>
          <button
            onClick={() => setPage && setPage("register")}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold"
          >
            Register Company
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Settings">
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-8 max-w-2xl text-gray-900">
        <h2 className="text-2xl font-bold mb-8">Company Settings</h2>

        {/* Company Name */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-gray-700">
            Company Name
          </label>
          <input
            type="text"
            className="w-full mt-2 border-2 border-gray-200 rounded-lg px-4 py-3 bg-gray-50 focus:outline-none focus:border-green-500 transition"
            value={company.name || ""}
            readOnly
          />
        </div>

        {/* Company Type */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-gray-700">
            Company Type
          </label>
          <input
            type="text"
            className="w-full mt-2 border-2 border-gray-200 rounded-lg px-4 py-3 bg-gray-50 focus:outline-none"
            value={company.companyType || ""}
            readOnly
          />
        </div>

        {/* Carbon Credits */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-gray-700">
            Carbon Credits Balance
          </label>
          <div className="w-full mt-2 border-2 border-green-200 rounded-lg px-4 py-3 bg-green-50 text-2xl font-bold text-green-700">
            {company.carbonCredits || "0"} tons
          </div>
        </div>

        {/* Status */}
        <div className="mb-8">
          <label className="text-sm font-semibold text-gray-700">
            Account Status
          </label>
          <div className="mt-2">
            <span className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-full font-semibold">
              {company.status || "ACTIVE"}
            </span>
          </div>
        </div>

        {/* Info Message */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 font-medium">
            ℹ️ Your company information is read-only and managed by the administrator.
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
