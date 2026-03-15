const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../server");
const Company = require("../models/Company");

let mongoServer;

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
});

describe("Leaderboard API", () => {

  test("should return leaderboard sorted by points", async () => {

    await Company.create([
      { name: "A", companyType: "COMPANY", points: 100, carbonCredits: 10, status: "ACTIVE" },
      { name: "B", companyType: "COMPANY", points: 300, carbonCredits: 20, status: "ACTIVE" },
      { name: "C", companyType: "COMPANY", points: 200, carbonCredits: 30, status: "ACTIVE" }
    ]);

    const res = await request(app).get("/leaderboard");

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(3);

    expect(res.body[0].points).toBe(300);
    expect(res.body[1].points).toBe(200);
    expect(res.body[2].points).toBe(100);
  });


  test("should return only ACTIVE companies", async () => {

    await Company.create([
      { name: "Active1", companyType: "COMPANY", points: 100, carbonCredits: 10, status: "ACTIVE" },
      { name: "Inactive1", companyType: "COMPANY", points: 500, carbonCredits: 10, status: "PENDING" }
    ]);

    const res = await request(app).get("/leaderboard");

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe("Active1");
  });


  test("should limit leaderboard to top 10", async () => {

    const companies = [];

    for (let i = 1; i <= 15; i++) {
      companies.push({
        name: "Company" + i,
        companyType: "COMPANY",
        points: i * 10,
        carbonCredits: 10,
        status: "ACTIVE"
      });
    }

    await Company.create(companies);

    const res = await request(app).get("/leaderboard");

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(10);
  });


  test("should return selected fields only", async () => {

    await Company.create({
      name: "TestCo",
      companyType: "COMPANY",
      points: 100,
      carbonCredits: 50,
      coins: 500,
      status: "ACTIVE"
    });

    const res = await request(app).get("/leaderboard");

    expect(res.statusCode).toBe(200);

    expect(res.body[0]).toHaveProperty("name");
    expect(res.body[0]).toHaveProperty("points");
    expect(res.body[0]).toHaveProperty("carbonCredits");

    expect(res.body[0]).not.toHaveProperty("coins");
  });


  test("should handle server errors", async () => {

    jest.spyOn(Company, "find").mockImplementationOnce(() => {
      throw new Error("Database failure");
    });

    const res = await request(app).get("/leaderboard");

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Database failure");
  });

});