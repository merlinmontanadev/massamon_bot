// services/gis.js
const turf = require("@turf/turf");
const fs = require("fs"); // Module bawaan Node.js untuk Filesystem
const path = require("path"); // Module bawaan untuk path file

// Tentukan path ke file GeoJSON lokal
const GEOJSON_FILE_PATH = path.join(__dirname, "..", "../assets/RPR.geojson"); // Mencari RPR.geojson di root directory
let rprData = null;

// Fungsi untuk memuat data GeoJSON dari file lokal (Synchronous, karena hanya dilakukan saat startup)
function loadRprData() {
  try {
    console.log(`Memuat data GeoJSON RPR dari: ${GEOJSON_FILE_PATH}`);

    // 1. Baca isi file secara synchronous (dilakukan sekali saat bot start)
    const fileContent = fs.readFileSync(GEOJSON_FILE_PATH, "utf8");

    // 2. Parse JSON
    rprData = JSON.parse(fileContent);

    console.log("Data GeoJSON RPR berhasil dimuat dari file lokal.");
  } catch (error) {
    console.error("Kesalahan fatal: Gagal memuat atau mem-parse file RPR.geojson:", error.message);
    rprData = null;
  }
}

// Fungsi utama untuk analisis Point-in-Polygon
function checkPointInRpr(longitude, latitude) {
  if (!rprData) {
    return "ERROR: Data tata ruang lokal (RPR.geojson) tidak dapat diakses atau gagal dimuat.";
  }

  const point = turf.point([longitude, latitude]);
  let result = null;

  // Iterasi melalui semua Poligon (features)
  for (const feature of rprData.features) {
    if (turf.booleanPointInPolygon(point, feature.geometry)) {
      result = feature.properties;
      break;
    }
  }

  if (result) {
    // --- 1. Ambil Semua Properti yang Diminta ---
    const zoneName = result.NAMOBJ || "Zona Tidak Dikenal";
    const diizinkan = result.izinkan || "Tidak ada detail peruntukan umum."; // Menggunakan Peruntukan untuk Diizinkan
    const bersyarat = result.bersyarat || "Tidak ada kegiatan bersyarat.";
    const terbatas = result.terbatas || "Tidak ada kegiatan terbatas.";
    const dilarang = result.dilarang || "Tidak ada kegiatan dilarang.";

    // --- 2. Format Hasil Respons ---
    let response = `✅ Lokasi Ditemukan!\n\nLokasi Anda di Peruntukan:\n*${zoneName}*\n\n`;

    // Tambahkan detail perizinan
    response += "--- Detail Recana Pola Ruang ---\n";

    // Diizinkan (Peruntukan)
    response += `*🟢 Diizinkan :\n${diizinkan}\n`;

    // Bersyarat/Terbatas (Bersyarat)
    // Jika ada nilai, tambahkan sebagai list
    response += `\n*⚠️ Bersyarat/Terbatas:\n${bersyarat}\n`;

    response += `\n*🚫 Terbatas:\n${terbatas}\n`;

    // Dilarang
    response += `\n*⛔ Dilarang:\n${dilarang}\n`;

    return response;
  } else {
    return "❌ Koordinat tidak berada di dalam zona tata ruang yang terdefinisi (atau di luar Bojonegoro).";
  }
}

// Muat data saat modul di-load
loadRprData();

module.exports = {
  checkPointInRpr,
};
