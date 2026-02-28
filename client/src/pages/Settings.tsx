import PageLayout from "../components/layout/PageLayout";

export default function Settings() {
  return (
    <PageLayout title="Settings">

      <div className="bg-white rounded-xl shadow p-6 max-w-xl">

        <h2 className="text-lg font-semibold mb-4">
          Account Settings
        </h2>

        {/* Company Name */}
        <div className="mb-4">
          <label className="text-sm text-gray-600">
            Company Name
          </label>

          <input
            className="w-full mt-1 border rounded-lg px-3 py-2"
            defaultValue="Novacorp Industries"
          />
        </div>

        {/* Email */}
        <div className="mb-4">
          <label className="text-sm text-gray-600">
            Email
          </label>

          <input
            className="w-full mt-1 border rounded-lg px-3 py-2"
            defaultValue="alex.sterling@novacorp.com"
          />
        </div>

        {/* Button */}
        <button className="bg-gray-900 text-white px-4 py-2 rounded-lg">
          Save Changes
        </button>

      </div>

    </PageLayout>
  );
}
