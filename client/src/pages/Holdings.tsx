import PageLayout from "../components/layout/PageLayout";

export default function Holdings() {

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

      <div className="bg-white rounded-xl shadow mb-6">


        <div className="flex justify-between p-6 border-b">

          <div>

            <h2 className="font-semibold text-lg">
              Portfolio
            </h2>

            <p className="text-sm text-gray-500">
              4 active projects
            </p>

          </div>


          <div className="text-right">

            <p className="text-xs text-gray-500">
              TOTAL VALUE
            </p>

            <p className="text-xl font-bold">
              $118,750.00
            </p>

          </div>

        </div>



        <table className="w-full text-sm">

          <thead className="text-gray-500">

            <tr className="border-b">

              <th className="text-left p-4">PROJECT NAME</th>
              <th className="text-left">TYPE</th>
              <th>VOLUME</th>
              <th>AVG COST</th>
              <th>VALUE</th>
              <th>ACTIONS</th>

            </tr>

          </thead>


          <tbody>

            {portfolio.map((item, i) => (

              <tr key={i} className="border-b">

                <td className="p-4">

                  <div className="font-medium">
                    {item.name}
                  </div>

                  <div className="text-green-600 text-xs">
                    {item.change}
                  </div>

                </td>


                <td>

                  <span className="bg-gray-100 px-3 py-1 rounded-full text-xs">

                    {item.type}

                  </span>

                </td>


                <td className="text-center">
                  {item.volume}
                </td>


                <td className="text-center">
                  {item.avgCost}
                </td>


                <td className="text-center font-semibold">
                  {item.value}
                </td>


                <td className="text-center">
                  🗑️ ⬇️
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>



      {/* Transactions */}


      <div className="bg-white rounded-xl shadow">


        <div className="flex justify-between p-6 border-b">

          <h2 className="font-semibold">
            Recent Transactions
          </h2>

          <button className="text-green-600 text-sm">
            View All
          </button>

        </div>



        <table className="w-full text-sm">


          <thead className="text-gray-500">

            <tr className="border-b">

              <th className="p-4 text-left">DATE & ID</th>

              <th>STATUS</th>

              <th>PROJECT</th>

              <th>AMOUNT</th>

              <th>CONTEXT</th>

            </tr>

          </thead>



          <tbody>

            {transactions.map((tx, i) => (

              <tr key={i} className="border-b">

                <td className="p-4">
                  {tx.date}
                </td>


                <td className={`
                  ${tx.status === "Completed"
                      ? "text-green-600"
                      : "text-yellow-600"}
                `}>

                  {tx.status}

                </td>


                <td>
                  {tx.project}
                </td>


                <td className="text-center">
                  {tx.amount}
                </td>


                <td className={`
                  ${tx.action === "Buy"
                      ? "text-green-600"
                      : "text-orange-500"}
                `}>

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
