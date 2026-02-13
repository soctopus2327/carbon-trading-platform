import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { month: "Jan", emissions: 4500, offsets: 3800 },
  { month: "Feb", emissions: 4300, offsets: 3900 },
  { month: "Mar", emissions: 4200, offsets: 4100 },
  { month: "Apr", emissions: 4000, offsets: 4300 },
  { month: "May", emissions: 3800, offsets: 4500 },
];

export default function EmissionsChart() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="font-semibold">Emissions vs Offsets</h3>
        <p className="text-sm text-gray-400">6-month trend analysis</p>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="emissions"
            stroke="#ef4444"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="offsets"
            stroke="#22c55e"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
