type Props = {
  title: string;
  value: string;
  delta: string;
  positive: boolean;
  subtitle: string;
};

export default function StatCard({
  title,
  value,
  delta,
  positive,
  subtitle,
}: Props) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm hover:shadow-md transition border border-gray-100 h-full">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-600">{title}</span>
        <span
          className={`text-xs px-3 py-1 rounded-full font-semibold ${
            positive
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {positive ? "+" : ""}{delta}
        </span>
      </div>

      <div className="mt-1 text-2xl font-bold text-gray-900">{value}</div>
      <div className="mt-1 text-sm text-gray-500">{subtitle}</div>
    </div>
  );
}
