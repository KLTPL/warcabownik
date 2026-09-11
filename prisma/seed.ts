import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  ScooterStatus,
  UserRole,
} from "../generated/prisma/client";
import * as bcrypt from "bcrypt";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.rental.deleteMany();
  await prisma.scooter.deleteMany();
  await prisma.scooterModel.deleteMany();
  await prisma.user.deleteMany();

  const defaultPassword = await bcrypt.hash("i-DO-pieca67!", 10);

  await prisma.user.create({
    data: {
      firstName: "Admin",
      lastName: "User",
      email: "admin@example.com",
      phoneNumber: "+48111222333",
      hashedPassword: defaultPassword,
      role: UserRole.ADMIN,
    },
  });

  const customer = await prisma.user.create({
    data: {
      firstName: "John",
      lastName: "Doe",
      email: "customer@example.com",
      phoneNumber: "+48999888777",
      hashedPassword: defaultPassword,
      role: UserRole.USER,
    },
  });

  const modelA = await prisma.scooterModel.create({
    data: {
      brand: "Ninebot",
      modelName: "Max G30",
      maxSpeed: 25.0,
      range: 65.0,
    },
  });

  const modelB = await prisma.scooterModel.create({
    data: {
      brand: "Xiaomi",
      modelName: "Mi Pro 2",
      maxSpeed: 25.0,
      range: 45.0,
    },
  });

  const scooter1 = await prisma.scooter.create({
    data: {
      serialNumber: "NB-MAX-001",
      status: ScooterStatus.AVAILABLE,
      modelId: modelA.id,
    },
  });

  const scooter2 = await prisma.scooter.create({
    data: {
      serialNumber: "XI-PRO-001",
      status: ScooterStatus.IN_USE,
      modelId: modelB.id,
    },
  });

  await prisma.rental.create({
    data: {
      startTime: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      endTime: new Date(Date.now() - 1000 * 60 * 60 * 1), // 1 hour ago
      cost: 15.5,
      userId: customer.id,
      scooterId: scooter1.id,
    },
  });

  await prisma.rental.create({
    data: {
      startTime: new Date(),
      userId: customer.id,
      scooterId: scooter2.id,
    },
  });
  console.log("Seed completed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
