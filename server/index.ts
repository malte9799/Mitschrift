import express from 'express';
import cors from 'cors';
import { untisRouter } from './routes/untis.js';

const app = express();
const port = Number(process.env.API_PORT) || 8779;

app.use(cors());
app.use(express.json());

app.use('/api/untis', untisRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(port, () => {
  console.log(`Mitschrift-API läuft auf http://localhost:${port}`);
});
