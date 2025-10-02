const db = require("../config/db");
const { generateTicketId } = require("../helper/generateTicket.js");

async function createTicket(sender, message) {
  const id = generateTicketId();
  const ticket = {
    id,
    sender,
    message,
    status: "open",
    createdAt: new Date().toISOString(),
  };

  await db.execute("INSERT INTO tickets (id, sender, message, status, createdAt) VALUES (?, ?, ?, ?, ?)", [ticket.id, ticket.sender, ticket.message, ticket.status, ticket.createdAt]);

  return ticket;
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
};
