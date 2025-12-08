import type { NextRequest } from 'next/server';

export const config = {
  matcher: ['/api/:path*'], // intercept all /api routes
};

export async function proxy(request: NextRequest) {
  console.log("---- PROXY START ----");
  console.log("INCOMING:", request.url);

  const backend = "https://clg-bus-management-gsic.vercel.app";

  const finalUrl = new URL(
    request.nextUrl.pathname + request.nextUrl.search,
    backend
  );

  console.log("FORWARDING TO:", finalUrl.toString());
  console.log("---- PROXY END ----");

  const response = await fetch(finalUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });

  return response;
}
