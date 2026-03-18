jest.mock("../../models/User");
jest.mock("bcryptjs");
jest.mock("jsonwebtoken");

const User = require("../../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { signup, login, getUserInfo, updateProfile } = require("../../controllers/authController");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  return res;
};

describe("signup", () => {
  beforeEach(() => jest.clearAllMocks());

  test("valid input returns 201 and user object", async () => {
    const req = { body: { email: "test@test.com", password: "pass123" } };
    const res = mockRes();

    User.findOne.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue("hashedPassword");

    const fakeUser = {
      _id: "abc123",
      email: "test@test.com",
      firstName: "",
      lastName: "",
      image: "",
      profileSetup: false,
      color: "",
    };
    User.create.mockResolvedValue(fakeUser);
    jwt.sign.mockReturnValue("fake.jwt.token");

    await signup(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({ email: "test@test.com", profileSetup: false }),
      })
    );
    expect(res.cookie).toHaveBeenCalledWith("jwt", "fake.jwt.token", expect.any(Object));
  });

  test("duplicate email returns 409", async () => {
    const req = { body: { email: "existing@test.com", password: "pass123" } };
    const res = mockRes();

    User.findOne.mockResolvedValue({ email: "existing@test.com" });

    await signup(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  test("missing email returns 400", async () => {
    const req = { body: { password: "pass123" } };
    const res = mockRes();
    await signup(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("missing password returns 400", async () => {
    const req = { body: { email: "test@test.com" } };
    const res = mockRes();
    await signup(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe("login", () => {
  beforeEach(() => jest.clearAllMocks());

  test("valid credentials return 200 and user object", async () => {
    const req = { body: { email: "test@test.com", password: "pass123" } };
    const res = mockRes();

    const fakeUser = {
      _id: "abc123",
      email: "test@test.com",
      password: "hashedPassword",
      firstName: "Test",
      lastName: "User",
      image: "",
      profileSetup: true,
      color: "",
    };
    User.findOne.mockResolvedValue(fakeUser);
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue("fake.jwt.token");

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ user: expect.objectContaining({ email: "test@test.com" }) })
    );
    expect(res.cookie).toHaveBeenCalledWith("jwt", "fake.jwt.token", expect.any(Object));
  });

  test("wrong password returns 400 without setting cookie", async () => {
    const req = { body: { email: "test@test.com", password: "wrongpass" } };
    const res = mockRes();

    User.findOne.mockResolvedValue({ email: "test@test.com", password: "hashedPassword" });
    bcrypt.compare.mockResolvedValue(false);

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.cookie).not.toHaveBeenCalled();
  });

  test("email not found returns 404", async () => {
    const req = { body: { email: "nobody@test.com", password: "pass123" } };
    const res = mockRes();
    User.findOne.mockResolvedValue(null);
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe("getUserInfo", () => {
  beforeEach(() => jest.clearAllMocks());

  test("existing user returns 200", async () => {
    const req = { userId: "abc123" };
    const res = mockRes();

    const fakeUser = {
      _id: "abc123",
      email: "test@test.com",
      firstName: "",
      lastName: "",
      image: "",
      profileSetup: false,
      color: "",
    };
    User.findById.mockResolvedValue(fakeUser);

    await getUserInfo(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("user not found returns 404", async () => {
    const req = { userId: "nonexistent" };
    const res = mockRes();
    User.findById.mockResolvedValue(null);
    await getUserInfo(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
