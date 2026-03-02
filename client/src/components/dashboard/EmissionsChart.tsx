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
    <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
      <div className="mb-6">
        <h3 className="font-bold text-lg text-gray-900">Emissions vs Offsets</h3>
        <p className="text-sm text-gray-500">6-month trend analysis</p>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <XAxis dataKey="month" stroke="#9ca3af" />
          <YAxis stroke="#9ca3af" />
          <Tooltip 
            contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
            cursor={{ stroke: "#10b981", strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="emissions"
            stroke="#ef4444"
            strokeWidth={3}
            dot={{ fill: "#ef4444", r: 5 }}
            activeDot={{ r: 7 }}
          />
          <Line
            type="monotone"
            dataKey="offsets"
            stroke="#10b981"
            strokeWidth={3}
            dot={{ fill: "#10b981", r: 5 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
