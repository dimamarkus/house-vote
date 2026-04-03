import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes
const isPublicRoute = createRouteMatcher([
  '/',             // Home page
  '/about',        // About page (assuming it exists or will be created)
  '/invite(.*)',   // Invite page and its sub-routes
  '/sign-in(.*)',  // Sign-in page and its sub-routes
  '/sign-up(.*)',  // Sign-up page and its sub-routes
  '/api/webhooks/(.*)', // Example public API webhook route
]);

export default clerkMiddleware((auth, request) => {
  // Protect routes that are not public
  if (!isPublicRoute(request)) {
    auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!.+\\.[\\w]+$|_next).*)',
    // Re-include any files in the api or trpc folders that might have an extension
    '/',
    '/(api|trpc)(.*)',
  ],
};