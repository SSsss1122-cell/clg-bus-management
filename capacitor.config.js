/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: "com.bus.management",
  appName: "Bus Management",
  webDir: "public", // does NOT matter in dev mode
  bundledWebRuntime: false,

  server: {
    url: "http://10.145.163.215:3000", // 👈 YOUR LOCAL DEV SERVER
    cleartext: true,                   // allow http on Android
    androidScheme: "http"
  }
};

module.exports = config;
