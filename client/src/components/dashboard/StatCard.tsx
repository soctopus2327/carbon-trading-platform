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
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">{title}</span>
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            positive
              ? "bg-green-100 text-green-600"
              : "bg-red-100 text-red-600"
          }`}
        >
          {delta}
        </span>
      </div>

      <div className="mt-2 text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-gray-400">{subtitle}</div>
    </div>
  );
}
