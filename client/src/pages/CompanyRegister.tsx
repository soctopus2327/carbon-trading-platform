import { useState, type ChangeEvent, type FormEvent } from "react";
import axios from "axios";

type CompanyRegisterProps = {
  onSuccess?: () => void;
};

type FormData = {
  companyName: string;
  email: string;
  password: string;
  confirmPassword: string;
  companyType: "INDIVIDUAL" | "ALLIANCE" | "COMPANY";
  initialCredits: number;     // ← NEW FIELD
};

export default function CompanyRegister({ onSuccess }: CompanyRegisterProps) {
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [formData, setFormData] = useState<FormData>({
    companyName: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyType: "INDIVIDUAL",
    initialCredits: 0,           // ← NEW
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "initialCredits" ? Number(value) || 0 : value,
    }));
    setError("");
    setSuccessMessage("");
  };

  // ====================== LOGIN ======================
  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const response = await axios.post("http://localhost:5000/auth/login", {
        email: formData.email,
        password: formData.password,
      });

      const { token, user } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("role", user.role);

      if (onSuccess) onSuccess();
      else window.location.href = "/dashboard";
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Invalid email or password"
      );
    } finally {
      setLoading(false);
    }
  };

  // ====================== REGISTER ======================
  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    // Validation
    if (!formData.companyName.trim()) {
      setError("Company name is required");
      setLoading(false);
      return;
    }
    if (!formData.email.includes("@")) {
      setError("Valid email is required");
      setLoading(false);
      return;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }
    if (formData.initialCredits < 0) {
      setError("Initial credits cannot be negative");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post("http://localhost:5000/auth/register-company", {
        companyName: formData.companyName.trim(),
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        companyType: formData.companyType,
        initialCredits: formData.initialCredits,     // ← Sending to backend
      });

      setSuccessMessage(
        `Company "${formData.companyName}" registered successfully!\n\n` +
        `Requested Initial Credits: ${formData.initialCredits}\n\n` +
        `Your company is now under review by the platform admin.\n` 
      );

      setFormData({
        companyName: "",
        email: "",
        password: "",
        confirmPassword: "",
        companyType: "INDIVIDUAL",
        initialCredits: 0,
      });
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to register company"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (isLogin) {
      handleLogin(e);
    } else {
      handleRegister(e);
    }
  };

  return (
    <div
      className="min-h-screen w-full overflow-y-auto bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage:
          "linear-gradient(rgba(15, 23, 42, 0.45), rgba(15, 23, 42, 0.45)), url('https://png.pngtree.com/background/20211215/original/pngtree-abstract-style-green-texture-background-picture-image_1459046.jpg')",
      }}
    >
      <div className="relative min-h-screen p-4 md:p-6 flex items-center justify-center">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-6 md:p-8 max-w-md w-full border border-emerald-100 my-4">

          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold mb-4">
              Carbon Trading Platform
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              {isLogin ? "Welcome Back" : "Register Company"}
            </h2>
            <p className="text-gray-600 text-sm mt-2">
              {isLogin ? "Access your carbon trading account" : "Join the carbon trading platform"}
            </p>
          </div>

          {/* Toggle */}
          <div className="grid grid-cols-2 gap-2 mb-6 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(""); setSuccessMessage(""); }}
              className={`py-2.5 rounded-lg font-semibold transition ${!isLogin ? "bg-emerald-600 text-white shadow-sm" : "text-slate-700 hover:text-slate-900"}`}
            >
              Register
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(""); setSuccessMessage(""); }}
              className={`py-2.5 rounded-lg font-semibold transition ${isLogin ? "bg-emerald-600 text-white shadow-sm" : "text-slate-700 hover:text-slate-900"}`}
            >
              Login
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-700 px-4 py-3 rounded-lg mb-4 text-sm whitespace-pre-line">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="Enter company name"
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Company Type
                  </label>
                  <select
                    name="companyType"
                    value={formData.companyType}
                    onChange={handleChange}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="INDIVIDUAL">INDIVIDUAL</option>
                    <option value="COMPANY">COMPANY</option>
                    <option value="ALLIANCE">ALLIANCE</option>
                  </select>
                </div>

                {/* NEW: Initial Credits Input */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Initial Carbon Credits
                  </label>
                  <input
                    type="number"
                    name="initialCredits"
                    value={formData.initialCredits}
                    onChange={handleChange}
                    min="0"
                    placeholder="Enter starting credits (e.g. 1000)"
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">This will be set as starting balance (approval required)</p>
                </div>
              </>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="company@example.com"
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={isLogin ? "Enter your password" : "Minimum 6 characters"}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            {/* Confirm Password */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm password"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold py-3 rounded-lg hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 mt-2"
            >
              {loading
                ? (isLogin ? "Logging in..." : "Registering...")
                : (isLogin ? "Login" : "Register Company")}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-6">
            Your data is secure and encrypted 🔒
          </p>


          <div className="text-center mt-3">
            <button
              type="button"
              onClick={() => window.location.href = "/admin"}
              className="text-xs text-emerald-600 hover:text-emerald-700 underline font-medium"
            >
              Platform Admin Login →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}