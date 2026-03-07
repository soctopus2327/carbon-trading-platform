import { useEffect, useState } from "react";
import axios from "axios";
import PageLayout from "../components/layout/PageLayout";

interface Transaction {
  _id: string;
  credits: number;
  totalAmount: number;
  pricePerCredit: number;
  createdAt: string;
  buyerCompany: {
    _id: string;
    name: string;
  };
  sellerCompany: {
    _id: string;
    name: string;
  };
}

export default function Holdings({ onLogout }: { onLogout?: () => void }) {
  const [buyHistory, setBuyHistory] = useState<Transaction[]>([]);
  const [sellHistory, setSellHistory] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState({
    currentCredits: 0,
    totalInvested: 0,
    totalGained: 0,
  });
  const [loading, setLoading] = useState(false);

  const user =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || "{}")
      : null;

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);

      const res = await axios.get<Transaction[]>(
        "http://localhost:5000/transactions/my-transactions",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const txs = res.data;

      let totalBoughtCredits = 0;
      let totalSoldCredits = 0;
      let totalInvested = 0;
      let totalGained = 0;

      const buys: Transaction[] = [];
      const sells: Transaction[] = [];

      txs.forEach((tx) => {
        const isBuyer = tx.buyerCompany._id === user?.company;
        const isSeller = tx.sellerCompany._id === user?.company;

        if (isBuyer) {
          totalBoughtCredits += tx.credits;
          totalInvested += tx.totalAmount;
          buys.push(tx);
        }

        if (isSeller) {
          totalSoldCredits += tx.credits;
          totalGained += tx.totalAmount;
          sells.push(tx);
        }
      });

      setSummary({
        currentCredits: totalBoughtCredits - totalSoldCredits,
        totalInvested,
        totalGained,
      });

      setBuyHistory(buys);
      setSellHistory(sells);
    } catch (err) {
      console.error("Error fetching transactions", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout
      title="Holdings"
      description="Your portfolio and transaction history"
    >
      {/* ================= PORTFOLIO SUMMARY ================= */}
      <div className="bg-white rounded-xl shadow-md border p-6 mb-8">
        <h2 className="text-2xl font-bold mb-6">Portfolio Overview</h2>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600">Available Credits</p>
              <p className="text-3xl font-bold text-green-600">
                {summary.currentCredits} 
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600">
                Money Invested (Buying)
              </p>
              <p className="text-3xl font-bold">
                ${summary.totalInvested.toFixed(2)}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600">
                Money Gained (Selling)
              </p>
              <p className="text-3xl font-bold text-blue-600">
                ${summary.totalGained.toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ================= BUY & SELL SIDE BY SIDE ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* BUY HISTORY */}
        <div className="bg-white rounded-xl shadow-md border p-6">
          <h2 className="text-xl font-bold mb-4 text-green-700">
            Buy History
          </h2>

          {buyHistory.length === 0 ? (
            <p className="text-gray-500">No buy transactions yet.</p>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-green-50 border-b-2 border-green-200 text-gray-700 sticky top-0">
                  <tr>
                    <th className="p-4 text-left font-bold">Date</th>
                    <th className="text-left font-bold">From</th>
                    <th className="text-center font-bold">Credits</th>
                    <th className="text-center font-bold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {buyHistory.map((tx) => (
                    <tr key={tx._id} className="hover:bg-green-50 transition">
                      <td className="p-4">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                      <td>{tx.sellerCompany.name}</td>
                      <td className="text-center text-green-600 font-semibold">
                        +{tx.credits} 
                      </td>
                      <td className="text-center font-semibold">
                        ${tx.totalAmount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* SELL HISTORY */}
        <div className="bg-white rounded-xl shadow-md border p-6">
          <h2 className="text-xl font-bold mb-4 text-blue-700">
            Sell History
          </h2>

          {sellHistory.length === 0 ? (
            <p className="text-gray-500">No sell transactions yet.</p>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-blue-50 border-b-2 border-blue-200 text-gray-700 sticky top-0">
                  <tr>
                    <th className="p-4 text-left font-bold">Date</th>
                    <th className="text-left font-bold">To</th>
                    <th className="text-center font-bold">Credits</th>
                    <th className="text-center font-bold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sellHistory.map((tx) => (
                    <tr key={tx._id} className="hover:bg-blue-50 transition">
                      <td className="p-4">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                      <td>{tx.buyerCompany.name}</td>
                      <td className="text-center text-blue-600 font-semibold">
                        -{tx.credits} 
                      </td>
                      <td className="text-center font-semibold text-blue-600">
                        ${tx.totalAmount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </PageLayout>
  );
}