import PageLayout from "../components/layout/PageLayout";

type ReportsProps = {
  onLogout?: () => void;
};

export default function Reports({ onLogout: _onLogout }: ReportsProps) {
  return (
    <PageLayout title="Reports" description="View compliance and audit reports">
      <div className="bg-white border border-gray-100 rounded-xl h-[500px] flex items-center justify-center shadow-md">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-green-700">
            R
          </div>

          <h2 className="font-bold text-2xl mb-3 text-gray-900">Detailed Reports</h2>

          <p className="text-gray-600 max-w-md text-lg">
            Compliance and audit reports are generated monthly.
            <br />
            <span className="font-semibold text-green-600">Check back on the 1st of next month.</span>
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
