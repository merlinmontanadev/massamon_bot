function generateTicketId() {
  const randomInt = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0");
  return `${randomInt}`;
}

module.exports = {
  generateTicketId,
};
