import { Briefcase, LayoutDashboard, Package, Shield, User, Users } from "lucide-react";
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
    id: "dashboard",
    title: "Dashboard",
    description: "Your staff workspace, welcome card, and personal activity summary.",
    icon: LayoutDashboard,
    href: "/staff-dashboard",
  },
  {
    id: "jobs",
    title: "Work Locations",
    description:
      "Assign routes, update job status, and track commercial & residential sanitation schedules.",
    icon: Briefcase,
    href: "/jobs",
  },
  {
    id: "equipment-supplies",
    title: "Equipment & Supplies",
    description:
      "Search inventory, check availability, request equipment, supplies and consumables.",
    icon: Package,
    href: "/equipment-supplies",
  },
  {
    id: "hr",
    title: "Human Resources",
    description:
      "View rosters, certifications, leave requests, and supervisor contact lists for active crews.",
    icon: Users,
    href: "/hr",
  },
  {
    id: "my-profile",
    title: "My Profile",
    description: "Update contact details, emergency contacts, and your profile photo.",
    icon: User,
    href: "/my-profile",
  },
  {
    id: "admin",
    title: "Admin",
    description: "Approvals, employee accounts, stock, and bin service management.",
    icon: Shield,
    href: "/admin",
  },
];

export const sidebarNavItems = [
  { label: "Dashboard", href: "/staff-dashboard", active: false },
  { label: "Work Locations", href: "/jobs", active: false },
  { label: "Equipment & Supplies", href: "/equipment-supplies", active: false },
  { label: "Human Resources", href: "/hr", active: false },
  { label: "My Profile", href: "/my-profile", active: false },
  { label: "Admin", href: "/admin", active: false },
];
