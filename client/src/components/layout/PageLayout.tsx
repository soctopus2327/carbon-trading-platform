import Header from "./Header";

export default function PageLayout({

  title,
  description,
  children,

}: {

  title: string;
  description?: string;
  children: React.ReactNode;

}) {

  return (

    <main className="flex-1 bg-gray-50 min-h-screen">


      {/* Global Header */}

      <Header />


      {/* Page Heading */}

      <div className="px-6 py-6 flex justify-between items-center">

        <div>

          <h1 className="text-2xl font-semibold">

            {title}

          </h1>

          {description && (

            <p className="text-gray-500 text-sm mt-1">

              {description}

            </p>

          )}

        </div>


        <button className="bg-purple-600 text-white px-5 py-2 rounded-lg shadow">

          Alliance Funds

        </button>

      </div>


      {/* Page Content */}

      <div className="px-6 pb-6">

        {children}

      </div>


    </main>

  );

}
