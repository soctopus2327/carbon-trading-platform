import { useState } from "react";

export default function Header({ }) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
      <div className="flex items-center gap-4">
        <input
          placeholder="Search credits, trades, projects..."
          className="border-2 border-gray-200 rounded-lg px-4 py-2 w-96 focus:outline-none focus:border-green-500 transition"
        />
      </div>

      <div className="flex items-center gap-6">

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 pl-4 border-l border-gray-200 hover:text-green-600 transition"
          >
            <img
              src="https://i.pravatar.cc/40"
              className="w-10 h-10 rounded-full"
            />
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-gray-500">
                {user?.email || "No email"}
              </p>
            </div>
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <button
                onClick={() => setShowUserMenu(false)}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100"
              >
                Profile
              </button>
              <button
                onClick={() => setShowUserMenu(false)}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100"
              >
                Settings
              </button>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  handleLogout();
                }}
                className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 font-semibold rounded-b-lg transition"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}