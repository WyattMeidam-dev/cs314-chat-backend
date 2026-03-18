jest.mock("../../models/Message");

const Message = require("../../models/Message");
const { getMessages } = require("../../controllers/messagesController");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("getMessages", () => {
  beforeEach(() => jest.clearAllMocks());

  test("valid request returns 200 and messages array", async () => {
    const req = {
      userId: "507f1f77bcf86cd799439011",
      body: { id: "507f1f77bcf86cd799439012" },
    };
    const res = mockRes();

    const fakeMessages = [
      {
        _id: "msg1",
        sender: "507f1f77bcf86cd799439011",
        recipient: "507f1f77bcf86cd799439012",
        content: "Hello!",
        messageType: "text",
        timestamp: new Date(),
      },
    ];

    Message.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue(fakeMessages),
    });

    await getMessages(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ messages: fakeMessages });
  });

  test("missing id returns 400 without querying db", async () => {
    const req = { userId: "507f1f77bcf86cd799439011", body: {} };
    const res = mockRes();
    await getMessages(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Message.find).not.toHaveBeenCalled();
  });

  test("invalid ObjectId format returns 400", async () => {
    const req = { userId: "507f1f77bcf86cd799439011", body: { id: "not-an-id" } };
    const res = mockRes();
    await getMessages(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
