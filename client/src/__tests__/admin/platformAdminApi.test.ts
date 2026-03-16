import axios from "axios";
import {
  platformAdminLogin,
  fetchDashboardStats,
  fetchCompanies,
  fetchCompanyDetails,
  approveCompany,
  rejectCompany,
  blockCompany,
  unblockCompany,
  adjustCredits,
  deleteCompany,
  fetchUsers,
  deleteUser,
  fetchTransactions,
} from "../../api/platformAdminApi";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const TOKEN = "test-token-abc";

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  localStorage.setItem("platformAdminToken", TOKEN);
});

const authHeader = { Authorization: `Bearer ${TOKEN}` };

describe("platformAdminApi", () => {

  // ── AUTH ──────────────────────────────────────
  describe("platformAdminLogin", () => {
    it("posts to /auth/login with email and password", async () => {
      mockedAxios.post.mockResolvedValue({ data: { token: "tok", user: {} } });

      await platformAdminLogin("admin@desis.com", "pass123");

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "http://localhost:5000/platform-admin/auth/login",
        { email: "admin@desis.com", password: "pass123" }
      );
    });

    it("returns token and user from response data", async () => {
      const mockData = { token: "tok-123", user: { name: "Admin" } };
      mockedAxios.post.mockResolvedValue({ data: mockData });

      const result = await platformAdminLogin("a@b.com", "p");
      expect(result).toEqual(mockData);
    });
  });

  // ── DASHBOARD ─────────────────────────────────
  describe("fetchDashboardStats", () => {
    it("calls GET /dashboard with auth header", async () => {
      mockedAxios.get.mockResolvedValue({ data: { totalCompanies: 5 } });

      await fetchDashboardStats();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        "http://localhost:5000/platform-admin/dashboard",
        { headers: authHeader }
      );
    });

    it("returns the response data", async () => {
      const stats = { totalCompanies: 10, totalUsers: 20 };
      mockedAxios.get.mockResolvedValue({ data: stats });

      const result = await fetchDashboardStats();
      expect(result).toEqual(stats);
    });
  });

  // ── COMPANIES ─────────────────────────────────
  describe("fetchCompanies", () => {
    it("calls GET /companies with auth header and params", async () => {
      mockedAxios.get.mockResolvedValue({ data: { companies: [] } });

      await fetchCompanies({ page: 1, limit: 15, status: "ACTIVE" });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        "http://localhost:5000/platform-admin/companies",
        { headers: authHeader, params: { page: 1, limit: 15, status: "ACTIVE" } }
      );
    });

    it("calls GET /companies with empty params by default", async () => {
      mockedAxios.get.mockResolvedValue({ data: {} });

      await fetchCompanies();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        "http://localhost:5000/platform-admin/companies",
        { headers: authHeader, params: {} }
      );
    });

    it("returns the response data", async () => {
      const data = { companies: [{ _id: "1", name: "Corp" }], total: 1 };
      mockedAxios.get.mockResolvedValue({ data });

      const result = await fetchCompanies();
      expect(result).toEqual(data);
    });
  });

  describe("fetchCompanyDetails", () => {
    it("calls GET /companies/:id with auth header", async () => {
      mockedAxios.get.mockResolvedValue({ data: { company: {} } });

      await fetchCompanyDetails("company-abc");

      expect(mockedAxios.get).toHaveBeenCalledWith(
        "http://localhost:5000/platform-admin/companies/company-abc",
        { headers: authHeader }
      );
    });
  });

  describe("approveCompany", () => {
    it("calls PUT /companies/:id/approve with auth header", async () => {
      mockedAxios.put.mockResolvedValue({ data: { success: true } });

      await approveCompany("cmp-1");

      expect(mockedAxios.put).toHaveBeenCalledWith(
        "http://localhost:5000/platform-admin/companies/cmp-1/approve",
        {},
        { headers: authHeader }
      );
    });
  });

  describe("rejectCompany", () => {
    it("calls PUT /companies/:id/reject with reason", async () => {
      mockedAxios.put.mockResolvedValue({ data: {} });

      await rejectCompany("cmp-2", "Policy violation");

      expect(mockedAxios.put).toHaveBeenCalledWith(
        "http://localhost:5000/platform-admin/companies/cmp-2/reject",
        { reason: "Policy violation" },
        { headers: authHeader }
      );
    });

    it("calls PUT /companies/:id/reject without reason if not provided", async () => {
      mockedAxios.put.mockResolvedValue({ data: {} });

      await rejectCompany("cmp-2");

      expect(mockedAxios.put).toHaveBeenCalledWith(
        "http://localhost:5000/platform-admin/companies/cmp-2/reject",
        { reason: undefined },
        { headers: authHeader }
      );
    });
  });

  describe("blockCompany", () => {
    it("calls PUT /companies/:id/block with reason", async () => {
      mockedAxios.put.mockResolvedValue({ data: {} });

      await blockCompany("cmp-3", "Suspicious activity");

      expect(mockedAxios.put).toHaveBeenCalledWith(
        "http://localhost:5000/platform-admin/companies/cmp-3/block",
        { reason: "Suspicious activity" },
        { headers: authHeader }
      );
    });
  });

  describe("unblockCompany", () => {
    it("calls PUT /companies/:id/unblock with auth header", async () => {
      mockedAxios.put.mockResolvedValue({ data: {} });

      await unblockCompany("cmp-4");

      expect(mockedAxios.put).toHaveBeenCalledWith(
        "http://localhost:5000/platform-admin/companies/cmp-4/unblock",
        {},
        { headers: authHeader }
      );
    });
  });

  describe("adjustCredits", () => {
    it("calls PUT /companies/:id/credits with credits and operation", async () => {
      mockedAxios.put.mockResolvedValue({ data: { carbonCredits: 5000 } });

      await adjustCredits("cmp-5", 1000, "ADD");

      expect(mockedAxios.put).toHaveBeenCalledWith(
        "http://localhost:5000/platform-admin/companies/cmp-5/credits",
        { credits: 1000, operation: "ADD" },
        { headers: authHeader }
      );
    });

    it("works with SET operation", async () => {
      mockedAxios.put.mockResolvedValue({ data: { carbonCredits: 2000 } });

      await adjustCredits("cmp-5", 2000, "SET");

      expect(mockedAxios.put).toHaveBeenCalledWith(
        expect.any(String),
        { credits: 2000, operation: "SET" },
        expect.any(Object)
      );
    });

    it("works with SUBTRACT operation", async () => {
      mockedAxios.put.mockResolvedValue({ data: { carbonCredits: 500 } });

      await adjustCredits("cmp-5", 500, "SUBTRACT");

      expect(mockedAxios.put).toHaveBeenCalledWith(
        expect.any(String),
        { credits: 500, operation: "SUBTRACT" },
        expect.any(Object)
      );
    });

    it("returns the response data", async () => {
      mockedAxios.put.mockResolvedValue({ data: { carbonCredits: 3000 } });

      const result = await adjustCredits("cmp-5", 3000, "SET");
      expect(result).toEqual({ carbonCredits: 3000 });
    });
  });

  describe("deleteCompany", () => {
    it("calls DELETE /companies/:id with auth header", async () => {
      mockedAxios.delete.mockResolvedValue({ data: { success: true } });

      await deleteCompany("cmp-6");

      expect(mockedAxios.delete).toHaveBeenCalledWith(
        "http://localhost:5000/platform-admin/companies/cmp-6",
        { headers: authHeader }
      );
    });
  });

  // ── USERS ─────────────────────────────────────
  describe("fetchUsers", () => {
    it("calls GET /users with auth header and params", async () => {
      mockedAxios.get.mockResolvedValue({ data: { users: [] } });

      await fetchUsers({ page: 2, limit: 20, role: "TRADER" });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        "http://localhost:5000/platform-admin/users",
        { headers: authHeader, params: { page: 2, limit: 20, role: "TRADER" } }
      );
    });

    it("returns the response data", async () => {
      const data = { users: [{ _id: "u1", name: "Alice" }], total: 1 };
      mockedAxios.get.mockResolvedValue({ data });

      const result = await fetchUsers();
      expect(result).toEqual(data);
    });
  });

  describe("deleteUser", () => {
    it("calls DELETE /users/:id with auth header", async () => {
      mockedAxios.delete.mockResolvedValue({ data: {} });

      await deleteUser("user-99");

      expect(mockedAxios.delete).toHaveBeenCalledWith(
        "http://localhost:5000/platform-admin/users/user-99",
        { headers: authHeader }
      );
    });
  });

  // ── TRANSACTIONS ──────────────────────────────
  describe("fetchTransactions", () => {
    it("calls GET /transactions with auth header and params", async () => {
      mockedAxios.get.mockResolvedValue({ data: { transactions: [] } });

      await fetchTransactions({ page: 1, limit: 20 });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        "http://localhost:5000/platform-admin/transactions",
        { headers: authHeader, params: { page: 1, limit: 20 } }
      );
    });

    it("calls GET /transactions with empty params by default", async () => {
      mockedAxios.get.mockResolvedValue({ data: {} });

      await fetchTransactions();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        "http://localhost:5000/platform-admin/transactions",
        { headers: authHeader, params: {} }
      );
    });

    it("returns the response data", async () => {
      const data = { transactions: [{ _id: "t1" }], total: 1, totalPages: 1 };
      mockedAxios.get.mockResolvedValue({ data });

      const result = await fetchTransactions();
      expect(result).toEqual(data);
    });
  });

  // ── TOKEN USAGE ───────────────────────────────
  describe("Auth token from localStorage", () => {
    it("includes the stored token in Authorization header", async () => {
      localStorage.setItem("platformAdminToken", "my-secret-token");
      mockedAxios.get.mockResolvedValue({ data: {} });

      await fetchDashboardStats();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { Authorization: "Bearer my-secret-token" },
        })
      );
    });

    it("sends 'Bearer null' when no token in localStorage", async () => {
      localStorage.removeItem("platformAdminToken");
      mockedAxios.get.mockResolvedValue({ data: {} });

      await fetchDashboardStats();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { Authorization: "Bearer null" },
        })
      );
    });
  });
});