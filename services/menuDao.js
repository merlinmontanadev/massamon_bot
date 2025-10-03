const db = require("../config/db");

async function getMenuOptions(menuKey) {
  if (!menuKey) return [];

  const [rows] = await db.execute(
    `SELECT 
        optionKey AS 'key', 
        optionText AS 'text', 
        nextKey AS 'next', 
        answerText AS 'answer' 
    FROM menu_structure 
    WHERE menuKey = ? 
    ORDER BY 
        -- 1. Pisahkan opsi '0' (TRUE = 1) dari opsi lainnya (FALSE = 0)
        (optionKey = '0') ASC, 
        -- 2. Urutkan opsi lainnya secara numerik
        CAST(optionKey AS UNSIGNED) ASC`,
    [menuKey]
  );
  return rows;
}

function formatMenu(menuOptions) {
  if (!Array.isArray(menuOptions) || menuOptions.length === 0) {
    return "Menu tidak tersedia.";
  }

  const menuString = menuOptions
    .map((item) => {
      return `${item.key}. ${item.text}`;
    })
    .join("\n");

  return menuString;
}

module.exports = {
  getMenuOptions,
  formatMenu,
};