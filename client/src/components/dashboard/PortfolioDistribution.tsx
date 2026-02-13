const projects = [
  { name: "Forestry", value: 45 },
  { name: "Renewable Energy", value: 30 },
  { name: "Carbon Capture", value: 25 },
];

export default function PortfolioDistribution() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <h3 className="font-semibold mb-4">Portfolio Distribution</h3>
      <p className="text-sm text-gray-400 mb-4">By project type</p>

      <div className="space-y-4">
        {projects.map((p) => (
          <div key={p.name}>
            <div className="flex justify-between text-sm mb-1">
              <span>{p.name}</span>
              <span>{p.value}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full bg-green-500"
                style={{ width: `${p.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
