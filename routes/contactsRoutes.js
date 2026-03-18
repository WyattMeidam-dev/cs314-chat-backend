const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const {
  searchContacts,
  getAllContacts,
  getContactsForList,
  deleteDM,
} = require("../controllers/contactsController");

router.post("/search", verifyToken, searchContacts);
router.get("/all-contacts", verifyToken, getAllContacts);
router.get("/get-contacts-for-list", verifyToken, getContactsForList);
router.delete("/delete-dm/:dmId", verifyToken, deleteDM);

module.exports = router;
