const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { MongoMemoryServer } = require("mongodb-memory-server");

// Mock email service — prevents real SMTP connections during tests
jest.mock("../utils/emailService", () => ({
  sendApprovalEmail: jest.fn().mockResolvedValue(undefined),
  sendRejectionEmail: jest.fn().mockResolvedValue(undefined),
  sendBlockEmail: jest.fn().mockResolvedValue(undefined),
  sendUnblockEmail: jest.fn().mockResolvedValue(undefined),
}));

const app = require("../server");

const User = require("../models/User");
const Company = require("../models/Company");
const Transaction = require("../models/Transaction");
const TradeListing = require("../models/TradeListing");
const Message = require("../models/Message");

let mongoServer;
let adminUser;
let adminToken;
let companyA;
let companyB;
let regularUser;

// ─────────────────────────────────────────────
// SETUP & TEARDOWN
// ─────────────────────────────────────────────

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Company.deleteMany({});
  await Transaction.deleteMany({});
  await TradeListing.deleteMany({});
  await Message.deleteMany({});

  // Create platform admin
  const hashedPassword = await bcrypt.hash("Desis@2025", 10);
  adminUser = await User.create({
    name: "Platform Admin",
    email: "platformadmin@desis.com",
    password: hashedPassword,
    role: "PLATFORM_ADMIN",
    company: null
  });

  adminToken = jwt.sign({ id: adminUser._id }, "secret");

  // Create two test companies
  companyA = await Company.create({
    name: "GreenCorp",
    companyType: "COMPANY",
    status: "PENDING",
    carbonCredits: 50,
    points: 0,
    coins: 0
  });

  companyB = await Company.create({
    name: "EcoAlliance",
    companyType: "ALLIANCE",
    status: "ACTIVE",
    carbonCredits: 100,
    points: 0,
    coins: 0
  });

  // Create a regular company user
  regularUser = await User.create({
    name: "John Doe",
    email: "john@greencorp.com",
    password: "hashedpw",
    role: "ADMIN",
    company: companyA._id
  });
});

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────

describe("Platform Admin — Auth", () => {

  test("login with valid credentials returns token", async () => {
    const res = await request(app)
      .post("/platform-admin/auth/login")
      .send({ email: "platformadmin@desis.com", password: "Desis@2025" });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe("PLATFORM_ADMIN");
  });

  test("login fails with wrong password", async () => {
    const res = await request(app)
      .post("/platform-admin/auth/login")
      .send({ email: "platformadmin@desis.com", password: "wrongpassword" });

    expect(res.statusCode).toBe(400);
  });

  test("login fails if user not found", async () => {
    const res = await request(app)
      .post("/platform-admin/auth/login")
      .send({ email: "nobody@desis.com", password: "Desis@2025" });

    expect(res.statusCode).toBe(404);
  });

  test("login fails if user is not a platform admin", async () => {
    const res = await request(app)
      .post("/platform-admin/auth/login")
      .send({ email: "john@greencorp.com", password: "hashedpw" });

    expect(res.statusCode).toBe(403);
  });

  test("protected route rejects request with no token", async () => {
    const res = await request(app).get("/platform-admin/dashboard");
    expect(res.statusCode).toBe(401);
  });

  test("protected route rejects request with non-admin token", async () => {
    const nonAdminToken = jwt.sign({ id: regularUser._id }, "secret");
    const res = await request(app)
      .get("/platform-admin/dashboard")
      .set("Authorization", `Bearer ${nonAdminToken}`);

    expect(res.statusCode).toBe(403);
  });

});

// ─────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────

describe("Platform Admin — Dashboard Stats", () => {

  test("returns correct company and user counts", async () => {
    const res = await request(app)
      .get("/platform-admin/dashboard")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.totalCompanies).toBe(2);
    expect(res.body.pendingCompanies).toBe(1);
    expect(res.body.activeCompanies).toBe(1);
    expect(res.body.totalUsers).toBe(1); // excludes PLATFORM_ADMIN
  });

  test("returns total carbon credits for active companies only", async () => {
    const res = await request(app)
      .get("/platform-admin/dashboard")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    // Only companyB is ACTIVE with 100 credits
    expect(res.body.totalCarbonCredits).toBe(100);
  });

});

// ─────────────────────────────────────────────
// COMPANY MANAGEMENT
// ─────────────────────────────────────────────

describe("Platform Admin — Company Management", () => {

  test("get all companies returns paginated list", async () => {
    const res = await request(app)
      .get("/platform-admin/companies")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.companies.length).toBe(2);
    expect(res.body.total).toBe(2);
  });

  test("filter companies by status", async () => {
    const res = await request(app)
      .get("/platform-admin/companies?status=PENDING")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.companies.length).toBe(1);
    expect(res.body.companies[0].name).toBe("GreenCorp");
  });

  test("search companies by name", async () => {
    const res = await request(app)
      .get("/platform-admin/companies?search=eco")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.companies.length).toBe(1);
    expect(res.body.companies[0].name).toBe("EcoAlliance");
  });

  test("get company details by id", async () => {
    const res = await request(app)
      .get(`/platform-admin/companies/${companyA._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.company.name).toBe("GreenCorp");
    expect(res.body.adminUsers).toBeDefined();
    expect(res.body.allUsers).toBeDefined();
  });

  test("get company details returns 404 for unknown id", async () => {
    const res = await request(app)
      .get(`/platform-admin/companies/${new mongoose.Types.ObjectId()}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(404);
  });

  test("approve a pending company", async () => {
    const res = await request(app)
      .put(`/platform-admin/companies/${companyA._id}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.company.status).toBe("ACTIVE");

    const updated = await Company.findById(companyA._id);
    expect(updated.status).toBe("ACTIVE");
    expect(updated.verifiedBy.toString()).toBe(adminUser._id.toString());
  });

  test("cannot approve a non-pending company", async () => {
    const res = await request(app)
      .put(`/platform-admin/companies/${companyB._id}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/already/i);
  });

  test("reject a pending company", async () => {
    const res = await request(app)
      .put(`/platform-admin/companies/${companyA._id}/reject`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "Incomplete documentation" });

    expect(res.statusCode).toBe(200);
    expect(res.body.company.status).toBe("REJECTED");
  });

  test("cannot reject a non-pending company", async () => {
    // companyB is ACTIVE, so rejecting it should return 400
    const res = await request(app)
      .put(`/platform-admin/companies/${companyB._id}/reject`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/already/i);
  });

  test("block an active company", async () => {
    const res = await request(app)
      .put(`/platform-admin/companies/${companyB._id}/block`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "Suspicious activity" });

    expect(res.statusCode).toBe(200);
    expect(res.body.company.status).toBe("BLOCKED");
  });

  test("cannot block an already blocked company", async () => {
    // First block it successfully
    await request(app)
      .put(`/platform-admin/companies/${companyB._id}/block`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "First block" });

    // Now try to block again — should fail with 400
    const res = await request(app)
      .put(`/platform-admin/companies/${companyB._id}/block`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/already blocked/i);
  });

  test("unblock a blocked company", async () => {
    await Company.findByIdAndUpdate(companyB._id, { status: "BLOCKED" });

    const res = await request(app)
      .put(`/platform-admin/companies/${companyB._id}/unblock`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.company.status).toBe("ACTIVE");
  });

  test("cannot unblock a company that is not blocked", async () => {
    const res = await request(app)
      .put(`/platform-admin/companies/${companyA._id}/unblock`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/not blocked/i);
  });

  test("delete a company also deletes its users", async () => {
    const res = await request(app)
      .delete(`/platform-admin/companies/${companyA._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);

    const deleted = await Company.findById(companyA._id);
    expect(deleted).toBeNull();

    const orphanUsers = await User.find({ company: companyA._id });
    expect(orphanUsers.length).toBe(0);
  });

  test("delete returns 404 for unknown company", async () => {
    const res = await request(app)
      .delete(`/platform-admin/companies/${new mongoose.Types.ObjectId()}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(404);
  });

});

// ─────────────────────────────────────────────
// CREDIT ADJUSTMENT
// ─────────────────────────────────────────────

describe("Platform Admin — Credit Adjustment", () => {

  test("SET credits to an exact value", async () => {
    const res = await request(app)
      .put(`/platform-admin/companies/${companyB._id}/credits`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ credits: 200, operation: "SET" });

    expect(res.statusCode).toBe(200);
    const updated = await Company.findById(companyB._id);
    expect(updated.carbonCredits).toBe(200);
  });

  test("ADD credits to existing balance", async () => {
    const res = await request(app)
      .put(`/platform-admin/companies/${companyB._id}/credits`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ credits: 50, operation: "ADD" });

    expect(res.statusCode).toBe(200);
    const updated = await Company.findById(companyB._id);
    expect(updated.carbonCredits).toBe(150); // 100 + 50
  });

  test("SUBTRACT credits from existing balance", async () => {
    const res = await request(app)
      .put(`/platform-admin/companies/${companyB._id}/credits`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ credits: 30, operation: "SUBTRACT" });

    expect(res.statusCode).toBe(200);
    const updated = await Company.findById(companyB._id);
    expect(updated.carbonCredits).toBe(70); // 100 - 30
  });

  test("SUBTRACT fails if balance is insufficient", async () => {
    const res = await request(app)
      .put(`/platform-admin/companies/${companyB._id}/credits`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ credits: 999, operation: "SUBTRACT" });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/insufficient/i);
  });

  test("fails with invalid credits value", async () => {
    const res = await request(app)
      .put(`/platform-admin/companies/${companyB._id}/credits`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ credits: -10, operation: "SET" });

    expect(res.statusCode).toBe(400);
  });

  test("fails with invalid operation", async () => {
    const res = await request(app)
      .put(`/platform-admin/companies/${companyB._id}/credits`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ credits: 10, operation: "MULTIPLY" });

    expect(res.statusCode).toBe(400);
  });

});

// ─────────────────────────────────────────────
// USER MANAGEMENT
// ─────────────────────────────────────────────

describe("Platform Admin — User Management", () => {

  test("get all users excludes platform admin", async () => {
    const res = await request(app)
      .get("/platform-admin/users")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    const roles = res.body.users.map(u => u.role);
    expect(roles).not.toContain("PLATFORM_ADMIN");
  });

  test("get users returns paginated results", async () => {
    const res = await request(app)
      .get("/platform-admin/users?page=1&limit=10")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.users).toBeDefined();
    expect(res.body.total).toBeDefined();
  });

  test("delete a regular user", async () => {
    const res = await request(app)
      .delete(`/platform-admin/users/${regularUser._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);

    const deleted = await User.findById(regularUser._id);
    expect(deleted).toBeNull();
  });

  test("cannot delete a platform admin user", async () => {
    const res = await request(app)
      .delete(`/platform-admin/users/${adminUser._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/cannot delete/i);
  });

  test("delete user returns 404 for unknown id", async () => {
    const res = await request(app)
      .delete(`/platform-admin/users/${new mongoose.Types.ObjectId()}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(404);
  });

});

// ─────────────────────────────────────────────
// TRANSACTIONS AUDIT
// ─────────────────────────────────────────────

describe("Platform Admin — Transactions Audit", () => {

  test("get all transactions returns empty list when none exist", async () => {
    const res = await request(app)
      .get("/platform-admin/transactions")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.transactions.length).toBe(0);
    expect(res.body.total).toBe(0);
  });

  test("get all transactions returns created transactions", async () => {
    const trade = await TradeListing.create({
      sellerCompany: companyA._id,
      pricePerCredit: 10,
      quantity: 5,
      remainingQuantity: 5
    });

    await Transaction.create({
      buyerCompany: companyB._id,
      sellerCompany: companyA._id,
      listing: trade._id,
      credits: 2,
      pricePerCredit: 10,
      totalAmount: 20,
      discountApplied: 0,
      status: "SUCCESS"
    });

    const res = await request(app)
      .get("/platform-admin/transactions")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.transactions.length).toBe(1);
    expect(res.body.total).toBe(1);
  });

  test("transactions are paginated correctly", async () => {
    const trade = await TradeListing.create({
      sellerCompany: companyA._id,
      pricePerCredit: 10,
      quantity: 50,
      remainingQuantity: 50
    });

    // Create 3 transactions
    for (let i = 0; i < 3; i++) {
      await Transaction.create({
        buyerCompany: companyB._id,
        sellerCompany: companyA._id,
        listing: trade._id,
        credits: 1,
        pricePerCredit: 10,
        totalAmount: 10,
        discountApplied: 0,
        status: "SUCCESS"
      });
    }

    const res = await request(app)
      .get("/platform-admin/transactions?page=1&limit=2")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.transactions.length).toBe(2);
    expect(res.body.total).toBe(3);
    expect(res.body.totalPages).toBe(2);
  });

});

// ─────────────────────────────────────────────
// MESSAGING
// ─────────────────────────────────────────────

describe("Platform Admin — Messaging", () => {

  test("send BROADCAST message to all active companies", async () => {
    const res = await request(app)
      .post("/messages/send")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        subject: "Platform Update",
        body: "We have new features!",
        broadcastType: "BROADCAST"
      });

    expect(res.statusCode).toBe(201);
    // Only companyB is ACTIVE
    expect(res.body.data.recipients.length).toBe(1);
    expect(res.body.data.broadcastType).toBe("BROADCAST");
  });

  test("send UNICAST message to a single company", async () => {
    const res = await request(app)
      .post("/messages/send")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        subject: "Your application",
        body: "Please submit your documents.",
        broadcastType: "UNICAST",
        companyIds: [companyA._id]
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.recipients.length).toBe(1);
  });

  test("send MULTICAST message to selected companies", async () => {
    const res = await request(app)
      .post("/messages/send")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        subject: "Important Notice",
        body: "Please review the updated terms.",
        broadcastType: "MULTICAST",
        companyIds: [companyA._id, companyB._id]
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.recipients.length).toBe(2);
  });

  test("UNICAST fails if more than one company is provided", async () => {
    const res = await request(app)
      .post("/messages/send")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        subject: "Test",
        body: "Test body",
        broadcastType: "UNICAST",
        companyIds: [companyA._id, companyB._id]
      });

    expect(res.statusCode).toBe(400);
  });

  test("MULTICAST fails if fewer than 2 companies are provided", async () => {
    const res = await request(app)
      .post("/messages/send")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        subject: "Test",
        body: "Test body",
        broadcastType: "MULTICAST",
        companyIds: [companyA._id]
      });

    expect(res.statusCode).toBe(400);
  });

  test("send message fails if subject is missing", async () => {
    const res = await request(app)
      .post("/messages/send")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ body: "Missing subject", broadcastType: "BROADCAST" });

    expect(res.statusCode).toBe(400);
  });

  test("get sent messages returns all platform-to-company messages", async () => {
    await Message.create({
      subject: "Hello",
      body: "Test",
      direction: "PLATFORM_TO_COMPANY",
      broadcastType: "BROADCAST",
      senderUser: adminUser._id,
      recipients: [{ company: companyB._id, isRead: false }]
    });

    const res = await request(app)
      .get("/messages/sent")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.messages.length).toBe(1);
  });

  test("get admin inbox returns company-to-platform messages", async () => {
    await Message.create({
      subject: "Query",
      body: "We have a question.",
      direction: "COMPANY_TO_PLATFORM",
      broadcastType: "UNICAST",
      senderUser: regularUser._id,
      senderCompany: companyA._id,
      recipients: [],
      adminRead: false
    });

    const res = await request(app)
      .get("/messages/inbox")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.messages.length).toBe(1);
    expect(res.body.unreadCount).toBe(1);
  });

  test("mark inbox message as read reduces unread count", async () => {
    const msg = await Message.create({
      subject: "Query",
      body: "We need help.",
      direction: "COMPANY_TO_PLATFORM",
      broadcastType: "UNICAST",
      senderUser: regularUser._id,
      senderCompany: companyA._id,
      recipients: [],
      adminRead: false
    });

    const res = await request(app)
      .put(`/messages/${msg._id}/admin-read`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);

    const updated = await Message.findById(msg._id);
    expect(updated.adminRead).toBe(true);
    expect(updated.adminReadAt).not.toBeNull();
  });

  test("delete a sent message", async () => {
    const msg = await Message.create({
      subject: "Outdated Notice",
      body: "This is old.",
      direction: "PLATFORM_TO_COMPANY",
      broadcastType: "BROADCAST",
      senderUser: adminUser._id,
      recipients: [{ company: companyB._id, isRead: false }]
    });

    const res = await request(app)
      .delete(`/messages/${msg._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);

    const deleted = await Message.findById(msg._id);
    expect(deleted).toBeNull();
  });

  test("get companies list returns only active companies", async () => {
    const res = await request(app)
      .get("/messages/companies-list")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    // Only companyB is ACTIVE
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe("EcoAlliance");
  });

  test("non-admin cannot access messaging endpoints", async () => {
    const nonAdminToken = jwt.sign({ id: regularUser._id }, "secret");

    const res = await request(app)
      .post("/messages/send")
      .set("Authorization", `Bearer ${nonAdminToken}`)
      .send({ subject: "Hack", body: "Test", broadcastType: "BROADCAST" });

    expect(res.statusCode).toBe(403);
  });

});