const { writeJSON, writeBulkJSON } = require("../../utils");
const { Log } = require("./classes");

class LogService {
  constructor() {}
  async commonLogCreation(req, res, cb) {
    try {
      const playerId = req.params.playerId;
      if (req.body.log && playerId) {
        await cb();
        res.status(200).send({
          message: "success",
        });
      } else {
        res.status(400).send({
          message: "something went wrong",
        });
      }
    } catch (error) {
      console.error("Error writing to the file", error);
      res.status(500).send("Internal Server Error");
    }
  }
  async createBulkLogs(req, res) {
    const playerId = req.params.playerId;
    return await this.commonLogCreation(req, res, async () => {
      const logList = req.body.log.map((l) => new Log(playerId, l));
      await writeBulkJSON(playerId, logList);
    });
  }

  async creatSingleLog(req, res) {
    const playerId = req.params.playerId;
    return await this.commonLogCreation(req, res, async () => {
      const currentLog = new Log(playerId, req.body);
      await writeJSON(playerId, currentLog);
    });
  }
}

const logService = new LogService();

module.exports = logService;
