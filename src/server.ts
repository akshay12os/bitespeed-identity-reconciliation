import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();
const prisma = new PrismaClient();
const app = express();

app.use(express.json()); // This lets us accept JSON body in requests

app.post("/identify", async (req: Request, res: Response) => {
  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    return res.status(400).json({ error: "Email or phoneNumber is required" });
  }

  // Find existing contacts by email or phone number
  const conditions = [];
  if (email) conditions.push({ email });
  if (phoneNumber) conditions.push({ phoneNumber });

  const contacts = await prisma.contact.findMany({
    where: { OR: conditions },
    orderBy: { createdAt: "asc" },
  });

  if (contacts.length === 0) {
    const newContact = await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: "PRIMARY",
      },
    });

    return res.status(200).json({
      contact: {
        primaryContactId: newContact.id,
        emails: [newContact.email],
        phoneNumbers: [newContact.phoneNumber],
        secondaryContactIds: [],
      },
    });
  }

  let primary = contacts.find(c => c.linkPrecedence === "PRIMARY") || contacts[0];
  for (const c of contacts) {
    if (c.createdAt < primary.createdAt) {
      primary = c;
    }
  }

  const isExactMatch = contacts.some(
    c => c.email === email && c.phoneNumber === phoneNumber
  );

  if (!isExactMatch) {
    await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: "SECONDARY",
        linkedId: primary.id,
      },
    });
  }

  const allContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { id: primary.id },
        { linkedId: primary.id }
      ]
    }
  });

  const emails = Array.from(new Set(allContacts.map(c => c.email).filter(Boolean)));
  const phoneNumbers = Array.from(new Set(allContacts.map(c => c.phoneNumber).filter(Boolean)));
  const secondaryContactIds = allContacts
    .filter(c => c.linkPrecedence === "SECONDARY")
    .map(c => c.id);

  return res.status(200).json({
    contact: {
      primaryContactId: primary.id,
      emails,
      phoneNumbers,
      secondaryContactIds,
    },
  });
});

app.listen(3000, () => {
  console.log("✅ Server running at http://localhost:3000");
});
