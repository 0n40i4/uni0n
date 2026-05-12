import express from 'express';
import * as pg from 'pg';
import * as redis from 'redis';

const app = express();
const PORT = process.env.API_PORT || 3000;
app.use(express.json());

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const redisClient = redis.createClient({ url: process.env.REDIS_URL });
redisClient.on('error', (err) => console.log('Redis błąd', err));

app.get('/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT NOW()');
    const redisPing = await redisClient.ping();
    res.json({
      status: 'zdrowy',
      timestamp: new Date().toISOString(),
      database: { status: 'połączony' },
      redis: { status: 'połączony', ping: redisPing },
      version: '0.1.0'
    });
  } catch (error) {
    res.status(500).json({ status: 'niezdrowy', error: (error as Error).message });
  }
});

app.get('/metrics', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.post('/api/relay/send', (req, res) => res.status(501).json({ error: 'nie zaimplementowano' }));
app.post('/api/relay/route', (req, res) => res.status(501).json({ error: 'nie zaimplementowano' }));
app.post('/api/agent/register', (req, res) => res.status(501).json({ error: 'nie zaimplementowano' }));
app.post('/api/trust/verify', (req, res) => res.status(501).json({ error: 'nie zaimplementowano' }));
app.post('/api/memory/anchor', (req, res) => res.status(501).json({ error: 'nie zaimplementowano' }));
app.post('/api/memory/query', (req, res) => res.status(501).json({ error: 'nie zaimplementowano' }));
app.post('/api/governance/event', (req, res) => res.status(501).json({ error: 'nie zaimplementowano' }));
app.post('/api/operator/override', (req, res) => res.status(501).json({ error: 'nie zaimplementowano' }));

app.listen(PORT as number, async () => {
  await redisClient.connect();
  console.log(`UNIONAI Core API słucha na porcie ${PORT}`);
});
