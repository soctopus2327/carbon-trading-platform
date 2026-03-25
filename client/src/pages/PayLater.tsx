import { useEffect, useState } from "react";
import axios from "axios";
import PageLayout from "../components/layout/PageLayout";

type PendingPayment = {
  id: string;
  seller: string;
  totalAmount: number;
  amountPaid: number;
  amountPending: number;
  dueDate: string;
  isOverdue: boolean;
  status: string;
};

type HistoryPayment = {
  id: string;
  buyer: string;
  seller: string;
  amount: string;
  status: string;
  dueDate: string;
  amountPaid: string;
  createdAt: string;
};

type SummaryData = {
  totalPending: string;
  overdueAmount: string;
  paymentCount: number;
};

export default function PayLater() {
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [historyPayments, setHistoryPayments] = useState<HistoryPayment[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Payment form state
  const [paymentMode, setPaymentMode] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(
    null
  );
  const [paymentAmount, setPaymentAmount] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPendingPayments();
    fetchPaymentHistory();
  }, []);

  const fetchPendingPayments = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/pay-later/pending", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSummary(response.data.summary);
      setPendingPayments(response.data.payments || []);
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message || err.response?.data?.error || "Failed to load pending payments";
      setError(errorMsg);
      console.error("Error fetching pending payments:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/pay-later/history", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setHistoryPayments(response.data.history || []);
    } catch (err: any) {
      console.error("Error fetching payment history:", err);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment || !paymentAmount) {
      alert("Please enter a valid amount");
      return;
    }

    const amount = Number(paymentAmount);
    if (amount <= 0 || amount > selectedPayment.amountPending) {
      alert(`Amount must be between 1 and ${selectedPayment.amountPending}`);
      return;
    }

    try {
      setProcessing(true);
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:5000/pay-later/process-payment",
        {
          payLaterPaymentId: selectedPayment.id,
          amountPaid: amount,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(`Payment of INR ${amount.toFixed(2)} processed successfully!\n\n` +
        `Status: ${response.data.payLaterPayment.status}\n` +
        `Total Paid: INR ${response.data.payLaterPayment.amountPaid.toFixed(2)}\n` +
        `Still Due: INR ${response.data.payLaterPayment.amountPending.toFixed(2)}\n\n` +
        `Your Debt: INR ${response.data.company.currentDebt.toFixed(2)}\n` +
        `Available Limit: INR ${response.data.company.availableLimit.toFixed(2)}`
      );

      // Refresh data
      setPaymentMode(false);
      setSelectedPayment(null);
      setPaymentAmount("");
      fetchPendingPayments();
      fetchPaymentHistory();
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        err.response?.data?.error ||
        "Payment failed";
      alert(errorMsg);
      console.error("Error processing payment:", err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Pay Later Management</h1>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-gray-600 text-sm">Total Pending</p>
              <p className="text-2xl font-bold text-blue-600">
                INR {summary.totalPending}
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <p className="text-gray-600 text-sm">Overdue Amount</p>
              <p className="text-2xl font-bold text-red-600">
                INR {summary.overdueAmount}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-gray-600 text-sm">Pending Payments</p>
              <p className="text-2xl font-bold text-green-600">
                {summary.paymentCount}
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b flex gap-4">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-6 py-3 font-semibold  ${
              activeTab === "pending"
                ? "border-b-2 border-gray-200 text-white"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Pending Payments ({pendingPayments.length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-6 py-3 font-semibold ${
              activeTab === "history"
                ? "border-b-2 border-gray-200 text-white"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Payment History ({historyPayments.length})
          </button>
        </div>

        {/* Pending Payments Tab */}
        {activeTab === "pending" && (
          <div>
            {loading ? (
              <p className="text-center text-gray-600">Loading pending payments...</p>
            ) : pendingPayments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 text-lg">No pending payments</p>
                <p className="text-gray-400">All your bills are paid up to date!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="px-4 py-3 text-left font-semibold">Seller</th>
                      <th className="px-4 py-3 text-right font-semibold">Total Amount</th>
                      <th className="px-4 py-3 text-right font-semibold">Amount Paid</th>
                      <th className="px-4 py-3 text-right font-semibold">Amount Pending</th>
                      <th className="px-4 py-3 text-center font-semibold">Due Date</th>
                      <th className="px-4 py-3 text-center font-semibold">Status</th>
                      <th className="px-4 py-3 text-center font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingPayments.map((payment) => (
                      <tr
                        key={payment.id}
                        className={`border-b hover:bg-gray-50 ${
                          payment.isOverdue ? "bg-red-50" : ""
                        }`}
                      >
                        <td className="px-4 py-3">{payment.seller}</td>
                        <td className="px-4 py-3 text-right font-semibold">
                          INR {payment.totalAmount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-green-600">
                          INR {payment.amountPaid.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-red-600 font-semibold">
                          INR {payment.amountPending.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">{payment.dueDate}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              payment.isOverdue
                                ? "bg-red-100 text-red-700"
                                : payment.status === "PENDING"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-green-100 text-green-700"
                            }`}
                          >
                            {payment.isOverdue ? "OVERDUE ⚠️" : payment.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              setSelectedPayment(payment);
                              setPaymentMode(true);
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                          >
                            Pay
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Payment History Tab */}
        {activeTab === "history" && (
          <div>
            {loading ? (
              <p className="text-center text-gray-600">Loading payment history...</p>
            ) : historyPayments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 text-lg">No payment history</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="px-4 py-3 text-left font-semibold">Buyer</th>
                      <th className="px-4 py-3 text-left font-semibold">Seller</th>
                      <th className="px-4 py-3 text-right font-semibold">Amount</th>
                      <th className="px-4 py-3 text-right font-semibold">Amount Paid</th>
                      <th className="px-4 py-3 text-center font-semibold">Due Date</th>
                      <th className="px-4 py-3 text-center font-semibold">Status</th>
                      <th className="px-4 py-3 text-left font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyPayments.map((payment) => (
                      <tr key={payment.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">{payment.buyer}</td>
                        <td className="px-4 py-3">{payment.seller}</td>
                        <td className="px-4 py-3 text-right">INR {payment.amount}</td>
                        <td className="px-4 py-3 text-right">INR {payment.amountPaid}</td>
                        <td className="px-4 py-3 text-center">{payment.dueDate}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              payment.status === "FULLY_PAID"
                                ? "bg-green-100 text-green-700"
                                : payment.status === "OVERDUE"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">{payment.createdAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Payment Modal */}
        {paymentMode && selectedPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-4">Make Payment</h2>

              <div className="mb-4 space-y-2">
                <p>
                  <span className="font-semibold">Seller:</span> {selectedPayment.seller}
                </p>
                <p>
                  <span className="font-semibold">Due Date:</span> {selectedPayment.dueDate}
                </p>
                <p>
                  <span className="font-semibold">Total Amount:</span> INR{" "}
                  {selectedPayment.totalAmount.toFixed(2)}
                </p>
                <p>
                  <span className="font-semibold">Already Paid:</span> INR{" "}
                  {selectedPayment.amountPaid.toFixed(2)}
                </p>
                <p className="text-red-600">
                  <span className="font-semibold">Remaining:</span> INR{" "}
                  {selectedPayment.amountPending.toFixed(2)}
                </p>
              </div>

              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                  <label className="block font-semibold mb-2">
                    Payment Amount (Max: INR {selectedPayment.amountPending.toFixed(2)})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={selectedPayment.amountPending}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={processing}
                    className={`flex-1 px-4 py-2 font-semibold text-white rounded ${
                      processing
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {processing ? "Processing..." : "Pay Now"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMode(false);
                      setSelectedPayment(null);
                      setPaymentAmount("");
                    }}
                    className="flex-1 px-4 py-2 font-semibold text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
