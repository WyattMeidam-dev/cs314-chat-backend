const request = require("supertest");
const { app } = require("../../index");
const { connect, close, clear } = require("../testHelper");

process.env.JWT_SECRET = "test_secret_key";
process.env.JWT_EXPIRES_IN = "1h";
process.env.FRONTEND_URL = "http://localhost:5173";
let authCookie = "";
beforeAll(async () => await connect());
afterAll(async () => await close());
afterEach(async () => await clear());
describe("Feature Test: Auth Flow (4.1.1) - Signup → Login → Get User Info → Logout", () => {
  test("POST /api/auth/signup → 201 Created, user object, JWT cookie set", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ email: "test@test.com", password: "pass1234" });
    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe("test@test.com");
    expect(res.body.user.profileSetup).toBe(false);
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.startsWith("jwt="))).toBe(true);
  });
  test("POST /api/auth/login → 200 OK, user object, JWT cookie set", async () => {
    await request(app)
      .post("/api/auth/signup")
      .send({ email: "test@test.com", password: "pass1234" });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@test.com", password: "pass1234" });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("test@test.com");
    const cookies = res.headers["set-cookie"];
    expect(cookies.some((c) => c.startsWith("jwt="))).toBe(true);
    authCookie = cookies[0];
  });
  test("GET /api/auth/userinfo (with valid cookie) → 200 OK", async () => {
    const signupRes = await request(app)
      .post("/api/auth/signup")
      .send({ email: "test2@test.com", password: "pass1234" });
    const cookie = signupRes.headers["set-cookie"][0];
    const res = await request(app)
      .get("/api/auth/userinfo")
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("test2@test.com");
  });
  test("POST /api/auth/logout → 200 OK, cookie cleared", async () => {
    const signupRes = await request(app)
      .post("/api/auth/signup")
      .send({ email: "test3@test.com", password: "pass1234" });
    const cookie = signupRes.headers["set-cookie"][0];
    const res = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
    const setCookies = res.headers["set-cookie"];
    expect(setCookies.some((c) => c.includes("jwt=;") || c.includes("Expires=Thu, 01 Jan 1970"))).toBe(true);
  });
  test("GET /api/auth/userinfo (after logout) → 401 Unauthorized", async () => {
    const res = await request(app).get("/api/auth/userinfo");
    expect(res.status).toBe(401);
  });
});
describe("Feature Test: Update Profile (4.1.2)", () => {
  test("POST /api/auth/update-profile → 200 OK, profileSetup: true", async () => {
    const signupRes = await request(app)
      .post("/api/auth/signup")
      .send({ email: "profile@test.com", password: "pass1234" });
    const cookie = signupRes.headers["set-cookie"][0];
    const res = await request(app)
      .post("/api/auth/update-profile")
      .set("Cookie", cookie)
      .send({ firstName: "David", lastName: "Meidam" });
    expect(res.status).toBe(200);
    expect(res.body.profileSetup).toBe(true);
    expect(res.body.firstName).toBe("David");
    expect(res.body.lastName).toBe("Meidam");
  });
  test("GET /api/auth/userinfo reflects updated name", async () => {
    const signupRes = await request(app)
      .post("/api/auth/signup")
      .send({ email: "name@test.com", password: "pass1234" });
    const cookie = signupRes.headers["set-cookie"][0];

    await request(app)
      .post("/api/auth/update-profile")
      .set("Cookie", cookie)
      .send({ firstName: "Wyatt", lastName: "Meidam" });

    const infoRes = await request(app)
      .get("/api/auth/userinfo")
      .set("Cookie", cookie);

    expect(infoRes.body.firstName).toBe("Wyatt");
    expect(infoRes.body.lastName).toBe("Meidam");
  });
  test("Missing firstName/lastName → 400 Bad Request", async () => {
    const signupRes = await request(app)
      .post("/api/auth/signup")
      .send({ email: "bad@test.com", password: "pass1234" });
    const cookie = signupRes.headers["set-cookie"][0];

    const res = await request(app)
      .post("/api/auth/update-profile")
      .set("Cookie", cookie)
      .send({ firstName: "Only" });
    expect(res.status).toBe(400);
  });
});
describe("Security: Signup edge cases", () => {
  test("Duplicate email → 409 Conflict", async () => {
    await request(app)
      .post("/api/auth/signup")
      .send({ email: "dup@test.com", password: "pass1234" });

    const res = await request(app)
      .post("/api/auth/signup")
      .send({ email: "dup@test.com", password: "pass1234" });

    expect(res.status).toBe(409);
  });
  test("Missing fields → 400 Bad Request", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ email: "nopass@test.com" });

    expect(res.status).toBe(400);
  });
});
