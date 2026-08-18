import { clerkMiddleware } from "@clerk/nextjs/server";

// clerkMiddleware() with no handler just ensures Clerk session cookies are
// processed on every request. Auth enforcement is done per-page and per-API
// route (not via path matching here) — following Clerk's recommended pattern.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
