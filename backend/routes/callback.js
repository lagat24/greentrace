const express = require("express");
const router = express.Router();

router.post("/callback", async (req, res) => {
  const callbackData = req.body;

  console.log("MPESA CALLBACK:", JSON.stringify(callbackData, null, 2));

  // TODO: save subscription success → DB (userId, plan, amount, expiry date)

  res.json({ message: "Callback received successfully" });
});

module.exports = router;
