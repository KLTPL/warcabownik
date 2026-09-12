import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import * as bcrypt from "bcrypt";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Rozpoczynam seedowanie bazy danych...");

  await prisma.move.deleteMany();
  await prisma.game.deleteMany();
  await prisma.user.deleteMany();

  console.log("Wyczyszczono stare dane.");

  const salt = await bcrypt.genSalt(10);
  const defaultPasswordHash = await bcrypt.hash("test1234", salt);

  const user1 = await prisma.user.create({
    data: {
      email: "gracz@example.com",
      username: "WarcabowyMistrz",
      passwordHash: defaultPasswordHash,
    },
  });

  const aiBot = await prisma.user.create({
    data: {
      email: "ai@warcaby-system.local",
      username: "AI_BOT_V1",
      passwordHash: defaultPasswordHash,
    },
  });

  console.log(`Utworzono użytkowników: ${user1.username}, ${aiBot.username}`);

  const initialBoard = [
    [0, 2, 0, 2, 0, 2, 0, 2],
    [2, 0, 2, 0, 2, 0, 2, 0],
    [0, 2, 0, 2, 0, 2, 0, 2],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [1, 0, 1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0],
  ];

  const testGame = await prisma.game.create({
    data: {
      whitePlayerId: user1.id,
      blackPlayerId: aiBot.id,
      status: "IN_PROGRESS",
      boardStateJson: JSON.stringify(initialBoard),
    },
  });

  await prisma.move.createMany({
    data: [
      {
        gameId: testGame.id,
        turnNumber: 1,
        playerId: user1.id,
        fromPosition: JSON.stringify({ y: 5, x: 0 }),
        toPosition: JSON.stringify({ y: 4, x: 1 }),
      },
      {
        gameId: testGame.id,
        turnNumber: 2,
        playerId: aiBot.id,
        fromPosition: JSON.stringify({ y: 2, x: 1 }),
        toPosition: JSON.stringify({ y: 3, x: 0 }),
      },
    ],
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
