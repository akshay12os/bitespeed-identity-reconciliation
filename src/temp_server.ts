// temp_server.ts
import express, { Request, Response } from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req: Request, res: Response) => {
  console.log('GET / request received!'); // Add a log here
  res.status(200).send('Barebones API is running!');
});

app.listen(port, () => {
  console.log(`Barebones server listening on port ${port}`);
  console.log(`Node environment: ${process.env.NODE_ENV}`);
});