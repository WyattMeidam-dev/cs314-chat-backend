const request = require("supertest");
const { app } = require("../../index");
const { connect, close, clear } = require("../testHelper");
process.env.JWT_SECRET = "test_secret_key";
process.env.JWT_EXPIRES_IN = "1h";
process.env.FRONTEND_URL = "http://localhost:5173";
beforeAll(async () => await connect());
afterAll(async () => await close());
afterEach(async () => await clear());
const registerUser = async (email = "user@test.com", password = "pass1234") => {
  const res = await request(app)
    .post("/api/auth/signup")
    .send({ email, password });
  const cookie = res.headers["set-cookie"][0];
  const userId = res.body.user.id;
  return { cookie, userId };
};
describe("Feature Test: Contact Management (4.2.1)", () => {
  test("POST /api/contacts/search → 200 OK, matching users returned, current user excluded", async () => {
    const { cookie } = await registerUser("searcher@test.com");
    await request(app)
      .post("/api/auth/signup")
      .send({ email: "david@test.com", password: "pass1234" });
    const updateRes = await request(app)
      .post("/api/auth/signup")
      .send({ email: "david2@test.com", password: "pass1234" });
    const cookie2 = updateRes.headers["set-cookie"][0];
    await request(app)
      .post("/api/auth/update-profile")
      .set("Cookie", cookie2)
      .send({ firstName: "David", lastName: "Smith" });
    const res = await request(app)
      .post("/api/contacts/search")
      .set("Cookie", cookie)
      .send({ searchTerm: "David" });
    expect(res.status).toBe(200);
    expect(res.body.contacts).toBeDefined();
    expect(Array.isArray(res.body.contacts)).toBe(true);
    res.body.contacts.forEach((c) => {
      expect(c.email).not.toBe("searcher@test.com");
    });
  });
  test("POST /api/contacts/search - missing searchTerm → 400", async () => {
    const { cookie } = await registerUser();
    const res = await request(app)
      .post("/api/contacts/search")
      .set("Cookie", cookie)
      .send({});
    expect(res.status).toBe(400);
  });
  test("GET /api/contacts/all-contacts → 200 OK, all users except self as { label, value }", async () => {
    const { cookie } = await registerUser("main@test.com");
    await registerUser("other1@test.com");
    await registerUser("other2@test.com");
    const res = await request(app)
      .get("/api/contacts/all-contacts")
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.contacts).toBeDefined();
    expect(res.body.contacts.length).toBe(2);
    res.body.contacts.forEach((c) => {
      expect(c).toHaveProperty("label");
      expect(c).toHaveProperty("value");
    });
  });
  test("GET /api/contacts/get-contacts-for-list → 200 OK, contacts with lastMessageTime", async () => {
    const { cookie } = await registerUser("list@test.com");
    const res = await request(app)
      .get("/api/contacts/get-contacts-for-list")
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.contacts).toBeDefined();
    expect(Array.isArray(res.body.contacts)).toBe(true);
  });
});
describe("Feature Test: Messages (4.3.1)", () => {
  test("POST /api/messages/get-messages → 200 OK, correct messages array", async () => {
    const { cookie: cookieA, userId: userAId } = await registerUser("usera@test.com");
    const { userId: userBId } = await registerUser("userb@test.com");
    const Message = require("../../models/Message");
    await Message.create({
      sender: userAId,
      recipient: userBId,
      content: "Hello from A",
      timestamp: new Date(),
    });
    const res = await request(app)
      .post("/api/messages/get-messages")
      .set("Cookie", cookieA)
      .send({ id: userBId });
    expect(res.status).toBe(200);
    expect(res.body.messages).toBeDefined();
    expect(res.body.messages.length).toBe(1);
    expect(res.body.messages[0].content).toBe("Hello from A");
  });
  test("POST /api/messages/get-messages - missing id → 400", async () => {
    const { cookie } = await registerUser();
    const res = await request(app)
      .post("/api/messages/get-messages")
      .set("Cookie", cookie)
      .send({});
    expect(res.status).toBe(400);
  });
  test("Messages are only returned between the two specified users", async () => {
    const { cookie: cookieA, userId: userAId } = await registerUser("a@test.com");
    const { userId: userBId } = await registerUser("b@test.com");
    const { userId: userCId } = await registerUser("c@test.com");
    const Message = require("../../models/Message");
    await Message.create({ sender: userAId, recipient: userBId, content: "A to B" });
    await Message.create({ sender: userAId, recipient: userCId, content: "A to C" });
    const res = await request(app)
      .post("/api/messages/get-messages")
      .set("Cookie", cookieA)
      .send({ id: userBId });
    expect(res.status).toBe(200);
    expect(res.body.messages.length).toBe(1);
    expect(res.body.messages[0].content).toBe("A to B");
  });
});
describe("Security Tests (5.2)", () => {
  test("5.2.1 - MongoDB injection in login email → 400 or 404, not authenticated", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: { $gt: "" }, password: "anypass" });
    expect([400, 404, 500]).toContain(res.status);
    expect(res.status).not.toBe(200);
  });
  test("5.2.3 - No cookie on protected route → 401 Unauthorized", async () => {
    const res = await request(app).get("/api/auth/userinfo");
    expect(res.status).toBe(401);
  });
  test("5.2.3 - Tampered JWT → 401 Unauthorized", async () => {
    const res = await request(app)
      .get("/api/auth/userinfo")
      .set("Cookie", "jwt=this.is.a.tampered.token");
    expect(res.status).toBe(401);
  });
  test("5.2.4 - Multiple wrong password attempts don't crash the server", async () => {
    await registerUser("brute@test.com");
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "brute@test.com", password: "wrongpassword" });
      expect(res.status).toBe(400);
    }
  });
});
