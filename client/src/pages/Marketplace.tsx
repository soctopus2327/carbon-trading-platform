import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import PageLayout from "../components/layout/PageLayout";

type Trade = {
  _id: string;
  pricePerCredit: number;
  quantity: number;
  remainingQuantity?: number;
  status?: string;
  sellerCompany?: {
    _id?: string;
    name?: string;
  };
};

type UserShape = {
  company?: string;
  coins?: number;
  points?: number;
};

export default function Marketplace() {
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [myTrades, setMyTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    pricePerCredit: "",
    quantity: "",
  });

  const [form, setForm] = useState({
    pricePerCredit: "",
    quantity: "",
  });

  const [user, setUser] = useState<UserShape>(() => {
    if (typeof window !== "undefined") {
      return JSON.parse(localStorage.getItem("user") || "{}");
    }
    return {};
  });

  const [buyingTrade, setBuyingTrade] = useState<Trade | null>(null);
  const [buyQuantity, setBuyQuantity] = useState("");
  const [useDiscount, setUseDiscount] = useState(false);
  const coinsBalance = user?.points ?? user?.coins ?? 0;

  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:5000/trade", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const allTrades = Array.isArray(res.data) ? res.data : [];
      setTrades(allTrades);

      if (user?.company) {
        const mine = allTrades.filter((trade: Trade) => trade.sellerCompany?._id === user.company);
        setMyTrades(mine);
      } else {
        setMyTrades([]);
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
          quantity: Number(form.quantity),
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
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Trade deleted successfully!");
      fetchTrades();
    } catch (err: any) {
      console.error("Error deleting trade", err);
      alert(err.response?.data?.error || "Failed to delete trade");
    }
  };

  const startEdit = (trade: Trade) => {
    setEditingId(trade._id);
    setEditForm({
      pricePerCredit: String(trade.pricePerCredit),
      quantity: String(trade.quantity),
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
          quantity: Number(editForm.quantity),
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
    if (!buyingTrade) return;

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

      const { coinsEarned } = response.data;

      alert("Purchase successful!");

      const updatedPoints = coinsBalance - (useDiscount ? 100 : 0) + coinsEarned;
      const updatedUser = { ...user, points: updatedPoints, coins: updatedPoints };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      setBuyingTrade(null);
      setBuyQuantity("");
      setUseDiscount(false);

      fetchTrades();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || "Transaction failed";
      alert(errorMessage);
    }
  };

  const summary = useMemo(() => {
    const availableListings = trades.filter((trade) => (trade.remainingQuantity ?? trade.quantity) > 0).length;
    const myCreditsListed = myTrades.reduce((sum, trade) => sum + (trade.remainingQuantity ?? trade.quantity), 0);

    return {
      availableListings,
      myListings: myTrades.length,
      myCreditsListed,
      myCoins: coinsBalance,
    };
  }, [trades, myTrades, coinsBalance]);

  return (
    <PageLayout title="Marketplace" description="Trade carbon credits with live listings and controlled execution." compact>
      <div className="space-y-5 h-full">
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard label="Open Listings" value={String(summary.availableListings)} />
          <MetricCard label="My Listings" value={String(summary.myListings)} />
          <MetricCard label="Credits Listed" value={String(summary.myCreditsListed)} />
          <MetricCard label="My Coins" value={String(summary.myCoins)} />
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-2 inline-flex gap-2 shadow-sm">
          <TabButton label="Buy Credits" active={activeTab === "buy"} onClick={() => setActiveTab("buy")} />
          <TabButton label="Sell Credits" active={activeTab === "sell"} onClick={() => setActiveTab("sell")} />
        </section>

        {loading && (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-500">Loading marketplace...</div>
        )}

        {activeTab === "buy" && !loading && (
          <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-end justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Available Listings</h2>
                <p className="text-sm text-gray-600">Select a listing and execute a credit purchase.</p>
              </div>
            </div>

            {trades.length === 0 ? (
              <EmptyBlock text="No trades available yet." />
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {trades.map((trade) => {
                  const available = trade.remainingQuantity ?? trade.quantity;
                  return (
                    <article key={trade._id} className="rounded-xl border border-gray-200 p-4 hover:shadow-md transition bg-gradient-to-b from-white to-emerald-50/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                          {trade.status || "ACTIVE"}
                        </span>
                        <span className="text-xs text-gray-500">#{trade._id.slice(-6)}</span>
                      </div>

                      <h3 className="font-semibold text-gray-900">{trade.sellerCompany?.name || "Company"}</h3>
                      <p className="text-2xl font-bold text-emerald-700 mt-2">INR {trade.pricePerCredit}/credit</p>
                      <p className="text-sm text-gray-600 mt-1">{available} credits available</p>

                      <button
                        onClick={() => setBuyingTrade(trade)}
                        className="mt-4 w-full bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 transition font-semibold text-sm"
                      >
                        Buy Credits
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === "sell" && !loading && (
          <section className="grid xl:grid-cols-[1fr_1.6fr] gap-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Create Listing</h2>

              <form onSubmit={addTrade} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Price Per Credit (INR)</label>
                  <input
                    type="number"
                    name="pricePerCredit"
                    value={form.pricePerCredit}
                    onChange={handleChange}
                    placeholder="Enter price"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    value={form.quantity}
                    onChange={handleChange}
                    placeholder="Enter quantity"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>

                <button type="submit" className="w-full bg-emerald-600 text-white py-2.5 rounded-lg hover:bg-emerald-700 transition font-semibold">
                  Create Trade
                </button>
              </form>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">My Active Listings</h2>

              {myTrades.length === 0 ? (
                <EmptyBlock text="You have not created any listings yet." />
              ) : (
                <div className="space-y-3 max-h-[560px] overflow-auto pr-1">
                  {myTrades.map((trade) => (
                    <div key={trade._id} className="rounded-xl border border-gray-200 p-4">
                      {editingId === trade._id ? (
                        <form onSubmit={updateTrade} className="grid md:grid-cols-2 gap-3">
                          <input
                            type="number"
                            value={editForm.pricePerCredit}
                            onChange={(e) => setEditForm({ ...editForm, pricePerCredit: e.target.value })}
                            className="border border-gray-300 rounded-lg px-3 py-2"
                            required
                          />
                          <input
                            type="number"
                            value={editForm.quantity}
                            onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                            className="border border-gray-300 rounded-lg px-3 py-2"
                            required
                          />
                          <button type="submit" className="bg-emerald-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700">
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="bg-gray-200 text-gray-800 py-2 rounded-lg text-sm font-semibold hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-lg font-bold text-emerald-700">INR {trade.pricePerCredit}/credit</p>
                            <p className="text-sm text-gray-600">{trade.remainingQuantity || trade.quantity} credits available</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEdit(trade)}
                              className="px-3 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteTrade(trade._id)}
                              className="px-3 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {buyingTrade && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-xl p-6">
            <h2 className="text-lg font-bold text-gray-900">Purchase Credits</h2>
            <p className="text-sm text-gray-600 mt-1 mb-4">Seller: {buyingTrade.sellerCompany?.name || "Company"}</p>

            <p className="text-sm text-gray-600 mb-2">Your coins: {coinsBalance}</p>

            <input
              type="number"
              placeholder="Enter quantity"
              value={buyQuantity}
              onChange={(e) => setBuyQuantity(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 mb-3"
            />

            {coinsBalance >= 100 ? (
              <label className="flex items-center gap-2 mb-3 text-sm text-gray-700">
                <input type="checkbox" checked={useDiscount} onChange={(e) => setUseDiscount(e.target.checked)} />
                Use 100 coins for INR 1000 discount
              </label>
            ) : null}

            <p className="font-semibold text-gray-900 mb-5">
              Total: INR {Math.max(buyingTrade.pricePerCredit * Number(buyQuantity || 0) - (useDiscount ? 1000 : 0), 0)}
            </p>

            <div className="flex gap-2">
              <button onClick={executePurchase} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 font-semibold">
                Confirm
              </button>
              <button
                onClick={() => setBuyingTrade(null)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 font-semibold"
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

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
        active ? "bg-emerald-600 text-white shadow" : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-300 p-10 text-center text-gray-500">
      {text}
    </div>
  );
}
