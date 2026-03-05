const projects = [
  { name: "Forestry", value: 45 },
  { name: "Solar", value: 30 },
  { name: "Carbon Capture", value: 25 },
];

export default function PortfolioDistribution() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
      <h3 className="font-bold text-lg text-gray-900 mb-1">Portfolio Distribution</h3>
      <p className="text-sm text-gray-500 mb-6">By project type</p>

      <div className="space-y-5">
        {projects.map((p) => (
          <div key={p.name}>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-gray-700">{p.name}</span>
              <span className="font-bold text-green-600">{p.value}%</span>
            </div>
            <div className="h-3 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                style={{ width: `${p.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
