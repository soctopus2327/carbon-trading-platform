import { useEffect, useState } from "react";
import axios from "axios";
import PageLayout from "../components/layout/PageLayout";

interface MarketplaceProps {}

export default function Marketplace({ }: MarketplaceProps) {
  const [activeTab, setActiveTab] = useState("buy");
  const [trades, setTrades] = useState<any[]>([]);
  const [myTrades, setMyTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    pricePerCredit: "",
    quantity: ""
  });

  const [form, setForm] = useState({
    pricePerCredit: "",
    quantity: ""
  });

  const [user, setUser] = useState<any>(() => {
    if (typeof window !== "undefined") {
      return JSON.parse(localStorage.getItem("user") || "{}");
    }
    return {};
  });

  const [buyingTrade, setBuyingTrade] = useState<any>(null);
  const [buyQuantity, setBuyQuantity] = useState("");
  const [useDiscount, setUseDiscount] = useState(false);

  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:5000/trade");
      setTrades(res.data || []);

      if (user?.company) {
        const mine = res.data.filter((t: any) => t.sellerCompany?._id === user.company);
        setMyTrades(mine);
      }

    } catch (err) {
      console.error("Error fetching trades", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const addTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:5000/trade",
        {
          pricePerCredit: Number(form.pricePerCredit),
          quantity: Number(form.quantity)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data) {
        alert("Trade added successfully!");
        setForm({ pricePerCredit: "", quantity: "" });
        fetchTrades();
      }
    } catch (err: any) {
      console.error("Error adding trade", err);
      alert(err.response?.data?.error || "Failed to add trade");
    }
  };

  const deleteTrade = async (id: string) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5000/trade/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Trade deleted successfully!");
      fetchTrades();
    } catch (err: any) {
      console.error("Error deleting trade", err);
      alert(err.response?.data?.error || "Failed to delete trade");
    }
  };

  const startEdit = (trade: any) => {
    setEditingId(trade._id);
    setEditForm({
      pricePerCredit: trade.pricePerCredit.toString(),
      quantity: trade.quantity.toString()
    });
  };

  const updateTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `http://localhost:5000/trade/${editingId}`,
        {
          pricePerCredit: Number(editForm.pricePerCredit),
          quantity: Number(editForm.quantity)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data) {
        alert("Trade updated successfully!");
        setEditingId(null);
        setEditForm({ pricePerCredit: "", quantity: "" });
        fetchTrades();
      }
    } catch (err: any) {
      console.error("Error updating trade", err);
      alert(err.response?.data?.error || "Failed to update trade");
    }
  };

  const executePurchase = async () => {
    if (!buyQuantity || Number(buyQuantity) <= 0) {
      alert("Enter a valid quantity");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:5000/transactions/execute",
        { tradeId: buyingTrade._id, quantity: Number(buyQuantity), useDiscount },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { transaction, discountApplied, coinsEarned } = response.data;

      alert("Purchase successful!");

      // Update local user coins and points
      const updatedCoins = (user.coins || 0) - (useDiscount ? 100 : 0) + coinsEarned;
      const updatedPoints = (user.points || 0) + Number(buyQuantity);
      const updatedUser = { ...user, coins: updatedCoins, points: updatedPoints };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      // Reset modal
      setBuyingTrade(null);
      setBuyQuantity("");
      setUseDiscount(false);

      fetchTrades();

    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Transaction failed";
      alert(errorMessage);
    }
  };

  return (
    <PageLayout title="Marketplace" description="Buy or Sell carbon credits easily.">
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab("buy")}
            className={`px-6 py-3 rounded-lg font-semibold transition ${activeTab === "buy"
              ? "bg-green-600 text-white shadow-lg"
              : "bg-white text-gray-700 border-2 border-gray-200 hover:border-green-300"
              }`}
          >
            Buy Credits
          </button>

          <button
            onClick={() => setActiveTab("sell")}
            className={`px-6 py-3 rounded-lg font-semibold transition ${activeTab === "sell"
              ? "bg-green-600 text-white shadow-lg"
              : "bg-white text-gray-700 border-2 border-gray-200 hover:border-green-300"
              }`}
          >
            Sell Credits
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading trades...</p>
          </div>
        )}

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
                      ₹{trade.pricePerCredit}/credit
                    </p>

                    <p className="text-gray-600 mb-4">
                      {trade.remainingQuantity ?? trade.quantity} credits available
                    </p>

                    <button
                      onClick={() => setBuyingTrade(trade)}
                      className="w-full bg-green-600 text-white py-2 rounded-lg"
                    >
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
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Add New Trade</h2>

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
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Your Active Trades</h2>
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
                      {editingId === trade._id ? (
                        <form onSubmit={updateTrade} className="space-y-4">
                          <div>
                            <label className="text-sm font-semibold text-gray-700">Price Per Credit</label>
                            <input
                              type="number"
                              value={editForm.pricePerCredit}
                              onChange={(e) => setEditForm({ ...editForm, pricePerCredit: e.target.value })}
                              className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-green-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-sm font-semibold text-gray-700">Quantity</label>
                            <input
                              type="number"
                              value={editForm.quantity}
                              onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                              className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-green-500"
                              required
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-semibold text-sm"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="flex-1 bg-gray-400 text-white py-2 rounded-lg hover:bg-gray-500 transition font-semibold text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <h3 className="text-2xl font-bold text-green-600 mb-1">
                            ₹{trade.pricePerCredit}/credit
                          </h3>

                          <p className="text-gray-600 mb-4">
                            {trade.remainingQuantity || trade.quantity} credits available
                          </p>

                          <div className="flex gap-2">
                            <button
                              onClick={() => startEdit(trade)}
                              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-semibold text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteTrade(trade._id)}
                              className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition font-semibold text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* BUY MODAL */}
      {buyingTrade && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-lg font-bold mb-4">Buy from {buyingTrade.sellerCompany?.name}</h2>

            <p className="text-sm text-gray-600 mb-2">Your Coins: {user?.coins ?? 0}</p>

            <input
              type="number"
              placeholder="Enter quantity"
              value={buyQuantity}
              onChange={(e) => setBuyQuantity(e.target.value)}
              className="w-full border p-2 rounded mb-2"
            />

            {/* Show discount only if coins >= 100 */}
            {user?.coins >= 100 && (
              <label className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  checked={useDiscount}
                  onChange={(e) => setUseDiscount(e.target.checked)}
                />
                <span className="text-sm text-gray-700">Use 100 coins for ₹1000 discount</span>
              </label>
            )}

            <p className="mb-4 font-semibold">
              Total: ₹
              {Math.max(
                buyingTrade.pricePerCredit * Number(buyQuantity) - (useDiscount ? 1000 : 0),
                0
              )}
            </p>

            <div className="flex gap-2">
              <button
                onClick={executePurchase}
                className="flex-1 bg-green-600 text-white py-2 rounded"
              >
                Confirm
              </button>

              <button
                onClick={() => setBuyingTrade(null)}
                className="flex-1 bg-gray-400 text-white py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}