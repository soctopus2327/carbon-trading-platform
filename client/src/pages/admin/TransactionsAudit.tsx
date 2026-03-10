import { useEffect, useState, useCallback } from "react";
import { fetchTransactions } from "../../api/platformAdminApi";

export default function TransactionsAudit() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTransactions({ page, limit: 20 });
      setTransactions(data.transactions);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transactions Audit</h1>
        <p className="text-gray-500 text-sm mt-1">{total} total transactions across the platform</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Buyer", "Seller", "Credits", "Price/Credit", "Total Amount", "Date"].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400">Loading…</td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400">No transactions found</td>
              </tr>
            ) : transactions.map((t) => (
              <tr key={t._id} className="hover:bg-gray-50 transition">
                <td className="px-5 py-3 font-semibold text-gray-900">{t.buyerCompany?.name || "—"}</td>
                <td className="px-5 py-3 text-gray-700">{t.sellerCompany?.name || "—"}</td>
                <td className="px-5 py-3 text-indigo-600 font-bold">{t.credits.toLocaleString()}</td>
                <td className="px-5 py-3 text-gray-600">${t.pricePerCredit.toFixed(2)}</td>
                <td className="px-5 py-3 text-green-700 font-semibold">${t.totalAmount.toLocaleString()}</td>
                <td className="px-5 py-3 text-gray-400 text-xs">
                  {new Date(t.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-3 justify-end">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}