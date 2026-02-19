import PageLayout from "../components/layout/PageLayout";

export default function Reports() {

  return (

    <PageLayout
      title="Reports"
      description=""
    >

      <div className="bg-white border rounded-xl h-[400px] flex items-center justify-center">

        <div className="text-center">


          {/* Icon */}

          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">

            📊

          </div>


          {/* Title */}

          <h2 className="font-semibold text-lg mb-2">

            Detailed Reports

          </h2>


          {/* Description */}

          <p className="text-gray-500 max-w-md">

            Compliance and audit reports are generated monthly.
            Check back on the 1st of next month.

          </p>


        </div>

      </div>


    </PageLayout>

  );

}
