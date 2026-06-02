import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env.local") });

const prisma = new PrismaClient();
const result = await prisma.loginAttempt.deleteMany();
console.log(`Cleared ${result.count} login attempt record(s).`);
await prisma.$disconnect();
