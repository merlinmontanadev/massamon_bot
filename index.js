const express = require("express");
const bodyParser = require("body-parser");
const { PORT } = require("./config/config");
const { addLog, setUserState } = require("./services/state");
const { sendMessage, findAnswer } = require("./services/bot");

const { getTickets, findTicketById } = require("./tickets/tickets");

const logsRoute = require("./routes/logs");

const app = express();
app.use(bodyParser.json());

// Webhook
app.post("/webhook", async (req, res) => {
  const { sender, message } = req.body;
  console.log(`Pesan dari ${sender}: ${message}`);

  await addLog(sender, "user", message);

  const replies = await findAnswer(message, sender);
  for (const r of replies) {
    await sendMessage(sender, r);
    await addLog(sender, "bot", r);
  }

  res.sendStatus(200);
});

// Routes
app.use("/logs", logsRoute);

app.get("/tickets", async (req, res) => {
  res.json(await getTickets());
});

app.get("/admin/takeover/:ticketId", async (req, res) => {
  const ticketId = req.params.ticketId;

  let ticket = await findTicketById(ticketId);

  if (!ticket) {
    return res.status(404).send(`❌ Ticket dengan ID ${ticketId} tidak ditemukan`);
  }

  await setUserState(ticket.sender, "in_admin_chat");

  res.send(`✅ Bot OFF. Admin takeover untuk tiket ${ticket.id} (sender: ${ticket.sender})`);
});

app.get("/admin/release/:ticketId", async (req, res) => {
  const ticketId = req.params.ticketId;

  let ticket = await findTicketById(ticketId);

  if (!ticket) {
    return res.status(404).send(`❌ Ticket dengan ID ${ticketId} tidak ditemukan`);
  }

  const sender = ticket.sender;

  await setUserState(sender, "post_admin_feedback");

  // Pesan ini harus konsisten dengan pesan yang diminta Bot.js untuk dikirim setelah release.
  const feedbackMessage = "Terima kasih telah menunggu. Kami harap layanan Admin kami memuaskan. Mohon berikan penilaian Anda (1-5, di mana 5 = Sangat Puas):";

  await sendMessage(sender, feedbackMessage);
  await addLog(sender, "bot", feedbackMessage);

  res.send(`✅ Bot ON. Penilaian dikirim untuk tiket ${ticket.id} (sender: ${ticket.sender})`);
});

app.get("/", (req, res) => {
  res.send(`
    <span>🤖 Chatbot API is running, By : Merlin Montana!</span>
    <span><a href="https://www.tiktok.com/@merlin_montana7" target="_blank">
      (https://www.tiktok.com/@merlin_montana7)
    </a> 🚀</span>
  `);
});

app.listen(PORT, () => console.log(`Server jalan di port ${PORT}`));
