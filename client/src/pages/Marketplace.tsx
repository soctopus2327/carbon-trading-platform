import { useEffect, useState } from "react";
import axios from "axios";
import PageLayout from "../components/layout/PageLayout";

export default function Marketplace({ onLogout }) {

  const [activeTab, setActiveTab] = useState("buy");
  const [trades, setTrades] = useState([]);
  const [myTrades, setMyTrades] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    pricePerCredit: "",
    quantity: ""
  });

  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:5000/trade");

      setTrades(res.data || []);

      if (user?.company) {
        const mine = res.data.filter(
          (t) => t.sellerCompany?._id === user.company
        );
        setMyTrades(mine);
      }

    } catch (err) {
      console.error("Error fetching trades", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const addTrade = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      
      const response = await axios.post("http://localhost:5000/trade", {
        pricePerCredit: Number(form.pricePerCredit),
        quantity: Number(form.quantity)
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data) {
        alert("Trade added successfully!");
        setForm({ pricePerCredit: "", quantity: "" });
        fetchTrades();
      }

    } catch (err) {
      console.error("Error adding trade", err);
      alert(err.response?.data?.error || "Failed to add trade");
    }
  };

  const deleteTrade = async (id) => {
    try {
      const token = localStorage.getItem("token");
      
      await axios.delete(`http://localhost:5000/trade/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      alert("Trade deleted successfully!");
      fetchTrades();
    } catch (err) {
      console.error("Error deleting trade", err);
      alert(err.response?.data?.error || "Failed to delete trade");
    }
  };

  return (
    <PageLayout
      title="Marketplace"
      description="Buy or Sell carbon credits easily."
    >

      <div className="space-y-6">

        {/* Tabs */}
        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab("buy")}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === "buy"
                ? "bg-green-600 text-white shadow-lg"
                : "bg-white text-gray-700 border-2 border-gray-200 hover:border-green-300"
            }`}
          >
            Buy Credits
          </button>

          <button
            onClick={() => setActiveTab("sell")}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === "sell"
                ? "bg-green-600 text-white shadow-lg"
                : "bg-white text-gray-700 border-2 border-gray-200 hover:border-green-300"
            }`}
          >
            Sell Credits
          </button>
        </div>

        {/* Loading */}
        {loading && <div className="text-center py-8"><p className="text-gray-500">Loading trades...</p></div>}

        {/* BUY SECTION */}
        {activeTab === "buy" && !loading && (
          <>
            {trades.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-gray-300">
                <p className="text-gray-500 text-lg">No trades available yet.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-6">
                {trades.map((trade) => (
                  <div
                    key={trade._id}
                    className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition border border-gray-100"
                  >
                    <div className="text-sm font-semibold text-green-600 mb-2 bg-green-50 px-3 py-1 rounded-full inline-block">
                      {trade.status || "Active"}
                    </div>

                    <h3 className="font-bold text-lg mb-2 text-gray-900">
                      {trade.sellerCompany?.name || "Company"}
                    </h3>

                    <p className="text-2xl font-bold text-green-600 mb-1">
                      ₹{trade.pricePerCredit}
                    </p>

                    <p className="text-gray-600 mb-4">
                      {trade.remainingQuantity || trade.quantity} credits available
                    </p>

                    <button className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-semibold">
                      Buy Credits
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* SELL SECTION */}
        {activeTab === "sell" && !loading && (
          <>
            {/* Add Trade */}
            <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100 mb-8 max-w-2xl">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">
                Add New Trade
              </h2>

              <form onSubmit={addTrade} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price Per Credit (₹)
                    </label>
                    <input
                      type="number"
                      name="pricePerCredit"
                      placeholder="Enter price"
                      value={form.pricePerCredit}
                      onChange={handleChange}
                      required
                      className="w-full border-2 border-gray-200 px-4 py-2 rounded-lg focus:outline-none focus:border-green-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity (Credits)
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      placeholder="Enter quantity"
                      value={form.quantity}
                      onChange={handleChange}
                      required
                      className="w-full border-2 border-gray-200 px-4 py-2 rounded-lg focus:outline-none focus:border-green-500 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition font-semibold shadow-md"
                >
                  Create Trade
                </button>
              </form>
            </div>

            {/* My Trades */}
            <div>
              <h2 className="text-2xl font-bold mb-6 text-gray-900">
                Your Active Trades
              </h2>
              {myTrades.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-gray-300">
                  <p className="text-gray-500 text-lg">You haven't added any trades yet.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-6">
                  {myTrades.map((trade) => (
                    <div
                      key={trade._id}
                      className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition"
                    >
                      <h3 className="text-2xl font-bold text-green-600 mb-1">
                        ₹{trade.pricePerCredit}
                      </h3>

                      <p className="text-gray-600 mb-4">
                        {trade.remainingQuantity || trade.quantity} credits available
                      </p>

                      <button
                        onClick={() => deleteTrade(trade._id)}
                        className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </PageLayout>
  );
}