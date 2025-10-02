// FAQ
const faq = [
  {
    key: "1",
    question: "Jam buka",
    answer: "Kami buka setiap hari 08.00–17.00 WIB",
  },
  {
    key: "2",
    question: "Alamat kantor",
    answer: "Jalan Raya No.123",
  },
  {
    key: "3",
    question: "Nomor kantor",
    answer: "Telepon kami: 0353-123456",
  },
  {
    key: "0",
    question: "Kembali ke menu utama",
  },
];

// Menu utama & turunan
const menu = {
  main: [
    {
      key: "1",
      text: "Menu 1",
      next: "menu2",
    },
    {
      key: "2",
      text: "Menu 2",
      next: "menu3",
    },
    {
      key: "3",
      text: "Layanan FAQ",
      next: "faq",
    },
    {
      key: "4",
      text: "Terhubung dengan Admin",
      next: "admin_offer",
    },
  ],
  faq: faq.map((item) => ({
    key: item.key,
    text: item.question,
    answer: item.answer,
    next: item.key === "0" ? "main" : null,
  })),
  menu2: [
    {
      key: "1",
      text: "Menu 1.1",
    },
    {
      key: "2",
      text: "Menu 1.2",
    },
    {
      key: "0",
      text: "Kembali ke menu utama",
      next: "main",
    },
  ],
  menu3: [
    {
      key: "1",
      text: "Menu 2.1",
    },
    {
      key: "2",
      text: "Menu 2.2",
    },
    {
      key: "0",
      text: "Kembali ke menu utama",
      next: "main",
    },
  ],
};

function formatMenu(menuOptions) {
  return menuOptions.map((item) => `${item.key}. ${item.text}`).join("\n");
}

module.exports = {
  menu,
  formatMenu,
};
