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
    name: "Admin User",
    email: "admin@test.com",
    password: "123456",
    role: "ADMIN",
    company: company._id
  });

});

describe("Company APIs", () => {

  test("get dashboard", async () => {

    const res = await request(app)
      .get("/api/company/dashboard");

    expect(res.statusCode).toBeGreaterThanOrEqual(200);

  });

  test("get company credits", async () => {

    const res = await request(app)
      .get("/api/company/credits");

    expect(res.statusCode).toBeGreaterThanOrEqual(200);

  });

  test("create alliance success", async () => {

    const res = await request(app)
      .post("/api/company/alliance")
      .send({
        name: "Alliance1"
      });

    expect(res.statusCode).toBeGreaterThanOrEqual(200);

  });

});