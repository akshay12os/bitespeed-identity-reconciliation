# Bitespeed Identity Reconciliation

This project implements an identity reconciliation service for Bitespeed's backend task. It consolidates customer identities using shared emails or phone numbers based on the rules provided in the task.

## 🌐 Live Demo

🔗 [https://bitespeed-identity-api-kfkt.onrender.com/identify](https://bitespeed-identity-api-kfkt.onrender.com/identify)

## 🧰 Tech Stack

- Node.js
- Express.js
- PostgreSQL
- Prisma ORM
- TypeScript
- Render (for deployment)

---

## 📦 Installation

1. **Clone the repository**

```bash
git clone https://github.com/akshay12os/bitespeed-identity-reconciliation.git
cd bitespeed-identity-reconciliation

2.Install Dependencies
npm install
Setup environment variables

Create a .env file:

DATABASE_URL=postgresql://<username>:<password>@<host>:<port>/<db_name>

Prisma setup

npx prisma generate
npx prisma migrate dev --name init


Run locally

npm run dev


📬 API Endpoint
POST /identify
Used to identify and consolidate user contact information based on shared email or phone number.

Request Body
json

{
  "email": "mcfly@hillvalley.edu",
  "phoneNumber": "123456"
}
Response Format
json

{
  "contact": {
    "primaryContactId": 1,
    "emails": [
      "lorraine@hillvalley.edu",
      "mcfly@hillvalley.edu"
    ],
    "phoneNumbers": [
      "123456"
    ],
    "secondaryContactIds": [23]
  }
}
📄 Project Structure


.
├── src/
│   ├── index.ts         # Entry point
│   ├── routes/          # Route handlers
│   ├── services/        # Logic for reconciliation
│   └── prisma/          # Prisma client
├── prisma/
│   └── schema.prisma    # Data model
├── .env
└── README.md
🧪 Testing
Use Postman or curl to send a POST request to:



https://bitespeed-identity-api-kfkt.onrender.com/identify
With body:

json

{
  "email": "example@example.com",
  "phoneNumber": "9876543210"
}
