export default function Topbar() {
  return (
    <header className="flex items-center justify-between bg-white px-6 py-4 border-b">
      {/* Search */}
      <div className="flex items-center gap-3 w-96">
        <input
          type="text"
          placeholder="Type to search..."
          className="w-full rounded-lg border px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        {/* Role selector */}
        <select className="rounded-lg border px-3 py-2 text-sm">
          <option>Individual</option>
          <option>Enterprise Admin</option>
          <option>Trader</option>
          <option>Registry Operator</option>
        </select>

        {/* Icons (placeholders) */}
        <button className="text-gray-500">🌙</button>
        <button className="text-gray-500">🔔</button>

        {/* Profile */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gray-300" />
          <div className="text-sm">
            <div className="font-medium">Alex Sterling</div>
            <div className="text-xs text-gray-400">Novacorp Industries</div>
          </div>
        </div>
      </div>
    </header>
  );
}
