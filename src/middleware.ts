import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/staff-dashboard(.*)",
  "/staff(.*)",
  "/jobs(.*)",
  "/hr(.*)",
  "/policies(.*)",
  "/notices(.*)",
]);

export default clerkMiddleware(
  async (auth, req) => {
    if (isProtectedRoute(req)) {
      await auth.protect();
    }
  },
  {
    signInUrl: "/employee-login",
    signUpUrl: "/employee-signup",
  },
);

export const config = {
  matcher: [
    "/staff-dashboard",
    "/staff-dashboard/(.*)",
    "/staff/(.*)",
    "/jobs/(.*)",
    "/hr/(.*)",
    "/policies/(.*)",
    "/notices/(.*)",
  ],
};
