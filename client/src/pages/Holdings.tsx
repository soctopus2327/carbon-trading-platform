import PageLayout from "../components/layout/PageLayout";

export default function Holdings({ onLogout }) {

  const portfolio = [
    {
      name: "Amazon Rainforest",
      change: "+5.1% this week",
      type: "Forestry",
      volume: "2,500 t",
      avgCost: "$13.80",
      value: "$14.50",
    },
    {
      name: "Gujarat Solar",
      change: "-2.9% this week",
      type: "Renewable",
      volume: "10,000 t",
      avgCost: "$8.50",
      value: "$8.25",
    },
  ];


  const transactions = [
    {
      date: "2024-05-20",
      status: "Completed",
      project: "Amazon Rainforest",
      amount: "1000 t",
      action: "Buy",
    },
    {
      date: "2024-05-18",
      status: "Completed",
      project: "Gujarat Solar",
      amount: "500 t",
      action: "Retire",
    },
    {
      date: "2024-05-15",
      status: "Pending",
      project: "Direct Air Capture",
      amount: "200 t",
      action: "Buy",
    },
  ];


  return (

    <PageLayout
      title="Assets"
      description="Manage your portfolio and track retirements."
    >


      {/* Portfolio Card */}

      <div className="bg-white rounded-xl shadow-md border border-gray-100 mb-8">


        <div className="flex justify-between p-6 border-b border-gray-100">

          <div>

            <h2 className="font-bold text-2xl text-gray-900">
              Portfolio
            </h2>

            <p className="text-sm text-gray-600 mt-1">
              4 active projects
            </p>

          </div>


          <div className="text-right">

            <p className="text-xs text-gray-600 font-semibold">
              TOTAL VALUE
            </p>

            <p className="text-3xl font-bold text-green-600">
              $118,750.00
            </p>

          </div>

        </div>



        <table className="w-full text-sm">

          <thead className="text-gray-700 bg-gray-50 border-b-2 border-gray-200">

            <tr>

              <th className="text-left p-4 font-bold">PROJECT NAME</th>
              <th className="text-left font-bold">TYPE</th>
              <th className="text-center font-bold">VOLUME</th>
              <th className="text-center font-bold">AVG COST</th>
              <th className="text-center font-bold">VALUE</th>
              <th className="text-center font-bold">ACTIONS</th>

            </tr>

          </thead>


          <tbody className="divide-y divide-gray-200">

            {portfolio.map((item, i) => (

              <tr key={i} className="hover:bg-green-50 transition">

                <td className="p-4">

                  <div className="font-semibold text-gray-900">
                    {item.name}
                  </div>

                  <div className="text-green-600 text-xs font-medium mt-1">
                    {item.change}
                  </div>

                </td>


                <td>

                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">

                    {item.type}

                  </span>

                </td>


                <td className="text-center text-gray-700">
                  {item.volume}
                </td>


                <td className="text-center text-gray-700">
                  {item.avgCost}
                </td>


                <td className="text-center font-bold text-green-600">
                  {item.value}
                </td>


                <td className="text-center space-x-2">
                  <button className="hover:text-red-600 transition text-lg">Remove</button>
                  <button className="hover:text-blue-600 transition text-lg">Download</button>
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>



      {/* Transactions */}


      <div className="bg-white rounded-xl shadow-md border border-gray-100 mt-8">


        <div className="flex justify-between p-6 border-b border-gray-100">

          <h2 className="font-bold text-lg text-gray-900">
            Recent Transactions
          </h2>

          <button className="text-green-600 font-semibold hover:text-green-700 text-sm transition">
            View All →
          </button>

        </div>



        <table className="w-full text-sm">


          <thead className="text-gray-700 bg-gray-50 border-b-2 border-gray-200">

            <tr>

              <th className="p-4 text-left font-bold">DATE & ID</th>

              <th className="font-bold">STATUS</th>

              <th className="font-bold">PROJECT</th>

              <th className="text-center font-bold">AMOUNT</th>

              <th className="text-center font-bold">ACTION</th>

            </tr>

          </thead>



          <tbody className="divide-y divide-gray-200">

            {transactions.map((tx, i) => (

              <tr key={i} className="hover:bg-green-50 transition">

                <td className="p-4 font-medium text-gray-900">
                  {tx.date}
                </td>


                <td className={`font-semibold ${
                  tx.status === "Completed"
                      ? "text-green-600"
                      : "text-yellow-600"}`}>

                  {tx.status}

                </td>


                <td className="text-gray-700">
                  {tx.project}
                </td>


                <td className="text-center font-semibold text-gray-900">
                  {tx.amount}
                </td>


                <td className={`text-center font-bold ${
                  tx.action === "Buy"
                      ? "text-green-600"
                      : tx.action === "Retire" ? "text-blue-600" : "text-orange-600"}`}>

                  {tx.action}

                </td>


              </tr>

            ))}

          </tbody>


        </table>


      </div>



    </PageLayout>

  );

}
