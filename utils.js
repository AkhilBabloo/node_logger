const fs = require("fs");
const path = require("path");
const fss = require("fs").promises;
const { first, last } = require("lodash");

const logsDir = path.join(__dirname, "logs");

function objectToString(obj) {
  return JSON.stringify(obj);
}

const singleLineString = (d) => {
  return (Array.isArray(d) ? d : [d])
    .map((item) => {
      if (typeof item === "object") {
        return objectToString(item);
      }
      return item;
    })
    .join(" ");
};

const writeJSON = async (playerId, log) => {
  const playerDir = path.join(logsDir, playerId);
  if (!fs.existsSync(playerDir)) {
    fs.mkdirSync(playerDir);
  }
  await addLogEntry(log, playerDir);
};

const writeBulkJSON = async (playerId, loglist) => {
  const playerDir = path.join(logsDir, playerId);
  if (!fs.existsSync(playerDir)) {
    fs.mkdirSync(playerDir);
  }

  await addLogEntry(loglist, playerDir);
};

async function addLogEntry(newLog, logDirectory) {
  try {
    const files = (await fss.readdir(logDirectory)).sort(
      (a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0])
    );

    if (files.length === 0) {
      const nextFilePath = path.join(logDirectory, "data1.json");
      await writeLogToFile(newLog, nextFilePath);
      return;
    }
    const lastFilePath = path.join(logDirectory, last(files));
    const firstFilePath = path.join(logDirectory, first(files));
    const stats = await fss.stat(lastFilePath);
    const lastFileSizeMB = stats.size / (1024 * 1024);
    if (lastFileSizeMB >= parseInt(process.env.FILESIZE || 1)) {
      const nextFileNumber = parseInt(last(files).match(/\d+/)[0]) + 1;
      const nextFilePath = path.join(
        logDirectory,
        `data${nextFileNumber}.json`
      );
      await writeLogToFile(newLog, nextFilePath);
      if (files.length >= parseInt(process.env.FILECOUNTPERUSER || 5)) {
        fss.unlink(firstFilePath);
      }
    } else {
      await addLogToExistingFile(newLog, lastFilePath);
    }
  } catch (error) {
    console.error("Error adding log entry:", error);
  }
}

async function writeLogToFile(newLog, filePath) {
  let logs = [];
  logs.push(...(Array.isArray(newLog) ? newLog : [newLog]));
  try {
    await fss.writeFile(filePath, JSON.stringify(logs, null, 4), "utf8");
    console.log(`Log entry added to file: ${filePath}`);
  } catch (error) {
    console.error(`Error writing log to file ${filePath}:`, error);
  }
}

async function addLogToExistingFile(newLog, filePath) {
  try {
    const fileHandle = await fss.open(filePath, "r+");
    const stats = await fileHandle.stat();

    const logs = Array.isArray(newLog) ? newLog : [newLog];

    const buffer = Buffer.alloc(2);
    await fileHandle.read(buffer, 0, 2, stats.size - 2);
    const lastChars = buffer.toString();
    if (lastChars === "[\n") {
      const newContent = logs
        .map((log) => JSON.stringify(log, null, 4))
        .join(",\n    ");
      await fileHandle.write(`    ${newContent}\n]`, stats.size - 1, "utf8");
    } else {
      const newContent = logs
        .map((log) => JSON.stringify(log, null, 4))
        .join(",\n    ");
      await fileHandle.write(`,\n    ${newContent}\n]`, stats.size - 1, "utf8");
    }

    await fileHandle.close();
    console.log("Log entry added successfully.");
  } catch (error) {
    console.error("Error updating the JSON file:", error);
  }
}

const writeFileStream = (filePath, content) => {
  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(filePath, { flags: "a" });
    writeStream.write(content);
    writeStream.end();
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });
};

// async function addLogToExistingFile(newLog, filePath) {
//   try {
//     const data = await fss.readFile(filePath, "utf8");
//     let logs = JSON.parse(data);
//     logs.push(...(Array.isArray(newLog) ? newLog : [newLog]));
//     await fss.writeFile(filePath, JSON.stringify(logs, null, 4), "utf8");
//     console.log(`Log entry added to file: ${filePath}`);
//   } catch (error) {
//     console.error(`Error adding log to file ${filePath}:`, error);
//   }
// }

const defaultPlayers = {
  status: "AutoResponse",
  playerId: "2656",
  timestamp: 1717566317051,
  message: [
    {
      action: "DefaultPlayersUpdate",
      players: [],
      roomId: 20246,
    },
  ],
  place: "game",
  tableId: 20246,
};

module.exports = {
  singleLineString,
  writeJSON,
  writeBulkJSON,
  writeFileStream,
  defaultPlayers,
};
