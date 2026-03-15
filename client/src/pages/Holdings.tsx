import { useEffect, useState } from "react";
import axios from "axios";
import PageLayout from "../components/layout/PageLayout";
import { Network, DataSet } from "vis-network/standalone";

interface Transaction {
  _id: string;
  credits: number;
  totalAmount: number;
  discountApplied?: number;
  createdAt: string;
  buyerCompany: { _id: string; name: string };
  sellerCompany: { _id: string; name: string };
}

export default function Holdings({ onLogout: _onLogout }: { onLogout?: () => void }) {
  const [buyHistory, setBuyHistory] = useState<Transaction[]>([]);
  const [sellHistory, setSellHistory] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState({
    currentCredits: 0,
    totalInvested: 0,
    totalGained: 0,
    totalCoins: 0,
  });
  const [loading, setLoading] = useState(false);
  const [totalCredits, setTotalCredits] = useState(0); // NEW

  const user =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || "{}")
      : null;

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

  const fetchTotalCredits = async () => {
  try {
    const token = localStorage.getItem("token");
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    const companyId = userData.company;

    const res = await axios.get(`http://localhost:5000/company/${companyId}/credits`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    setTotalCredits(res.data.carbonCredits); // save total credits
  } catch (err) {
    console.error("Error fetching total credits", err);
  }
};

  useEffect(() => {
    fetchTransactions();
    fetchTotalCredits();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await axios.get<Transaction[]>(
        "http://localhost:5000/transactions/my-transactions",
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const txs = res.data;
      let totalBought = 0,
        totalSold = 0,
        invested = 0,
        gained = 0;
      const buys: Transaction[] = [],
        sells: Transaction[] = [];

      txs.forEach((tx) => {
        const isBuyer = tx.buyerCompany._id === user?.company;
        const isSeller = tx.sellerCompany._id === user?.company;

        if (isBuyer) {
          totalBought += tx.credits;
          invested += Math.max(0, tx.totalAmount - (tx.discountApplied || 0));
          buys.push(tx);
        }
        if (isSeller) {
          totalSold += tx.credits;
          gained += tx.totalAmount;
          sells.push(tx);
        }
      });

      setSummary({
        currentCredits: totalBought - totalSold,
        totalInvested: invested,
        totalGained: gained,
        totalCoins: user?.points ?? user?.coins ?? 0,
      });

      setBuyHistory(buys);
      setSellHistory(sells);
    } catch (err) {
      console.error("Error fetching transactions", err);
    } finally {
      setLoading(false);
    }
  };

  // ================= GRAPH =================
  useEffect(() => {
    if (!buyHistory.length && !sellHistory.length) return;

    const nodes = new DataSet<any>();
    const edges = new DataSet<any>();
    const companies = new Set<string>();

    const myCompanyName = user?.companyName || "You";
    companies.add(myCompanyName);

    buyHistory.forEach((tx) => companies.add(tx.sellerCompany.name));
    sellHistory.forEach((tx) => companies.add(tx.buyerCompany.name));

    const companyIdMap: { [key: string]: number } = {};
    Array.from(companies).forEach((name, i) => {
      nodes.add({
        id: i,
        label: name,
        shape: "ellipse",
        color: { background: name === myCompanyName ? "#ffd966" : "#a6cee3", border: "#555" },
        font: { color: "#000", bold: true },
      });
      companyIdMap[name] = i;
    });

    const edgeMap: { [key: string]: { from: number; to: number; credits: number; color: string } } = {};

    buyHistory.forEach((tx) => {
      const key = `${tx.sellerCompany.name}->${myCompanyName}`;
      if (!edgeMap[key]) {
        edgeMap[key] = {
          from: companyIdMap[tx.sellerCompany.name],
          to: companyIdMap[myCompanyName],
          credits: tx.credits,
          color: "#4daf4a",
        };
      } else {
        edgeMap[key].credits += tx.credits;
      }
    });

    sellHistory.forEach((tx) => {
      const key = `${myCompanyName}->${tx.buyerCompany.name}`;
      if (!edgeMap[key]) {
        edgeMap[key] = {
          from: companyIdMap[myCompanyName],
          to: companyIdMap[tx.buyerCompany.name],
          credits: tx.credits,
          color: "#377eb8",
        };
      } else {
        edgeMap[key].credits += tx.credits;
      }
    });

    Object.values(edgeMap).forEach((e) =>
      edges.add({
        from: e.from,
        to: e.to,
        label: `${e.credits} cr`,
        arrows: "to",
        smooth: { type: "curvedCW", roundness: 0.3 },
        color: e.color,
        font: { align: "middle" },
      })
    );

    const container = document.getElementById("transaction-graph");
    if (container) {
      const data = { nodes, edges };
      const options = {
        physics: { enabled: true, stabilization: true, barnesHut: { springLength: 200, avoidOverlap: 0.5 } },
        edges: { smooth: true },
        nodes: { shape: "ellipse", margin: { top: 10, right: 10, bottom: 10, left: 10 } },
        interaction: { hover: true, tooltipDelay: 200, dragView: true, zoomView: true },
      };
      new Network(container, data, options);
    }
  }, [buyHistory, sellHistory, user?.companyName]);

  return (
    <PageLayout title="Holdings" description="Your portfolio and transaction history">
      {/* Portfolio Summary */}
      <div className="bg-white rounded-xl shadow-md border p-6 mb-8">
        <h2 className="text-2xl font-bold mb-6">Portfolio Overview</h2>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600">Available Credits</p>
              <p className="text-3xl font-bold text-green-600">{totalCredits}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Money Invested (Buying)</p>
              <p className="text-3xl font-bold">₹{summary.totalInvested.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Money Gained (Selling)</p>
              <p className="text-3xl font-bold text-blue-600">₹{summary.totalGained.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Coins</p>
              <p className="text-3xl font-bold text-yellow-600">{summary.totalCoins}</p>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Graph */}
      <div className="bg-white rounded-xl shadow-md border p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Transaction Graph</h2>
        <div id="transaction-graph" style={{ height: "500px" }}></div>
        <p className="text-sm text-gray-500 mt-2">
          Yellow = your company, Green edges = bought credits, Blue edges = sold credits. Edge labels show total credits per company pair.
        </p>
      </div>

      {/* Buy & Sell Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Buy History */}
        <div className="bg-white rounded-xl shadow-md border p-6">
          <h2 className="text-xl font-bold mb-4 text-green-700">Buy History</h2>
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
                    <th className="text-center font-bold">Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {buyHistory.map((tx) => (
                    <tr key={tx._id} className="hover:bg-green-50 transition">
                      <td className="p-4">{new Date(tx.createdAt).toLocaleDateString()}</td>
                      <td>{tx.sellerCompany.name}</td>
                      <td className="text-center text-green-600 font-semibold">+{tx.credits}</td>
                      <td className="text-center font-semibold">
  ₹{Math.max(0, tx.totalAmount - (tx.discountApplied || 0)).toFixed(2)}
  {tx.discountApplied ? ` + 100 coins` : ""}
</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sell History */}
        <div className="bg-white rounded-xl shadow-md border p-6">
          <h2 className="text-xl font-bold mb-4 text-blue-700">Sell History</h2>
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
                    <th className="text-center font-bold">Amount Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sellHistory.map((tx) => (
                    <tr key={tx._id} className="hover:bg-blue-50 transition">
                      <td className="p-4">{new Date(tx.createdAt).toLocaleDateString()}</td>
                      <td>{tx.buyerCompany.name}</td>
                      <td className="text-center text-blue-600 font-semibold">-{tx.credits}</td>
                      <td className="text-center font-semibold text-blue-600">
                        ₹{tx.totalAmount.toFixed(2)}
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
