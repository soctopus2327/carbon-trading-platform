const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../server");

const Company = require("../models/Company");
const TradeListing = require("../models/TradeListing");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

let mongoServer;
let buyerUser;
let sellerUser;
let buyerCompany;
let sellerCompany;
let trade;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {

  await Company.deleteMany({});
  await TradeListing.deleteMany({});
  await Transaction.deleteMany({});
  await User.deleteMany({});

  // seller company
  sellerCompany = await Company.create({
    name: "SellerCo",
    companyType: "COMPANY",
    carbonCredits: 100,
    coins: 0,
    points: 0,
    status: "ACTIVE"
  });

  // buyer company
  buyerCompany = await Company.create({
    name: "BuyerCo",
    companyType: "COMPANY",
    carbonCredits: 10,
    coins: 200,
    points: 0,
    status: "ACTIVE"
  });

  sellerUser = await User.create({
    name: "seller",
    email: "seller@test.com",
    password: "123456",
    role: "TRADER",
    company: sellerCompany._id
  });

  buyerUser = await User.create({
    name: "buyer",
    email: "buyer@test.com",
    password: "123456",
    role: "TRADER",
    company: buyerCompany._id
  });

  trade = await TradeListing.create({
    sellerCompany: sellerCompany._id,
    pricePerCredit: 50,
    quantity: 10,
    remainingQuantity: 10
  });

});

describe("Transaction APIs", () => {

  test("execute transaction successfully", async () => {

    const token = jwt.sign(
      { id: buyerUser._id },
      "secret"
    );

    const res = await request(app)
      .post("/transactions/execute")
      .set("Authorization", `Bearer ${token}`)
      .send({
        tradeId: trade._id,
        quantity: 2,
        useDiscount: false
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.transaction.credits).toBe(2);

    const updatedBuyer = await Company.findById(buyerCompany._id);
    const updatedSeller = await Company.findById(sellerCompany._id);

    expect(updatedBuyer.carbonCredits).toBe(12);
    expect(updatedSeller.carbonCredits).toBe(98);

  });

  test("should fail if quantity invalid", async () => {

    const token = jwt.sign({ id: buyerUser._id }, "secret");

    const res = await request(app)
      .post("/transactions/execute")
      .set("Authorization", `Bearer ${token}`)
      .send({
        tradeId: trade._id,
        quantity: -5
      });

    expect(res.statusCode).toBe(400);

  });

  test("should fail if trade not found", async () => {

    const token = jwt.sign({ id: buyerUser._id }, "secret");

    const res = await request(app)
      .post("/transactions/execute")
      .set("Authorization", `Bearer ${token}`)
      .send({
        tradeId: new mongoose.Types.ObjectId(),
        quantity: 1
      });

    expect(res.statusCode).toBe(404);

  });

  test("get my transactions", async () => {

    await Transaction.create({
      buyerCompany: buyerCompany._id,
      sellerCompany: sellerCompany._id,
      listing: trade._id,
      credits: 2,
      pricePerCredit: 50,
      totalAmount: 100,
      discountApplied: 0,
      status: "SUCCESS"
    });

    const token = jwt.sign({ id: buyerUser._id }, "secret");

    const res = await request(app)
      .get("/transactions/my-transactions")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);

  });

});