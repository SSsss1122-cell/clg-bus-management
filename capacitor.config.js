/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: "com.bus.management",
  appName: "Bus Management",
  webDir: "public",  // MUST exist, but will not be used
  bundledWebRuntime: false,

  server: {
    url: "https://clg-bus-management-y2ra.vercel.app", // 👈 LOAD YOUR WEBSITE DIRECTLY
    cleartext: true,
    androidScheme: "https"
  }
};

module.exports = config;
