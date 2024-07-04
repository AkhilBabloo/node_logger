const express = require("express");
const router = express.Router();
const logService = require("./log.service");
const fileService = require("./file.service");
const cron = require("node-cron");

router.post("/sendlogs/bulk/:playerId", (req, res) => {
  return logService.createBulkLogs(req, res);
});

router.post("/sendlogs/:playerId", (req, res) => {
  return logService.creatSingleLog(req, res);
});

router.get("/get/:playerId", (req, res) => {
  return fileService.downloadById(req, res);
});
router.get("/replay/:playerId/:tableId", (req, res) => {
  return fileService.replay(req, res);
});

router.get("/gameResponse/:playerId/:tableId", (req, res) => {
  return fileService.downloadGameResponse(req, res);
});

// cron.schedule('0 8 * * *', () => {
//     logService.cleanOldLogs();
// });

module.exports = router;
