"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client"); // Import LinkPrecedence enum
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const prisma = new client_1.PrismaClient();
const app = (0, express_1.default)();
// --- CHANGE 1: Use environment variable for port for deployment ---
const port = process.env.PORT || 3000;
app.use(express_1.default.json());
app.post("/identify", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { email, phoneNumber } = req.body;
    if (!email && !phoneNumber) {
        return res.status(400).json({ error: "Email or phoneNumber is required" });
    }
    try {
        // --- CHANGE 2: Initial query to find all potentially related contacts ---
        // Find contacts that match either the incoming email or phone number.
        // Also consider contacts linked to these, as they might be part of the same chain.
        const matchingContacts = yield prisma.contact.findMany({
            where: {
                OR: [
                    // Match by incoming email
                    email ? { email: email } : {},
                    // Match by incoming phone number
                    phoneNumber ? { phoneNumber: phoneNumber } : {},
                ],
                deletedAt: null, // Only consider non-deleted contacts
            },
            orderBy: { createdAt: "asc" }, // Order by creation date to easily find the oldest
        });
        let primaryContact = null;
        ;
        let secondaryContacts = [];
        let newContactCreated = false;
        // --- CHANGE 3: Comprehensive Reconciliation Logic ---
        if (matchingContacts.length === 0) {
            // Case 1: No existing contact found - Create a new primary contact
            primaryContact = yield prisma.contact.create({
                data: {
                    email,
                    phoneNumber,
                    linkPrecedence: client_1.LinkPrecedence.PRIMARY,
                },
            });
            newContactCreated = true; // Flag that a new contact was just made
        }
        else {
            // Case 2: Existing contacts found - Reconcile identities
            // Find the absolute oldest contact among all matched contacts and their linked chain
            // This handles scenarios where two primary contacts might merge.
            let allRelatedContactIds = new Set();
            let currentBatchIds = new Set(matchingContacts.map(c => c.id));
            // Iteratively find all contacts linked to the initial set
            // This loop ensures we find all contacts in a linked chain,
            // regardless of how many layers of secondary links exist (though schema implies direct primary link).
            while (currentBatchIds.size > 0) {
                const nextBatchIds = new Set();
                const idsToQuery = Array.from(currentBatchIds).filter(id => !allRelatedContactIds.has(id));
                if (idsToQuery.length === 0)
                    break; // No new IDs to process
                allRelatedContactIds = new Set([...Array.from(allRelatedContactIds), ...idsToQuery]);
                const relatedByLinkedId = yield prisma.contact.findMany({
                    where: {
                        OR: [
                            { linkedId: { in: idsToQuery } }, // Contacts whose linkedId points to current batch
                            { id: { in: idsToQuery } } // Contacts in the current batch itself
                        ],
                        deletedAt: null
                    },
                    orderBy: { createdAt: "asc" }
                });
                for (const contact of relatedByLinkedId) {
                    if (!allRelatedContactIds.has(contact.id)) {
                        nextBatchIds.add(contact.id);
                    }
                    if (contact.linkedId && !allRelatedContactIds.has(contact.linkedId)) {
                        nextBatchIds.add(contact.linkedId);
                    }
                }
                currentBatchIds = nextBatchIds;
            }
            // Fetch all unique contacts identified in the reconciliation process
            const reconciledContacts = yield prisma.contact.findMany({
                where: {
                    id: { in: Array.from(allRelatedContactIds) },
                    deletedAt: null
                },
                orderBy: { createdAt: "asc" } // Ensure oldest is first
            });
            // The absolute oldest contact becomes the primary
            primaryContact = reconciledContacts[0];
            // Update linkPrecedence and linkedId for all other contacts in the chain
            for (const contact of reconciledContacts) {
                if (contact.id !== primaryContact.id) {
                    // If it's a primary that needs to become secondary, or a secondary with wrong linkedId
                    if (contact.linkPrecedence === client_1.LinkPrecedence.PRIMARY || contact.linkedId !== primaryContact.id) {
                        yield prisma.contact.update({
                            where: { id: contact.id },
                            data: {
                                linkPrecedence: client_1.LinkPrecedence.SECONDARY,
                                linkedId: primaryContact.id,
                                updatedAt: new Date(), // Manually update updatedAt if not handled by @updatedAt
                            },
                        });
                    }
                    secondaryContacts.push(Object.assign(Object.assign({}, contact), { linkPrecedence: client_1.LinkPrecedence.SECONDARY, linkedId: primaryContact.id }));
                }
            }
            // Check if the incoming email/phoneNumber combination is new to the existing chain
            const isIncomingEmailNewToChain = email && !reconciledContacts.some(c => c.email === email);
            const isIncomingPhoneNumberNewToChain = phoneNumber && !reconciledContacts.some(c => c.phoneNumber === phoneNumber);
            const isIncomingCombinationNew = isIncomingEmailNewToChain || isIncomingPhoneNumberNewToChain;
            // If the incoming contact details introduce new information to the chain, create a new secondary
            if (isIncomingCombinationNew) {
                // Ensure we don't create a duplicate if an exact match already exists and is part of the chain
                const exactMatchExistsInChain = reconciledContacts.some(c => (c.email === email && c.phoneNumber === phoneNumber));
                if (!exactMatchExistsInChain) {
                    const newSecondary = yield prisma.contact.create({
                        data: {
                            email: email,
                            phoneNumber: phoneNumber,
                            linkPrecedence: client_1.LinkPrecedence.SECONDARY,
                            linkedId: primaryContact.id,
                        },
                    });
                    secondaryContacts.push(newSecondary);
                }
            }
            // Re-fetch all contacts associated with the primary after all updates/creations
            // This ensures the response reflects the latest state.
            const finalReconciledContacts = yield prisma.contact.findMany({
                where: {
                    OR: [
                        { id: primaryContact.id },
                        { linkedId: primaryContact.id }
                    ],
                    deletedAt: null
                },
                orderBy: { createdAt: "asc" }
            });
            // Re-determine primary and secondary from the final set
            primaryContact = (_a = finalReconciledContacts.find(c => c.linkPrecedence === client_1.LinkPrecedence.PRIMARY && c.linkedId === null)) !== null && _a !== void 0 ? _a : null;
            if (!primaryContact) { // Fallback if for some reason the primary was converted or not found
                primaryContact = finalReconciledContacts[0];
            }
            secondaryContacts = finalReconciledContacts.filter(c => c.id !== (primaryContact === null || primaryContact === void 0 ? void 0 : primaryContact.id));
        }
        // --- CHANGE 4: Construct the final response from the reconciled set ---
        const allEmails = new Set();
        const allPhoneNumbers = new Set();
        const allSecondaryContactIds = new Set();
        if (primaryContact) {
            if (primaryContact.email)
                allEmails.add(primaryContact.email);
            if (primaryContact.phoneNumber)
                allPhoneNumbers.add(primaryContact.phoneNumber);
        }
        // Add details from all secondary contacts
        for (const contact of secondaryContacts) {
            if (contact.email)
                allEmails.add(contact.email);
            if (contact.phoneNumber)
                allPhoneNumbers.add(contact.phoneNumber);
            allSecondaryContactIds.add(contact.id);
        }
        // Ensure the incoming email/phoneNumber is included if it's new and part of the new primary chain
        // (This handles the case where a new primary was just created, or a new secondary was just created)
        if (email && !allEmails.has(email))
            allEmails.add(email);
        if (phoneNumber && !allPhoneNumbers.has(phoneNumber))
            allPhoneNumbers.add(phoneNumber);
        return res.status(200).json({
            contact: {
                primaryContactId: primaryContact === null || primaryContact === void 0 ? void 0 : primaryContact.id,
                emails: Array.from(allEmails),
                phoneNumbers: Array.from(allPhoneNumbers),
                secondaryContactIds: Array.from(allSecondaryContactIds),
            },
        });
    }
    catch (error) {
        console.error("Error during identity reconciliation:", error);
        return res.status(500).json({ error: "Internal server error" });
    } // finally {
    //await prisma.$disconnect(); // Disconnect Prisma Client after each request
    //}
}));
// --- CHANGE 5: Listen on dynamic port for deployment ---
app.listen(port, () => {
    console.log(`✅ Server running at http://localhost:${port}`);
});
