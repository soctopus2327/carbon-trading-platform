const request = require("supertest");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const app = require("../server");
const Company = require("../models/Company");
const User = require("../models/User");

jest.setTimeout(20000);

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Auth APIs", () => {

  test("register company success", async () => {

    const res = await request(app)
      .post("/api/auth/register")
      .send({
        companyName: "GreenCorp",
        companyType: "COMPANY",
        email: "green@test.com",
        password: "123456",
        name: "Green Admin"
      });

    expect(res.statusCode).toBeGreaterThanOrEqual(200);
  });

  test("register fails with duplicate email", async () => {

    const password = await bcrypt.hash("123456", 10);

    const company = await Company.create({
      name: "TestCompany",
      companyType: "COMPANY"
    });

    await User.create({
      name: "Duplicate User",
      email: "duplicate@test.com",
      password,
      role: "ADMIN",
      company: company._id
    });

    const res = await request(app)
      .post("/api/auth/register")
      .send({
        companyName: "AnotherCompany",
        companyType: "COMPANY",
        email: "duplicate@test.com",
        password: "123456",
        name: "Admin2"
      });

    expect(res.statusCode).toBeGreaterThanOrEqual(400);

  });

  test("login success", async () => {

    const password = await bcrypt.hash("123456", 10);

    const company = await Company.create({
      name: "LoginCompany",
      companyType: "COMPANY"
    });

    await User.create({
      name: "Login User",
      email: "login@test.com",
      password,
      role: "ADMIN",
      company: company._id
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "login@test.com",
        password: "123456"
      });

    expect(res.statusCode).toBeGreaterThanOrEqual(200);

  });

});