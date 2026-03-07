import { useState } from "react";
import axios from "axios";

export default function CompanyRegister({ onSuccess }) {
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    companyName: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyType: "INDIVIDUAL",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validation
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

    try {
      const response = await axios.post("http://localhost:5000/auth/login", {
        email: formData.email,
        password: formData.password
      });

      if (response.data && response.data.token) {
        // Store token and user info
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify({
          ...response.data.user,
          company: response.data.user.company
        }));
        localStorage.setItem("role", response.data.user.role);

        alert("Login successful!");
        
        // Call onSuccess callback if provided, otherwise reload
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.reload();
        }
      }

    } catch (err) {
      setError(err.response?.data || "Failed to login");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isLogin) {
      return handleLogin(e);
    }

    setError("");
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

    try {
      const response = await axios.post("http://localhost:5000/auth/register-company", {
        companyName: formData.companyName,
        email: formData.email,
        password: formData.password,
        companyType: formData.companyType
      });

      if (response.data && response.data.token) {
        // Store token and user info
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify({
          ...response.data.user,
          company: response.data.company._id
        }));
        localStorage.setItem("role", response.data.user.role);

        alert("Company registered successfully!");
        
        // Call onSuccess callback if provided, otherwise reload
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.reload();
        }
      }

    } catch (err) {
      setError(err.response?.data?.error || "Failed to register company");
      console.error("Registration error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-gradient-to-br from-emerald-50 via-white to-cyan-50 overflow-y-auto">
      <div className="min-h-full p-4 md:p-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 max-w-md w-full border border-emerald-100 my-4">
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

          {/* Toggle Buttons */}
          <div className="grid grid-cols-2 gap-2 mb-6 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setIsLogin(false);
                setError("");
                setFormData({
                  companyName: "",
                  email: "",
                  password: "",
                  confirmPassword: "",
                  companyType: "INDIVIDUAL",
                });
              }}
              className={`py-2.5 rounded-lg font-semibold transition ${
                !isLogin
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              Register
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setError("");
                setFormData({
                  companyName: "",
                  email: "",
                  password: "",
                  confirmPassword: "",
                  companyType: "INDIVIDUAL",
                });
              }}
              className={`py-2.5 rounded-lg font-semibold transition ${
                isLogin
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              Login
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Company Name - Only show on Register */}
            {!isLogin && (
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
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 transition"
                  required={!isLogin}
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="company@example.com"
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 transition"
                required
              />
            </div>

            {/* Company Type - Only show on Register */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Company Type
                </label>
                <select
                  name="companyType"
                  value={formData.companyType}
                  onChange={handleChange}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 transition"
                >
                  <option value="INDIVIDUAL">INDIVIDUAL</option>
                  <option value="ALLIANCE">ALLIANCE</option>
                  <option value="COMPANY">COMPANY</option>
                </select>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={isLogin ? "Enter your password" : "Minimum 6 characters"}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 transition"
                required
              />
            </div>

            {/* Confirm Password - Only show on Register */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm password"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 transition"
                  required={!isLogin}
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold py-3 rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow mt-2"
            >
              {loading ? (isLogin ? "Logging in..." : "Registering...") : (isLogin ? "Login" : "Register Company")}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-gray-500 mt-5">
            Your data is secure and encrypted
          </p>

          {/* Platform Admin Link */}
          <div className="text-center mt-3">
            <button
              type="button"
              onClick={() => window.location.href = "/admin"}
              className="text-xs text-white hover:text-slate-700 underline"
            >
              Platform Admin Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
