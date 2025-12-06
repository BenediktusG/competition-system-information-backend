export default {
  // Menggunakan environment node (bukan browser/jsdom)
  testEnvironment: "node",

  // PENTING: Matikan transformasi default.
  // Ini memberitahu Jest: "Jangan compile kode saya, biarkan berjalan sebagai native ESM"
  transform: {},

  // Opsional: Jika error masih muncul, uncomment baris di bawah ini
  // extensionsToTreatAsEsm: [".js"],
};
