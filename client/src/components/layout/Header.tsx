import { useState } from "react";

export default function Header() {

  const [role, setRole] = useState("Enterprise Admin");

  return (

    <div className="bg-white border-b px-6 py-4 flex justify-between items-center">

      {/* Left */}
      <div className="flex items-center gap-4">

        <input
          placeholder="Type to search..."
          className="border rounded-lg px-4 py-2 w-80"
        />

      </div>


      {/* Right */}
      <div className="flex items-center gap-6">


        {/* ROLE selector */}
        <div className="flex items-center gap-2">

          <span className="text-xs text-gray-500 font-semibold">
            ROLE
          </span>

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="border px-3 py-2 rounded-lg text-sm"
          >

            <option>Individual</option>

            <option>Enterprise Admin</option>

            <option>Trader</option>

            <option>Registry Operator</option>

          </select>

        </div>


        {/* Icons */}
        <span className="cursor-pointer">🌙</span>

        <span className="cursor-pointer">🔔</span>


        {/* Profile */}
        <div className="flex items-center gap-2">

          <img
            src="https://i.pravatar.cc/40"
            className="w-8 h-8 rounded-full"
          />

          <div className="text-sm">

            <div className="font-semibold">
              Alex Sterling
            </div>

            <div className="text-gray-500 text-xs">
              Novacorp Industries
            </div>

          </div>

        </div>


      </div>

    </div>

  );

}
