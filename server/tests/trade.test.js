const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../server");

const Company = require("../models/Company");
const User = require("../models/User");

jest.setTimeout(20000);

let company;
let user;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  await mongoose.connection.close();
});

beforeEach(async () => {
  await Company.deleteMany({});
  await User.deleteMany({});

  company = await Company.create({
    name: "TestCompany",
    companyType: "COMPANY",
    carbonCredits: 100
  });

  user = await User.create({
    name: "Trade Admin",
    email: "trade@test.com",
    password: "123456",
    role: "ADMIN",
    company: company._id
  });
});

describe("Trade APIs", () => {

  test("create trade success", async () => {
    const res = await request(app)
      .post("/api/trade")
      .send({
        price: 100,
        quantity: 10,
        companyId: company._id
      });

    expect(res.statusCode).toBeGreaterThanOrEqual(200);
  });

  test("create trade fails if price invalid", async () => {
    const res = await request(app)
      .post("/api/trade")
      .send({
        price: -1,
        quantity: 10,
        companyId: company._id
      });

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

});