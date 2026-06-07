import { config } from "dotenv";
import { resolve } from "path";
import { prisma } from "../src/lib/prisma";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const employees = await prisma.employee.findMany({
    where: {
      OR: [
        { firstName: { contains: "Cavaney", mode: "insensitive" } },
        { lastName: { contains: "Paris", mode: "insensitive" } },
        { companyEmail: { contains: "vaney", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      companyEmail: true,
    },
  });

  console.log(employees);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
