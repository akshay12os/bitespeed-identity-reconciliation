Bitespeed Identity Reconciliation
Overview
This project implements the backend service for Bitespeed's identity reconciliation task. It consolidates customer contacts based on email and phone number, ensuring multiple contact entries linked to the same customer are unified under one primary identity.

Inspired by the FluxKart.com use case with Dr. Emmett Brown’s diverse contact info, this service helps track customer identities across multiple orders.

Features
POST /identify endpoint to reconcile identities using email and/or phone number.

Creates new primary contacts when no existing match is found.

Links secondary contacts to a primary contact when shared email or phone number is detected.

Handles merging of contacts, updating link precedence as required.

Returns a consolidated JSON response including:

primaryContactId

emails (with primary contact email first)

phoneNumbers (with primary contact phone first)

secondaryContactIds array

Tech Stack
Node.js with TypeScript

Express.js for REST API

Prisma ORM

PostgreSQL database

Setup & Deployment
Clone the repository:

bash
Copy
Edit
git clone https://github.com/akshay12os/bitespeed-identity-reconciliation.git
cd bitespeed-identity-reconciliation
Install dependencies:

nginx
Copy
Edit
npm install
Create a .env file and set your database URL:

ini
Copy
Edit
DATABASE_URL="your_postgres_connection_string_here"
PORT=10000
Run database migrations:

nginx
Copy
Edit
npx prisma migrate deploy
Start the server:

arduino
Copy
Edit
npm run start
The API will be running on http://localhost:10000

Usage
Send a POST request to /identify with JSON body:

json
Copy
Edit
{
  "email": "example@domain.com",
  "phoneNumber": "1234567890"
}
Example response:

json
Copy
Edit
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["primary@example.com", "secondary@example.com"],
    "phoneNumbers": ["1234567890", "0987654321"],
    "secondaryContactIds": [2, 3]
  }
}
Live Endpoint
The service is deployed at:

https://bitespeed-id-reconciliation.onrender.com

