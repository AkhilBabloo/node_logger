const {
  singleLineString,
  writeFileStream,
  defaultPlayers,
} = require("../../utils");
const fs = require("fs");
const dayjs = require("dayjs");
const path = require("path");
const { groupBy, orderBy } = require("lodash");
const archiver = require("archiver");
const fsPromises = fs.promises;
const CryptoJS = require("crypto-js");
require("dotenv").config();
class FileService {
  constructor() {
    this.writeFileStream = writeFileStream;
  }
  async getReplayDatas(req, res) {
    const tableId = Number(req.params.tableId);
    const groupCount = Number(req.query.count);
    const playerData = await this.downloadPlayerTotalDetails(req, res);

    if (playerData.length === 0) {
      return [];
    }

    const replayResponse = orderBy(
      playerData.filter(
        (r) =>
          r.status === "AutoResponse" &&
          r.tableId === tableId &&
          r.place === "game"
      ),
      "timestamp",
      "desc"
    );

    let groupedData = [];
    let temp = [];
    let playGroupId;
    let count = 0;

    for (const [index, rp] of replayResponse.entries()) {
      if (
        rp.message[0].action === "WinnerResponse" &&
        rp.message[0].playGroupId
      ) {
        count++;
        playGroupId = rp.message[0].playGroupId;
        temp = [];
        const re = replayResponse[index - 1];
        if (re?.message[0].action === "ResetResponse") {
          temp.push(re);
        }
      }
      if (
        rp.message[0].action === "StartGameResponse" &&
        playGroupId == rp.message[0].playGroupId
      ) {
        temp.push(rp);
        groupedData = [...groupedData, ...temp];
        if (count === groupCount) {
          break;
        }
      } else if (
        rp.message[0].action === "StartGameResponse" &&
        playGroupId !== rp.message[0].playGroupId
      ) {
        temp = [];
      } else {
        temp.push(rp);
      }
    }
    return orderBy([defaultPlayers, ...groupedData], "timestamp", "asc");
  }
  async getReplayDatasForShan(req, res) {
    const roomName = Number(req.params.roomName);
    // const groupCount =  req.query.count|| 4;
    const playerData = await this.downloadPlayerTotalDetails(req, res);

    if (playerData.length === 0) {
      return [];
    }

    const replayResponse = orderBy(
      playerData.filter(
        (r) =>
          r.status === "AutoResponse" &&
          // r.place === "Game" &&
          r.tableId == roomName
      ),
      "timestamp",
      "desc"
    );

    let groupedData = [];
    let temp = [];
    let playGroupId;
    let count = 0;

    // for (const [index, rp] of replayResponse.entries()) {
    //   if (rp.message?.[0]?.data?.["cmd"] === "playGroupId") {
    //     count++;
    //     if (count === 1) {
    //       groupedData.push(rp);
    //       break;
    //     }
    //     groupedData.push(rp);
    //   } else {
    //     groupedData.push(rp);
    //   }
    // }

    return orderBy(replayResponse, "timestamp", "asc");
  }

  async downloadGameResponse(req, res) {
    const playerData = await this.getReplayDatas(req, res);
    const files = [];

    try {
      const jsonPath = `${req.params.tableId}_res.json`;
      const jsonFilePath = path.join(__dirname, jsonPath);
      files.push({
        path: jsonFilePath,
        name: jsonPath,
      });
      await this.writeFileStream(
        jsonFilePath,
        JSON.stringify(playerData, null, 4)
      );
    } catch (error) {
      console.error("Error writing to the file", error);
      return res.status(500).send("Internal Server Error");
    }

    res.attachment(`${req.params.tableId}_res_logs.zip`);
    await this.zipConversion(res, files);
  }

  async replay(req, res) {
    try {
      const filterByPlaygroup = await this.getReplayDatas(req, res);
      const encryptedData = CryptoJS.AES.encrypt(
        JSON.stringify(filterByPlaygroup),
        process.env.AUTH_KEY
      ).toString();
      res.send(encryfilterByPlaygroupptedData);
    } catch (error) {
      console.error("Error in replay:", error);
      res.status(500).send("Internal Server Error");
    }
  }

  async replayShan(req, res) {
    try {
      const filterByPlaygroup = await this.getReplayDatasForShan(req, res);
      // const encryptedData = CryptoJS.AES.encrypt(
      //   JSON.stringify(filterByPlaygroup),
      //   process.env.AUTH_KEY
      // ).toString();
      res.send(filterByPlaygroup);
    } catch (error) {
      console.error("Error in replay:", error);
      res.status(500).send("Internal Server Error");
    }
  }

  async downloadById(req, res) {
    const playerId = req.params.playerId;
    const playGroupIdCount = req.query.count;

    const playerData = await this.downloadPlayerTotalDetails(req, res);

    if (playerData.length === 0) {
      return res.status(404).send("Player not found");
    }

    let error = [];

    const groupedValues = groupBy(
      playerData.filter((r) => {
        if (r.status === "error") {
          error.push(r);
        }
        return r.place;
      }),
      (r) => r.place
    );

    const files = [];
    const groupedGameData = groupBy(
      (groupedValues["game"] ?? []).filter((r) => r.tableId),
      (r) => r.tableId
    );

    const groupedDataWithTableName = {};
    for (const key in groupedGameData) {
      groupedDataWithTableName[`table_${key}`] = groupedGameData[key];
    }
    const game = [];
    let count = 0;

    const orderByDesc = orderBy(
      groupedValues?.["game"],
      (r) => r.timestamp,
      "desc"
    );
    for (let i = 0; i < orderByDesc.length; i++) {
      const r = orderByDesc[i];

      if (count > (playGroupIdCount || 4)) {
        break;
      }
      if (r.message?.[5]?.data?.["cmd"] === "playGroupId") {
        count++;
      }
      game.push(r);
    }

    const mergedData = {
      ...groupedValues,
      ...groupedDataWithTableName,
      error,
      game: orderBy(game, (r) => r.timestamp, "asc"),
    };

    try {
      for (const [status, values] of Object.entries(mergedData)) {
        const timestamp = new Date().getTime();
        const txtFileName = `${status}.log`;
        const txtFilePath = path.join(__dirname, txtFileName);

        files.push({
          path: txtFilePath,
          name: txtFileName,
        });

        let content = "";
        for (const line of values) {
          content += `[${dayjs(line.timestamp).format(
            "YYYY:MM:DD hh:mm:ss a"
          )}] [${line.playerId}] [${line.status}] ${singleLineString(
            line.message
          )}\n`;
        }
        await this.writeFileStream(txtFilePath, content);
      }
    } catch (error) {
      console.error("Error writing to the file", error);
      return res.status(500).send("Internal Server Error");
    }

    res.attachment(`${playerId}_${new Date().getTime()}_logs.zip`);
    await this.zipConversion(res, files);
  }

  async zipConversion(res, files) {
    const archive = archiver("zip", {
      zlib: {
        level: 9,
      },
    });

    archive.on("error", (err) => {
      console.error("Archive error", err);
      return res.status(500).send("Internal Server Error");
    });

    archive.pipe(res);

    files.forEach(({ path, name }) => {
      archive.file(path, {
        name,
      });
    });

    archive.finalize();

    res.on("finish", async () => {
      try {
        for (const file of files) {
          await fsPromises.unlink(file.path);
        }
      } catch (cleanupError) {
        console.error("Error cleaning up files", cleanupError);
      }
    });
  }

  async downloadPlayerTotalDetails(req, res) {
    const playerId = req.params.playerId;
    const logsDir = path.join(".", "logs");
    const playerDir = path.join(logsDir, playerId);

    if (!fs.existsSync(playerDir)) {
      return [];
    }

    const files = await fsPromises.readdir(playerDir);

    let allLogs = [];
    await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(playerDir, file);
        const data = await fsPromises.readFile(filePath, "utf-8");
        const logEntries = JSON.parse(data);
        allLogs = allLogs.concat(logEntries);
      })
    );

    return allLogs.sort((a, b) => a.timestamp - b.timestamp);
  }
}

const fileService = new FileService();

module.exports = fileService;
7;
