class Log {
  constructor(playerId, logs) {
    const { status, time, log, place, tableId } = logs;
    this.status = status;
    this.playerId = playerId;
    this.timestamp = time ?? new Date().getTime();
    this.message = log;
    this.place = place ?? "unknown";
    this.tableId = tableId ? Number(tableId) : null;
  }
}

module.exports = { Log };
