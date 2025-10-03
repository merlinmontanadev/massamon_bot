const axios = require("axios");
const { TOKEN } = require("../config/config");
const { getMenuOptions, formatMenu } = require("./menuDao");

const { addLog, getUserState, setUserState, resetUserState } = require("./state");

const { checkPointInRpr } = require("./gis");

const { createTicket, updateTicketRating } = require("../tickets/tickets.js");

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
      "https://api.fonnte.com/send",
      {
        target: to,
        message,
      },
      {
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
  const lowerCaseMessage = msg.toLowerCase().trim();

  // --- LOGIKA AWAL / GREETING ---
  if (!state) {
    await resetUserState(sender, "main");
    const mainMenuOptions = await getMenuOptions("main");

    return [GREETING_MESSAGE_1, GREETING_MESSAGE_2 + "\n" + MENU_PROMPT + formatMenu(mainMenuOptions)];
  }

  if (state === "search_rpr") {
    const parts = lowerCaseMessage.split(",").map((p) => parseFloat(p.trim()));

    const latitude = parts[0];
    const longitude = parts[1];

    if (parts.length === 2 && !isNaN(longitude) && !isNaN(latitude)) {
      const gisResult = gisService.checkPointInRpr(longitude, latitude);

      await resetUserState(sender, "main");

      const mainMenuOptions = await getMenuOptions("main");
      return [gisResult, MENU_PROMPT + formatMenu(mainMenuOptions)];
    } else {
      // Pesan Error jika format salah
      return ["Format koordinat salah. Mohon gunakan format **LINTANG,BUJUR** (Contoh: -7.15704, 111.884)\n\nKetik '0' atau 'menu' untuk kembali ke menu utama."];
    }
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
        return ["Mohon maaf, terjadi kesalahan teknis saat membuat tiket layanan. Silakan coba lagi nanti."];
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
  const selected = currentMenuOptions.find((item) => parseInt(item.optionKey) === parseInt(msg)); 

if (selected) {
    // --- 1. KASUS SPESIAL: PINDAH KE STATE 'search_rpr' ---
    if (selected.nextKey === 'search_rpr') {
        await setUserState(sender, 'search_rpr');
        
        return [
            "Anda memilih **Pencarian Zona Tata Ruang (RPR)**. 🛰️\n\n" + 
            "Silakan kirimkan koordinat lokasi Anda dalam format:\n" +
            "**LINTANG,BUJUR** (misalnya: -7.15704, 111.884)\n\n" +
            "Ketik '0' atau 'menu' untuk kembali."
        ];
    } 
    
    // --- 2. KASUS PINDAH MENU BIASA ---
    else if (selected.nextKey === "main") {
        await resetUserState(sender, "main");
        return [MENU_PROMPT + formatMenu(await getMenuOptions("main"))];
    } else if (selected.nextKey) {
        await setUserState(sender, selected.nextKey);
        const nextMenuOptions = await getMenuOptions(selected.nextKey);
        return [SUBMENU_PROMPT + formatMenu(nextMenuOptions)];
    } 
    
    // --- 3. KASUS JAWABAN STATIS ---
    // Gunakan optionText karena answerText bisa NULL
    else if (selected.answerText || selected.optionText) { 
        await setUserState(sender, "feedback");
        return [selected.answerText || selected.optionText, FEEDBACK_QUESTION];
    }
}


  // --- LOGIKA FALLBACK ---
  await resetUserState(sender, "");
  return [FALLBACK_MESSAGE];
}

module.exports = {
  sendMessage,
  findAnswer,
};
