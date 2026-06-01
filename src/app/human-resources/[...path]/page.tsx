import { redirect } from "next/navigation";

type HumanResourcesCatchAllProps = {
  params: Promise<{ path: string[] }>;
};

export default async function HumanResourcesCatchAllPage({
  params,
}: HumanResourcesCatchAllProps) {
  const { path } = await params;
  const suffix = path.length > 0 ? `/${path.join("/")}` : "";
  redirect(`/hr${suffix}`);
}
