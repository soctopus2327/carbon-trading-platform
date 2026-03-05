import { useState } from "react";
import axios from "axios";
import PageLayout from "../components/layout/PageLayout";

export default function CompanyRegister({ onSuccess }) {
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    companyName: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyType: "INDIVIDUAL"
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
    <PageLayout title={isLogin ? "Login" : "Register Company"} description={isLogin ? "Login to your account" : "Create a new company account"}>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full border border-green-100">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              {isLogin ? "Welcome Back" : "Register Company"}
            </h2>
            <p className="text-gray-600 text-sm mt-2">
              {isLogin ? "Access your carbon trading account" : "Join the carbon trading platform"}
            </p>
          </div>

          {/* Toggle Buttons */}
          <div className="flex gap-2 mb-8 bg-gray-100 p-1 rounded-lg">
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
                  companyType: "EMITTER"
                });
              }}
              className={`flex-1 py-2 rounded-lg font-semibold transition ${
                !isLogin
                  ? "bg-green-600 text-white shadow-md"
                  : "text-gray-700 hover:text-gray-900"
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
                  companyType: "EMITTER"
                });
              }}
              className={`flex-1 py-2 rounded-lg font-semibold transition ${
                isLogin
                  ? "bg-green-600 text-white shadow-md"
                  : "text-gray-700 hover:text-gray-900"
              }`}
            >
              Login
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-300 text-red-700 px-4 py-3 rounded-lg mb-4 font-medium">
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
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-green-500 transition"
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
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-green-500 transition"
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
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-green-500 transition"
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
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-green-500 transition"
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
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-green-500 transition"
                  required={!isLogin}
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white font-bold py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition disabled:opacity-50 shadow-md hover:shadow-lg mt-6"
            >
              {loading ? (isLogin ? "Logging in..." : "Registering...") : (isLogin ? "Login" : "Register Company")}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-gray-500 mt-6">
            Your data is secure and encrypted
          </p>

          {/* Platform Admin Link */}
          <div className="text-center mt-4 text-white">
            <button
              type="button"
              onClick={() => window.location.href = "/admin"}
              className="text-xs text-white hover:text-gray-600 underline"
            >
              Platform Admin Login
            </button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
