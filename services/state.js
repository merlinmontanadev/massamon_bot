const db = require("../config/db");

async function getUserState(sender) {
  const [rows] = await db.execute("SELECT state FROM user_states WHERE sender = ?", [sender]);
  return rows.length > 0 ? rows[0].state : null;
}

async function setUserState(sender, state) {
  await db.execute("INSERT INTO user_states (sender, state) VALUES (?, ?) ON DUPLICATE KEY UPDATE state = ?", [sender, state, state]);
}

async function resetUserState(sender, state) {
  await setUserState(sender, state);
}

async function getLogs(sender) {
  if (!sender) return [];

  const [rows] = await db.execute("SELECT history FROM conversation_logs WHERE sender = ?", [sender]);

  if (rows.length > 0 && rows[0].history) {
    const historyData = rows[0].history;
    try {
      return typeof historyData === "string" ? JSON.parse(historyData) : historyData;
    } catch (e) {
      console.error("Gagal parse riwayat log JSON:", e);
      return [];
    }
  }
  return [];
}

async function addLog(sender, role, message) {
  const currentHistory = await getLogs(sender);

  const newLogEntry = {
    role,
    message,
    time: new Date().toISOString(),
  };

  currentHistory.push(newLogEntry);

  const newHistoryJson = JSON.stringify(currentHistory);

  await db.execute(
    `INSERT INTO conversation_logs (sender, history) VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE history = ?, lastUpdated = CURRENT_TIMESTAMP`,
    [sender, newHistoryJson, newHistoryJson]
  );
}

module.exports = {
  addLog,
  getUserState,
  setUserState,
  resetUserState,
  getLogs,
};