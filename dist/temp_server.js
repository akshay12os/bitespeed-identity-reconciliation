"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// temp_server.ts
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => {
    console.log('GET / request received!'); // Add a log here
    res.status(200).send('Barebones API is running!');
});
app.listen(port, () => {
    console.log(`Barebones server listening on port ${port}`);
    console.log(`Node environment: ${process.env.NODE_ENV}`);
});
