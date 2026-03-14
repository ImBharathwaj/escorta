require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

const defaultServices = [
  "Dinner date",
  "Travel companion",
  "Party companion",
  "Massage",
  "Event escort",
  "Social companion",
];

// From docs/services.txt – topics for companion profile
const defaultAdultServices = [
  "Dinner",
  "GFE",
  "PSE",
  "Massage",
  "Lap Dance",
  "Roleplay",
  "Fetish",
  "Overnight",
  "Travel",
  "Grooming",
  "Private Show",
  "Event",
  "Phone",
  "Erotic Photo",
  "Striptease",
  "Intimacy",
  "Kissing",
  "Sex",
  "BDSM",
  "Spanking",
  "Tantric",
  "Couples",
  "Threesome",
  "Girl on Girl",
];

async function main() {
  for (const name of defaultServices) {
    await prisma.service.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log("Seeded default services.");

  for (const name of defaultAdultServices) {
    await prisma.adultService.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log("Seeded default adult services.");

  const adminEmail = process.env.ADMIN_EMAIL || "admin@escorta.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const existingAdmin = await prisma.user.findFirst({
    where: { role: "admin" },
  });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: {
        role: "admin",
        email: adminEmail,
        passwordHash,
      },
    });
    console.log(`Admin user created: ${adminEmail}`);
  } else {
    console.log("Admin user already exists.");
  }

  // Give clients with zero credits some starting credits for testing
  const clientCount = await prisma.user.updateMany({
    where: { role: "client", credits: 0 },
    data: { credits: 50 },
  });
  if (clientCount.count > 0) {
    console.log(`Set 50 credits for ${clientCount.count} client(s) with no credits.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
