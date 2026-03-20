import { useEffect, useState } from "react";
import axios from "axios";
import PageLayout from "../components/layout/PageLayout";

const API = "http://localhost:5000";

export default function AllianceMarketplace() {
  const [alliances, setAlliances] = useState<any[]>([]);
  const [marketplace, setMarketplace] = useState<any[]>([]);
  const [selectedAlliance, setSelectedAlliance] = useState("");
  const [availableCredits, setAvailableCredits] = useState(0);

  const [credits, setCredits] = useState("");
  const [price, setPrice] = useState("");

  const [buyingTrade, setBuyingTrade] = useState<any | null>(null);
  const [buyQuantity, setBuyQuantity] = useState("");

  const [editingTrade, setEditingTrade] = useState<any | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editQuantity, setEditQuantity] = useState("");

  const [deletingTrade, setDeletingTrade] = useState<any | null>(null);

  // Separate error states
  const [sellError, setSellError] = useState("");
  const [editError, setEditError] = useState("");
  const [buyError, setBuyError] = useState("");

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const myCompanyId = user?.company?._id || user?.company;

  // ==================== FETCH COMPANY CREDITS ====================
  const fetchCompanyCredits = async () => {
    try {
      const res = await axios.get(`${API}/company/${myCompanyId}/credits`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAvailableCredits(res.data.carbonCredits);
    } catch (err) {
      console.error("Error fetching company credits:", err);
    }
  };

  // ==================== FETCH ALLIANCES ====================
  const fetchAlliances = async () => {
    try {
      const res = await axios.get(`${API}/alliance/my-alliances`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAlliances(res.data);
      if (res.data.length > 0) setSelectedAlliance(res.data[0]._id);
    } catch (err) {
      console.error(err);
    }
  };

  // ==================== FETCH MARKETPLACE ====================
  const fetchMarketplace = async () => {
    try {
      const res = await axios.get(`${API}/alliance/marketplace`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMarketplace(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // ==================== SELL CREDITS ====================
  const sellCredits = async () => {
    setSellError("");
    if (!price || !credits) return;

    const qty = Number(credits);
    if (qty <= 0) {
      setSellError("Quantity must be greater than 0");
      return;
    }
    if (qty > availableCredits) {
      setSellError("You cannot sell more credits than you own.");
      return;
    }

    try {
      await axios.post(
        `${API}/alliance/create-trade`,
        { allianceId: selectedAlliance, pricePerCredit: Number(price), quantity: qty },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPrice("");
      setCredits("");
      setSellError("");

      await fetchMarketplace();
      await fetchCompanyCredits();
    } catch (err: any) {
      setSellError(err.response?.data?.message || "Error selling credits");
    }
  };

  // ==================== BUY TRADE ====================
  const executeBuy = async () => {
    if (!buyingTrade) return;
    setBuyError("");

    try {
      await axios.post(
        `${API}/alliance/buy`,
        { tradeId: buyingTrade._id, quantity: Number(buyQuantity) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setBuyingTrade(null);
      setBuyQuantity("");
      setBuyError("");

      await fetchMarketplace();
      await fetchCompanyCredits();
    } catch (err: any) {
      setBuyError(err.response?.data?.message || "Error buying credits");
    }
  };

  // ==================== UPDATE TRADE ====================
  const updateTrade = async () => {
    if (!editingTrade) return;
    setEditError("");

    const newQty = Number(editQuantity);
    const currentQty = Number(editingTrade.remainingQuantity);
    const extraNeeded = newQty - currentQty;

    if (extraNeeded > availableCredits) {
      setEditError("Not enough credits to increase trade quantity.");
      return;
    }

    try {
      await axios.put(
        `${API}/alliance/update-trade/${editingTrade._id}`,
        { pricePerCredit: Number(editPrice), quantity: newQty },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setEditingTrade(null);
      setEditError("");

      await fetchMarketplace();
      await fetchCompanyCredits();
    } catch (err: any) {
      setEditError(err.response?.data?.message || "Error updating trade");
    }
  };

  // ==================== DELETE TRADE ====================
  const deleteTrade = async () => {
    if (!deletingTrade) return;

    try {
      await axios.delete(`${API}/alliance/delete-trade/${deletingTrade._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setDeletingTrade(null);
      await fetchMarketplace();
      await fetchCompanyCredits();
    } catch (err) {
      console.error(err);
    }
  };

  // ==================== INITIAL LOAD ====================
  useEffect(() => {
    fetchAlliances();
    fetchMarketplace();
    fetchCompanyCredits();
  }, []);

  // ==================== RENDER ====================
  return (
    <PageLayout title="Alliance Marketplace">
      <div className="p-10 bg-gradient-to-br from-indigo-50 via-white to-indigo-100 min-h-screen">
        <h1 className="text-4xl font-bold text-indigo-700 mb-10">Alliance Marketplace</h1>

        {/* SELL CARD */}
        <div className="bg-white shadow-xl rounded-xl p-8 w-full mb-12">
          <h2 className="text-xl font-bold text-indigo-700 mb-2">Sell Credits</h2>
          <p className="text-sm text-gray-600 mb-4">
            Available Credits: <b>{availableCredits}</b>
          </p>

          {sellError && <p className="text-red-600 mb-3 font-medium">{sellError}</p>}

          <div className="grid md:grid-cols-3 gap-4">
            <select
              value={selectedAlliance}
              onChange={(e) => setSelectedAlliance(e.target.value)}
              className="w-full border rounded-lg p-3"
            >
              {alliances.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name}
                </option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Quantity"
              min="1"
              max={availableCredits}
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
              className="w-full border rounded-lg p-3"
            />

            <input
              type="number"
              placeholder="Price per credit"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full border rounded-lg p-3"
            />
          </div>

          <button
            onClick={sellCredits}
            className="mt-4 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700"
          >
            Sell Credits
          </button>
        </div>

        {/* MARKETPLACE */}
        <h2 className="text-2xl font-bold text-indigo-700 mb-6">Alliance Credit Listings</h2>
        <div className="space-y-8">
          {marketplace.map((alliance) => (
            <div key={alliance.allianceId} className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-indigo-700 mb-4">{alliance.allianceName}</h3>

              {(!alliance.trades || alliance.trades.length === 0) && (
                <p className="text-gray-500 italic">No trades listed</p>
              )}

              <div className="flex flex-wrap gap-4">
                {alliance.trades?.map((trade: any) => {
                  const isMyTrade = trade.sellerCompanyId === myCompanyId;

                  return (
                    <div
                      key={trade._id}
                      className="min-w-[220px] border rounded-lg p-4 bg-gray-50 shadow-sm"
                    >
                      <p><b>Seller:</b> {trade.sellerCompanyName}</p>
                      <p><b>Price:</b> ₹{trade.pricePerCredit}</p>
                      <p><b>Credits:</b> {trade.remainingQuantity}</p>

                      <div className="flex gap-2 mt-3">
                        {!isMyTrade && (
                          <button
                            onClick={() => setBuyingTrade(trade)}
                            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                          >
                            Buy
                          </button>
                        )}

                        {isMyTrade && (
                          <>
                            <button
                              onClick={() => {
                                setEditingTrade(trade);
                                setEditPrice(trade.pricePerCredit);
                                setEditQuantity(trade.remainingQuantity);
                              }}
                              className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeletingTrade(trade)}
                              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* BUY MODAL */}
        {buyingTrade && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
              <h2 className="text-lg font-bold mb-3">Buy Credits</h2>
              <p className="text-sm text-gray-600 mb-4">Seller: {buyingTrade.sellerCompanyName}</p>

              {buyError && <p className="text-red-600 mb-3 font-medium">{buyError}</p>}

              <input
                type="number"
                placeholder="Enter quantity"
                value={buyQuantity}
                onChange={(e) => setBuyQuantity(e.target.value)}
                className="w-full border rounded p-2 mb-4"
              />
              <p className="font-semibold mb-4">
                Total: ₹ {Number(buyQuantity || 0) * buyingTrade.pricePerCredit}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={executeBuy}
                  className="flex-1 bg-green-600 text-white py-2 rounded"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setBuyingTrade(null)}
                  className="flex-1 bg-gray-200 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EDIT MODAL */}
        {editingTrade && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
              <h2 className="text-lg font-bold mb-4 text-indigo-700">Update Trade</h2>

              {editError && <p className="text-red-600 mb-3 font-medium">{editError}</p>}

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="w-32 font-semibold">New Price:</label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="flex-1 border rounded-lg p-2"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="w-32 font-semibold">New Quantity:</label>
                  <input
                    type="number"
                    min="1"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                    className="flex-1 border rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={updateTrade}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg"
                >
                  Update Trade
                </button>
                <button
                  onClick={() => setEditingTrade(null)}
                  className="flex-1 bg-gray-200 py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE MODAL */}
        {deletingTrade && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
              <h2 className="text-lg font-bold mb-4">Delete Trade</h2>
              <p className="mb-4">Are you sure you want to delete this trade?</p>
              <div className="flex gap-2">
                <button
                  onClick={deleteTrade}
                  className="flex-1 bg-red-600 text-white py-2 rounded"
                >
                  Delete
                </button>
                <button
                  onClick={() => setDeletingTrade(null)}
                  className="flex-1 bg-gray-200 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}