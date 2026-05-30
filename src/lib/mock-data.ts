import { Briefcase, Boxes, Package, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type QuickAccessItem = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
};

export const quickAccessItems: QuickAccessItem[] = [
  {
    id: "jobs",
    title: "Job Management",
    description:
      "Assign routes, update job status, and track commercial & residential sanitation schedules.",
    icon: Briefcase,
    href: "#jobs",
  },
  {
    id: "equipment",
    title: "Equipment & Supplies",
    description:
      "Monitor pressure washers, PPE stock, chemical inventory, and vehicle readiness across depots.",
    icon: Package,
    href: "#equipment",
  },
  {
    id: "hr",
    title: "HR & Staff",
    description:
      "View rosters, certifications, leave requests, and supervisor contact lists for active crews.",
    icon: Users,
    href: "#hr",
  },
  {
    id: "stock",
    title: "Request Stock",
    description:
      "Submit supply requests for chemicals, PPE, sanitary products, and operational materials.",
    icon: Boxes,
    href: "#stock",
  },
];

export const sidebarNavItems = [
  { label: "Dashboard", href: "/staff-dashboard", active: false },
  { label: "Jobs", href: "/jobs", active: false },
  { label: "Equipment", href: "#equipment" },
  { label: "HR", href: "/hr", active: false },
  { label: "Stock Requests", href: "#stock" },
  { label: "Settings", href: "#settings" },
];
