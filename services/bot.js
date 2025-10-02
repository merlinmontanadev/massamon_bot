const axios = require("axios");
const {
  TOKEN
} = require("../config/config");
const {
  getMenuOptions,
  formatMenu
} = require("./menuDao");

const {
  addLog,
  getUserState,
  setUserState,
  resetUserState
} = require("./state");

const {
  createTicket,
  updateTicketRating
} = require("../tickets/tickets.js");

// --- PESAN STATIS (Sesuai Rollback) ---
const GREETING_MESSAGE_1 =
  "Sugeng rawuh, Medhayoh ing Kabupaten Bojonegoro,\n\n" +
  "Selamat datang di WhatsApp resmi layanan Website SAMIN Bojonegoro\n" +
  "Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu Kabupaten Bojonegoro.\n" +
  "Sekarang Anda terhubung dengan MAS SAMIN (Message Auto Service Samin),\n" +
  "Virtual Asistant SAMIN siap membantu Anda.";
const GREETING_MESSAGE_2 = "Ada yang bisa MAS SAMIN bantu terkait Investasi di Kabupaten Bojonegoro?";
const MENU_PROMPT = "Silakan pilih menu:\n";
const SUBMENU_PROMPT = "Silakan pilih menu selanjutnya:\n";
const WAITING_ADMIN_MESSAGE = "Silakan tunggu sebentar, Admin akan segera menghubungi Anda.";
const FALLBACK_MESSAGE = "Mohon Maaf MAS SAMIN tidak dapat menemukan jawaban untuk pertanyaan Anda.";
const FEEDBACK_QUESTION = "Apakah Jawaban Mas Samin membantu menjawab pertanyaan Anda?\n1. Ya\n2. Tidak";
const ADMIN_OFFER_TEXT = "Apakah Anda ingin terhubung dengan Admin untuk bantuan lebih lanjut?";
const ADMIN_OFFER_OPTIONS = "1. Hubungkan dengan admin\n0. Kembali ke menu utama";
const RATING_ADMIN_PROMPT = "Terima kasih telah menunggu. Kami harap layanan Admin kami memuaskan. Mohon berikan penilaian Anda (1-5, di mana 5 = Sangat Puas):";
const RATING_BOT_SUCCESS = "Terima kasih atas feedback Anda.\nUntuk harapnya Anda dapat mengisi Survey Kepuasan Masyarakat terkait layanan kami melalui link berikut: https://s.id/Kn80D";

async function sendMessage(to, message) {
  try {
    await axios.post(
      "https://api.fonnte.com/send", {
        target: to,
        message,
      }, {
        headers: {
          Authorization: TOKEN,
        },
      }
    );
  } catch (err) {
    console.error("Gagal kirim pesan:", err.response.data || err.message);
  }
}

async function findAnswer(msg, sender) {
  const state = await getUserState(sender);

  // --- LOGIKA AWAL / GREETING ---
  if (!state) {
    await resetUserState(sender, "main");
    const mainMenuOptions = await getMenuOptions("main");

    return [GREETING_MESSAGE_1, GREETING_MESSAGE_2 + "\n" + MENU_PROMPT + formatMenu(mainMenuOptions)];
  }

  // --- LOGIKA LOCK STATE (ADMIN) ---
  if (state === "waiting_admin") {
    return [WAITING_ADMIN_MESSAGE];
  }

  // --- LOGIKA PENILAIAN (POST-ADMIN FEEDBACK) ---
  if (state === "post_admin_feedback") {
    const rating = parseInt(msg.trim());
    if (rating >= 1 && rating <= 5) {
      await updateTicketRating(sender, rating);
      await resetUserState(sender, "");
      return [`Terima kasih atas penilaian ${rating} Anda untuk layanan Admin. Kami akan terus meningkatkan kualitas layanan kami.`, RATING_BOT_SUCCESS];
    } else {
      return ["Mohon maaf, format penilaian tidak valid. Masukkan angka dari 1 sampai 5.", RATING_ADMIN_PROMPT];
    }
  }

  // --- LOGIKA PENILAIAN BOT (FEEDBACK) ---
  if (state === "feedback") {
    if (msg === "1" || msg.toLowerCase() === "ya") {
      await resetUserState(sender, "");

      return [RATING_BOT_SUCCESS];
    } else if (msg === "2" || ["tidak", "no"].includes(msg.toLowerCase())) {
      await setUserState(sender, "admin_offer");
      return [ADMIN_OFFER_TEXT, ADMIN_OFFER_OPTIONS];
    }
  }

  // --- LOGIKA TAWARAN ADMIN ---
  if (state === "admin_offer") {
    if (msg === "1") {
      const ticket = await createTicket(sender, "User ingin terhubung dengan Admin");

      if (ticket.id === "FAILED") {
        return [
          "Mohon maaf, terjadi kesalahan teknis saat membuat tiket layanan. Silakan coba lagi nanti."
        ];
      }

      await setUserState(sender, "waiting_admin");
      await addLog(sender, "system", `Tiket dibuat: ID ${ticket.id}, Status: waiting_admin`);
      return [`Baik, MAS SAMIN telah membuat tiket dengan ID ${ticket.id}.`, WAITING_ADMIN_MESSAGE];

    } else if (msg === "0") {
      await resetUserState(sender, "main");
      return [MENU_PROMPT + formatMenu(await getMenuOptions("main"))];
    }
  }

  // --- LOGIKA CHAT ADMIN (BOT SILENT) ---
  if (state === "in_admin_chat") {
    await addLog(sender, "user", msg);
    return [];
  }

  // --- LOGIKA MENU DINAMIS ---
  const currentMenuOptions = await getMenuOptions(state);
  const selected = currentMenuOptions.find((item) => item.key === msg);

  if (selected) {
    if (selected.next === "main") {
      await resetUserState(sender, "main");
      return [MENU_PROMPT + formatMenu(await getMenuOptions("main"))];
    } else if (selected.next) {
      await setUserState(sender, selected.next);
      const nextMenuOptions = await getMenuOptions(selected.next);
      return [SUBMENU_PROMPT + formatMenu(nextMenuOptions)];
    } else if (selected.answer || selected.text) {
      await setUserState(sender, "feedback");
      return [selected.answer || selected.text, FEEDBACK_QUESTION];
    }
  }

  // --- LOGIKA FALLBACK ---
  await resetUserState("");
  return [FALLBACK_MESSAGE];
}

module.exports = {
  sendMessage,
  findAnswer,
};