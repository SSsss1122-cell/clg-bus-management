export const API_BASE =
  typeof window !== "undefined" && window.Capacitor
    ? "https://clg-bus-management-gc6w-ih9w6pqgv-sssss1122-cells-projects.vercel.app"
    : process.env.NODE_ENV === "development"
    ? ""
    : "https://clg-bus-management-gc6w-ih9w6pqgv-sssss1122-cells-projects.vercel.app";