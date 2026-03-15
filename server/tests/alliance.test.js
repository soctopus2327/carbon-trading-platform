const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../server");

const Company = require("../models/Company");
const Alliance = require("../models/Alliance");
const AllianceTrade = require("../models/AllianceTrade");
const AlliancePoll = require("../models/AlliancePoll");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

let mongoServer;

let creatorCompany;
let joinCompany;

let creatorUser;
let joinUser;

let alliance;
let trade;
let poll;

const signToken = (user) => jwt.sign({ id: user._id }, "secret");

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {

  await Company.deleteMany({});
  await Alliance.deleteMany({});
  await AllianceTrade.deleteMany({});
  await AlliancePoll.deleteMany({});
  await Transaction.deleteMany({});
  await User.deleteMany({});

  creatorCompany = await Company.create({
    name: "CreatorCo",
    companyType: "COMPANY",
    carbonCredits: 100,
    coins: 0,
    points: 0,
    status: "ACTIVE"
  });

  joinCompany = await Company.create({
    name: "JoinCo",
    companyType: "COMPANY",
    carbonCredits: 50,
    coins: 0,
    points: 0,
    status: "ACTIVE"
  });

  creatorUser = await User.create({
    name: "creator",
    email: "creator@test.com",
    password: "123456",
    role: "TRADER",
    company: creatorCompany._id
  });

  joinUser = await User.create({
    name: "join",
    email: "join@test.com",
    password: "123456",
    role: "TRADER",
    company: joinCompany._id
  });

});

describe("Alliance APIs", () => {

  /* ================= CREATE ALLIANCE ================= */

  test("create alliance success", async () => {

    const res = await request(app)
      .post("/alliance/create")
      .set("Authorization", `Bearer ${signToken(creatorUser)}`)
      .send({ name: "Green Alliance" });

    expect(res.statusCode).toBe(200);
    expect(res.body.alliance.name).toBe("Green Alliance");

  });

  test("create alliance fails if company not found", async () => {

    const fakeUser = await User.create({
      name: "fake",
      email: "fake@test.com",
      password: "123456",
      role: "TRADER",
      company: new mongoose.Types.ObjectId()
    });

    const res = await request(app)
      .post("/alliance/create")
      .set("Authorization", `Bearer ${signToken(fakeUser)}`)
      .send({ name: "FailAlliance" });

    expect(res.statusCode).toBe(404);

  });


  /* ================= JOIN REQUEST ================= */

  test("send join request", async () => {

    alliance = await Alliance.create({
      name: "Test Alliance",
      code: "ABC123",
      createdBy: creatorCompany._id,
      members: [creatorCompany._id]
    });

    const res = await request(app)
      .post("/alliance/request-join")
      .set("Authorization", `Bearer ${signToken(joinUser)}`)
      .send({ code: "ABC123" });

    expect(res.statusCode).toBe(200);

  });

  test("join request fails if alliance not found", async () => {

    const res = await request(app)
      .post("/alliance/request-join")
      .set("Authorization", `Bearer ${signToken(joinUser)}`)
      .send({ code: "INVALID" });

    expect(res.statusCode).toBe(404);

  });

  test("join request fails if already member", async () => {

    alliance = await Alliance.create({
      name: "Alliance",
      code: "JOIN1",
      createdBy: creatorCompany._id,
      members: [creatorCompany._id, joinCompany._id]
    });

    const res = await request(app)
      .post("/alliance/request-join")
      .set("Authorization", `Bearer ${signToken(joinUser)}`)
      .send({ code: "JOIN1" });

    expect(res.statusCode).toBe(400);

  });


  /* ================= HANDLE REQUEST ================= */

  test("approve join request", async () => {

    alliance = await Alliance.create({
      name: "Test Alliance",
      code: "XYZ123",
      createdBy: creatorCompany._id,
      members: [creatorCompany._id],
      joinRequests: [{ company: joinCompany._id }]
    });

    const res = await request(app)
      .post("/alliance/handle-request")
      .set("Authorization", `Bearer ${signToken(creatorUser)}`)
      .send({
        allianceId: alliance._id,
        companyId: joinCompany._id,
        action: "APPROVE"
      });

    expect(res.statusCode).toBe(200);

  });

  test("handle request fails if not creator", async () => {

    alliance = await Alliance.create({
      name: "Alliance",
      code: "AUTH1",
      createdBy: creatorCompany._id,
      members: [creatorCompany._id],
      joinRequests: [{ company: joinCompany._id }]
    });

    const res = await request(app)
      .post("/alliance/handle-request")
      .set("Authorization", `Bearer ${signToken(joinUser)}`)
      .send({
        allianceId: alliance._id,
        companyId: joinCompany._id,
        action: "APPROVE"
      });

    expect(res.statusCode).toBe(403);

  });


  /* ================= ALLIANCE MEMBERS ================= */

  test("get alliance members", async () => {

    alliance = await Alliance.create({
      name: "Alliance",
      code: "A1",
      createdBy: creatorCompany._id,
      members: [creatorCompany._id]
    });

    creatorCompany.allianceMemberships = [alliance._id];
    await creatorCompany.save();

    const res = await request(app)
      .get("/alliance/members")
      .set("Authorization", `Bearer ${signToken(creatorUser)}`);

    expect(res.statusCode).toBe(200);

  });


  /* ================= CREATE TRADE ================= */

  test("create alliance trade", async () => {

    alliance = await Alliance.create({
      name: "Alliance",
      code: "AAA",
      createdBy: creatorCompany._id,
      members: [creatorCompany._id]
    });

    const res = await request(app)
      .post("/alliance/create-trade")
      .set("Authorization", `Bearer ${signToken(creatorUser)}`)
      .send({
        allianceId: alliance._id,
        pricePerCredit: 20,
        quantity: 5
      });

    expect(res.statusCode).toBe(200);

  });

  test("create trade fails if insufficient credits", async () => {

    creatorCompany.carbonCredits = 1;
    await creatorCompany.save();

    alliance = await Alliance.create({
      name: "Alliance",
      code: "TRADEFAIL",
      createdBy: creatorCompany._id,
      members: [creatorCompany._id]
    });

    const res = await request(app)
      .post("/alliance/create-trade")
      .set("Authorization", `Bearer ${signToken(creatorUser)}`)
      .send({
        allianceId: alliance._id,
        pricePerCredit: 20,
        quantity: 10
      });

    expect(res.statusCode).toBe(400);

  });


  /* ================= BUY CREDITS ================= */

  test("buy alliance credits", async () => {

    alliance = await Alliance.create({
      name: "Alliance",
      code: "AAA",
      createdBy: creatorCompany._id,
      members: [creatorCompany._id, joinCompany._id]
    });

    trade = await AllianceTrade.create({
      alliance: alliance._id,
      sellerCompany: creatorCompany._id,
      pricePerCredit: 10,
      quantity: 10,
      remainingQuantity: 10
    });

    const res = await request(app)
      .post("/alliance/buy")
      .set("Authorization", `Bearer ${signToken(joinUser)}`)
      .send({
        tradeId: trade._id,
        quantity: 2
      });

    expect(res.statusCode).toBe(200);

  });

  test("buy fails if trade not found", async () => {

    const res = await request(app)
      .post("/alliance/buy")
      .set("Authorization", `Bearer ${signToken(joinUser)}`)
      .send({
        tradeId: new mongoose.Types.ObjectId(),
        quantity: 2
      });

    expect(res.statusCode).toBe(404);

  });

  test("buy fails if buying own trade", async () => {

    trade = await AllianceTrade.create({
      alliance: new mongoose.Types.ObjectId(),
      sellerCompany: creatorCompany._id,
      pricePerCredit: 10,
      quantity: 5,
      remainingQuantity: 5
    });

    const res = await request(app)
      .post("/alliance/buy")
      .set("Authorization", `Bearer ${signToken(creatorUser)}`)
      .send({
        tradeId: trade._id,
        quantity: 1
      });

    expect(res.statusCode).toBe(400);

  });


  /* ================= DELETE TRADE ================= */

  test("delete trade", async () => {

    trade = await AllianceTrade.create({
      alliance: new mongoose.Types.ObjectId(),
      sellerCompany: creatorCompany._id,
      pricePerCredit: 20,
      quantity: 5,
      remainingQuantity: 5
    });

    const res = await request(app)
      .delete(`/alliance/delete-trade/${trade._id}`)
      .set("Authorization", `Bearer ${signToken(creatorUser)}`);

    expect(res.statusCode).toBe(200);

  });

  test("delete trade fails if not owner", async () => {

    trade = await AllianceTrade.create({
      alliance: new mongoose.Types.ObjectId(),
      sellerCompany: creatorCompany._id,
      pricePerCredit: 20,
      quantity: 5,
      remainingQuantity: 5
    });

    const res = await request(app)
      .delete(`/alliance/delete-trade/${trade._id}`)
      .set("Authorization", `Bearer ${signToken(joinUser)}`);

    expect(res.statusCode).toBe(403);

  });


  /* ================= POLLS ================= */

  test("create alliance poll", async () => {

    alliance = await Alliance.create({
      name: "Alliance",
      code: "AAA",
      createdBy: creatorCompany._id,
      members: [creatorCompany._id]
    });

    const res = await request(app)
      .post("/alliance/poll/create")
      .set("Authorization", `Bearer ${signToken(creatorUser)}`)
      .send({
        allianceId: alliance._id,
        question: "Should we lower price?",
        options: ["Yes", "No"]
      });

    expect(res.statusCode).toBe(200);

  });

  test("poll fails with less than 2 options", async () => {

    const res = await request(app)
      .post("/alliance/poll/create")
      .set("Authorization", `Bearer ${signToken(creatorUser)}`)
      .send({
        allianceId: new mongoose.Types.ObjectId(),
        question: "Invalid Poll",
        options: ["Yes"]
      });

    expect(res.statusCode).toBe(400);

  });

  test("vote poll", async () => {

    poll = await AlliancePoll.create({
      alliance: new mongoose.Types.ObjectId(),
      question: "Test Poll",
      options: [
        { text: "Yes", votes: 0 },
        { text: "No", votes: 0 }
      ],
      createdBy: creatorCompany._id
    });

    const res = await request(app)
      .post("/alliance/poll/vote")
      .set("Authorization", `Bearer ${signToken(joinUser)}`)
      .send({
        pollId: poll._id,
        optionIndex: 0
      });

    expect(res.statusCode).toBe(200);

  });

});