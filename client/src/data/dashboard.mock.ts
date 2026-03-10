export type DashboardStat = {
  title: string;
  value: string;
  delta: string;
  positive: boolean;
  subtitle: string;
};

export type EmissionsPoint = {
  month: string;
  emissions: number;
  offsets: number;
};

export type PortfolioProject = {
  name: string;
  value: number;
};

export type DashboardDataset = {
  company: string;
  stats: DashboardStat[];
  emissionsTrend: EmissionsPoint[];
  portfolioDistribution: PortfolioProject[];
};

export const DASHBOARD_COMPANY_STORAGE_KEY = "dashboardSelectedCompany";
export const DASHBOARD_UPLOADED_DATA_STORAGE_KEY = "dashboardUploadedDataByCompany";

export const dashboardDataByCompany: Record<string, DashboardDataset> = {
  "GreenSteel Industries": {
    company: "GreenSteel Industries",
    stats: [
      { title: "Total Holdings", value: "14,800 t", delta: "9.5%", positive: true, subtitle: "Value: $165,200" },
      { title: "Net Emissions (YTD)", value: "5,100 t", delta: "3.4%", positive: false, subtitle: "Target: 4,900 t" },
      { title: "Credit Price Index", value: "$12.10", delta: "1.2%", positive: true, subtitle: "Sector benchmark" },
      { title: "Offset Ratio", value: "72%", delta: "6%", positive: true, subtitle: "Of total emissions" },
    ],
    emissionsTrend: [
      { month: "Jan", emissions: 5600, offsets: 4100 },
      { month: "Feb", emissions: 5400, offsets: 4300 },
      { month: "Mar", emissions: 5300, offsets: 4500 },
      { month: "Apr", emissions: 5200, offsets: 4700 },
      { month: "May", emissions: 5100, offsets: 4900 },
      { month: "Jun", emissions: 5000, offsets: 5050 },
    ],
    portfolioDistribution: [
      { name: "Forestry", value: 38 },
      { name: "Biochar", value: 34 },
      { name: "Carbon Capture", value: 28 },
    ],
  },
  "SunGrid Power Ltd": {
    company: "SunGrid Power Ltd",
    stats: [
      { title: "Total Holdings", value: "9,300 t", delta: "7.8%", positive: true, subtitle: "Value: $103,900" },
      { title: "Net Emissions (YTD)", value: "2,850 t", delta: "4.1%", positive: false, subtitle: "Target: 2,600 t" },
      { title: "Credit Price Index", value: "$11.75", delta: "0.6%", positive: true, subtitle: "Renewables weighted" },
      { title: "Offset Ratio", value: "81%", delta: "3%", positive: true, subtitle: "Of total emissions" },
    ],
    emissionsTrend: [
      { month: "Jan", emissions: 3400, offsets: 2600 },
      { month: "Feb", emissions: 3200, offsets: 2750 },
      { month: "Mar", emissions: 3100, offsets: 2850 },
      { month: "Apr", emissions: 3000, offsets: 3000 },
      { month: "May", emissions: 2900, offsets: 3150 },
      { month: "Jun", emissions: 2800, offsets: 3300 },
    ],
    portfolioDistribution: [
      { name: "Solar", value: 52 },
      { name: "Wind", value: 31 },
      { name: "Hydro", value: 17 },
    ],
  },
  "EcoLogix Manufacturing": {
    company: "EcoLogix Manufacturing",
    stats: [
      { title: "Total Holdings", value: "18,100 t", delta: "5.1%", positive: true, subtitle: "Value: $201,400" },
      { title: "Net Emissions (YTD)", value: "6,450 t", delta: "1.7%", positive: false, subtitle: "Target: 6,100 t" },
      { title: "Credit Price Index", value: "$11.20", delta: "0.4%", positive: true, subtitle: "Industrial average" },
      { title: "Offset Ratio", value: "64%", delta: "2%", positive: true, subtitle: "Of total emissions" },
    ],
    emissionsTrend: [
      { month: "Jan", emissions: 6900, offsets: 4300 },
      { month: "Feb", emissions: 6700, offsets: 4500 },
      { month: "Mar", emissions: 6600, offsets: 4700 },
      { month: "Apr", emissions: 6500, offsets: 4900 },
      { month: "May", emissions: 6450, offsets: 5100 },
      { month: "Jun", emissions: 6400, offsets: 5300 },
    ],
    portfolioDistribution: [
      { name: "Forestry", value: 30 },
      { name: "Carbon Capture", value: 40 },
      { name: "Methane Abatement", value: 30 },
    ],
  },
};

export const dashboardCompanyOptions = Object.keys(dashboardDataByCompany);

export const fallbackDashboardCompany = dashboardCompanyOptions[0];

function isDashboardStat(value: unknown): value is DashboardStat {
  if (!value || typeof value !== "object") return false;
  const item = value as DashboardStat;
  return (
    typeof item.title === "string" &&
    typeof item.value === "string" &&
    typeof item.delta === "string" &&
    typeof item.positive === "boolean" &&
    typeof item.subtitle === "string"
  );
}

function isEmissionsPoint(value: unknown): value is EmissionsPoint {
  if (!value || typeof value !== "object") return false;
  const item = value as EmissionsPoint;
  return (
    typeof item.month === "string" &&
    typeof item.emissions === "number" &&
    typeof item.offsets === "number"
  );
}

function isPortfolioProject(value: unknown): value is PortfolioProject {
  if (!value || typeof value !== "object") return false;
  const item = value as PortfolioProject;
  return typeof item.name === "string" && typeof item.value === "number";
}

export function isDashboardDataset(value: unknown): value is DashboardDataset {
  if (!value || typeof value !== "object") return false;
  const item = value as DashboardDataset;
  return (
    typeof item.company === "string" &&
    Array.isArray(item.stats) &&
    item.stats.every(isDashboardStat) &&
    Array.isArray(item.emissionsTrend) &&
    item.emissionsTrend.every(isEmissionsPoint) &&
    Array.isArray(item.portfolioDistribution) &&
    item.portfolioDistribution.every(isPortfolioProject)
  );
}

export function parseDashboardUploadPayload(payload: unknown): Record<string, DashboardDataset> {
  if (isDashboardDataset(payload)) {
    return { [payload.company]: payload };
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid JSON. Expected a dataset object or a company-to-dataset map.");
  }

  const record = payload as Record<string, unknown>;
  const parsed: Record<string, DashboardDataset> = {};

  for (const [companyKey, value] of Object.entries(record)) {
    if (!isDashboardDataset(value)) {
      throw new Error(`Invalid dataset for company "${companyKey}".`);
    }
    parsed[companyKey] = {
      ...value,
      company: value.company || companyKey,
    };
  }

  if (!Object.keys(parsed).length) {
    throw new Error("No valid datasets found in uploaded JSON.");
  }

  return parsed;
}

export function getUploadedDashboardData(): Record<string, DashboardDataset> {
  try {
    const raw = localStorage.getItem(DASHBOARD_UPLOADED_DATA_STORAGE_KEY);
    if (!raw) return {};
    return parseDashboardUploadPayload(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function saveUploadedDashboardData(data: Record<string, DashboardDataset>): void {
  localStorage.setItem(DASHBOARD_UPLOADED_DATA_STORAGE_KEY, JSON.stringify(data));
}

export function getAllDashboardData(): Record<string, DashboardDataset> {
  return {
    ...dashboardDataByCompany,
    ...getUploadedDashboardData(),
  };
}

export function getDashboardCompanyOptions(): string[] {
  return Object.keys(getAllDashboardData());
}

export function getDashboardDataset(company?: string | null): DashboardDataset {
  const allData = getAllDashboardData();
  if (company && allData[company]) {
    return allData[company];
  }

  const fallback = allData[fallbackDashboardCompany] || Object.values(allData)[0];
  return fallback || dashboardDataByCompany[fallbackDashboardCompany];
}
