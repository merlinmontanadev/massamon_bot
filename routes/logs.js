const express = require("express");
const router = express.Router();
const { getLogs } = require("../services/state");

router.get("/", (req, res) => {
  res.json(getLogs());
});

router.get("/:sender", async (req, res) => {
  const sender = req.params.sender;
  const history = await getLogs(sender);
  if (history && history.length > 0) {
    res.json({
      sender: sender, // Menggunakan sender dari req.params
      messages: history, // 'history' sudah berupa array JavaScript siap pakai
    });
  } else {
    res.status(404).json({
      error: "Sender tidak ditemukan atau belum ada log.",
    });
  }
});

module.exports = router;
