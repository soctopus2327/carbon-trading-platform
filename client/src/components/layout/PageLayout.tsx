export default function PageLayout({

  title,
  description,
  children,
  onLogout,
  compact = false,

}: {

  title: string;
  description?: string;
  children: React.ReactNode;
  onLogout?: () => void;
  compact?: boolean;

}) {

  return (

    <main className="flex-1 bg-gray-50 h-screen flex flex-col min-h-0">


      {/* Page Heading */}

      <div
        className={`px-6 flex justify-between items-center border-b border-gray-200 bg-white ${
          compact ? "py-5" : "py-8"
        }`}
      >

        <div>

          <h1 className="text-3xl font-bold text-gray-900">

            {title}

          </h1>

          {description && (

            <p className="text-gray-600 text-sm mt-2">

              {description}

            </p>

          )}

        </div>


        <button className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2 rounded-lg shadow-md hover:shadow-lg hover:from-green-600 hover:to-green-700 transition font-semibold">

          Alliance Funds

        </button>

      </div>


      {/* Page Content */}

      <div className={`px-6 ${compact ? "py-5" : "py-8"} flex-1 overflow-y-auto min-h-0`}>

        {children}

      </div>


    </main>

  );

}
