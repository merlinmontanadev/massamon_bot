const db = require("../config/db");
const {
  generateTicketId
} = require("../helper/generateTicket.js");


function formatDuration(milliseconds) {
  if (milliseconds < 0) return "0s";
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let result = '';
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0) result += `${minutes}m `;
  result += `${seconds}s`;

  return result.trim();
}

function formatToMySQLDateTime(dateObject) {
  return dateObject.toISOString().replace('T', ' ').substring(0, 19);
}

async function createTicket(sender, message) {
  const id = generateTicketId();

  const formattedDate = formatToMySQLDateTime(new Date());

  const ticket = {
    id,
    sender,
    message,
    status: "open",
    createdAt: formattedDate,
  };

  try {
    await db.execute(
      "INSERT INTO tickets (id, sender, message, status, createdAt) VALUES (?, ?, ?, ?, ?)",
      [ticket.id, ticket.sender, ticket.message, ticket.status, ticket.createdAt]
    );
    console.log(`[TICKET SUCCESS] Tiket baru dibuat: ${id}`);
    return ticket;
  } catch (error) {
    console.error(`[CRITICAL DB ERROR] Gagal membuat tiket untuk ${sender}. Cek skema/koneksi DB:`, error.message);
    return {
      id: "FAILED",
      sender,
      message,
      status: "failed"
    };
  }
}

async function findLastOpenTicket(sender) {
  const [rows] = await db.execute(
    `SELECT id, createdAt 
         FROM tickets 
         WHERE sender = ? AND status IN ('open', 'in_progress') 
         ORDER BY createdAt DESC LIMIT 1`,
    [sender]
  );
  return rows.length > 0 ? rows[0] : null;
}

async function releaseTicket(ticketId, createdAtDate) {
  const closedDate = new Date();
  const formattedClosedDate = formatToMySQLDateTime(closedDate);

  const creationTime = new Date(createdAtDate + 'Z').getTime();
  const durationMs = closedDate.getTime() - creationTime;
  const durationString = formatDuration(durationMs);

  try {
    await db.execute(
      `UPDATE tickets 
             SET status = 'closed_pending_rating', 
                 closedAt = ?, 
                 duration = ? 
             WHERE id = ?`,
      [formattedClosedDate, durationString, ticketId]
    );
    console.log(`[TICKET RELEASED] Tiket ${ticketId} ditutup sementara. Durasi: ${durationString}`);

    return {
      duration: durationString
    };

  } catch (error) {
    console.error(`[CRITICAL DB ERROR] Gagal menutup tiket ${ticketId} saat release:`, error.message);
    throw new Error("Gagal menutup tiket di database.");
  }
}

async function updateTicketRating(sender, rating) {
  const [rows] = await db.execute(
    `SELECT id FROM tickets 
         WHERE sender = ? AND status = 'closed_pending_rating' 
         ORDER BY createdAt DESC LIMIT 1`,
    [sender]
  );


  if (rows.length === 0) {
    console.warn(`[RATING WARNING] Tidak ada tiket pending rating yang ditemukan untuk ${sender}.`);
    return;
  }

  const ticketId = rows[0].id;

  try {
    await db.execute(
      `UPDATE tickets 
             SET status = 'closed', 
                 admin_rating = ?
             WHERE id = ?`,
      [rating, ticketId]
    );
    console.log(`[RATING SUCCESS] Tiket ${ticketId} ditutup final dengan rating ${rating}.`);

  } catch (error) {
    console.error(`[CRITICAL DB ERROR] Gagal update rating tiket ${ticketId}:`, error.message);
  }
}

async function getTickets() {
  const [rows] = await db.execute("SELECT * FROM tickets ORDER BY createdAt DESC");
  return rows;
}

async function findTicketById(ticketId) {
  const [rows] = await db.execute("SELECT * FROM tickets WHERE id = ? OR id = ? LIMIT 1", [ticketId, `#${ticketId}`]);
  return rows.length > 0 ? rows[0] : null;
}

module.exports = {
  createTicket,
  getTickets,
  findTicketById,
  updateTicketRating,
  findLastOpenTicket,
  releaseTicket
};