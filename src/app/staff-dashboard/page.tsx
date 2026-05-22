import { UserButton } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Briefcase, ClipboardList, FileText, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { COMPANY } from "@/lib/constants";

const placeholderCards = [
  {
    title: "Job Management",
    description: "Assigned routes, job status, and daily sanitation schedules.",
    icon: Briefcase,
  },
  {
    title: "HR Section",
    description: "Roster visibility, certifications, and supervisor contacts.",
    icon: Users,
  },
  {
    title: "Internal Notices",
    description: "Shift reminders, safety updates, and route change alerts.",
    icon: ClipboardList,
  },
  {
    title: "Policies",
    description: "Company procedures, PPE requirements, and compliance guides.",
    icon: FileText,
  },
];

export default async function StaffDashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/employee-login");
  }

  const user = await currentUser();
  const displayName =
    user?.firstName ??
    user?.emailAddresses[0]?.emailAddress?.split("@")[0] ??
    "Employee";

  return (
    <main className="relative min-h-dvh">
      <div
        className="pointer-events-none absolute inset-0 industrial-grid opacity-20"
        aria-hidden="true"
      />
      <header className="relative z-10 border-b border-[#ebfbff]/10 bg-[#0c151d]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#259f00] to-[#6cc801] text-sm font-bold text-[#0c151d]">
              PS
            </div>
            <div>
              <p className="text-sm font-bold text-[#ebfbff]">{COMPANY.shortName}</p>
              <p className="text-xs text-[#ebfbff]/50">Staff Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm text-[#ebfbff]/60 hover:text-[#ebfbff] transition-colors"
            >
              Portal Home
            </Link>
            <UserButton />
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="glass-card mb-6 rounded-2xl p-6 sm:p-8">
          <p className="text-sm font-medium text-[#00c6ff]">Welcome Card</p>
          <h1 className="mt-2 text-2xl font-bold text-[#ebfbff] sm:text-3xl">
            Welcome back, {displayName}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-[#ebfbff]/60 sm:text-base">
            This is your temporary staff workspace. Job management, HR tools, and
            operational modules will be connected here in a future release.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {placeholderCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="glass-card rounded-2xl p-5 sm:p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00c6ff]/15 text-[#00c6ff]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-lg font-bold text-[#ebfbff]">{card.title}</h2>
                <p className="mt-2 text-sm text-[#ebfbff]/55">{card.description}</p>
                <p className="mt-4 text-xs font-medium text-[#6cc801]">Coming soon</p>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
