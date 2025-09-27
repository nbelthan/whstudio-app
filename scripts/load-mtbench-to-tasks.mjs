import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from '@neondatabase/serverless';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const rewardAmount = Number(process.env.DEMO_REWARD ?? '0.02');
if (Number.isNaN(rewardAmount) || rewardAmount <= 0) {
  console.error('Invalid DEMO_REWARD value');
  process.exit(1);
}

const rewardCurrency = (process.env.DEMO_CURRENCY ?? 'USDC').toUpperCase();
if (!['USDC', 'WLD', 'ETH'].includes(rewardCurrency)) {
  console.error('DEMO_CURRENCY must be one of USDC, WLD, ETH');
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });

async function getSystemUserId(client) {
  const worldId = 'world_system';
  const nullifierHash = 'system_nullifier';
  const query = `
    INSERT INTO users (world_id, nullifier_hash, verification_level, username)
    VALUES ($1, $2, 'orb', 'system')
    ON CONFLICT (world_id)
    DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    RETURNING id
  `;
  const result = await client.query(query, [worldId, nullifierHash]);
  return result.rows[0].id;
}

async function getQualityCategoryId(client) {
  const query = `
    INSERT INTO task_categories (name, description, icon)
    VALUES ('Quality Assurance', 'Evaluation tasks for model responses', 'shield')
    ON CONFLICT (name)
    DO UPDATE SET description = EXCLUDED.description
    RETURNING id
  `;
  const result = await client.query(query);
  return result.rows[0].id;
}

async function loadSample() {
  const filePath = path.join(__dirname, 'mtbench_sample.json');
  const data = await fs.readFile(filePath, 'utf8');
  return JSON.parse(data);
}

async function taskExists(client, title) {
  const res = await client.query('SELECT id FROM tasks WHERE title = $1 LIMIT 1', [title]);
  return res.rowCount > 0;
}

async function insertTask(client, systemUserId, categoryId, item) {
  const title = `A/B Preference – MTBench #${item.id}`;
  if (await taskExists(client, title)) {
    return false;
  }

  const payload = {
    type: 'pairwise_ab',
    prompt: item.prompt,
    optionA: item.optionA,
    optionB: item.optionB,
    gold: item.gold ?? null,
  };

  const query = `
    INSERT INTO tasks (
      creator_id, category_id, title, description, instructions,
      task_type, difficulty_level, estimated_time_minutes,
      reward_amount, reward_currency, max_submissions,
      requires_verification, verification_criteria,
      status, priority, expires_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      'pairwise_ab', 1, 1,
      $6, $7, 3,
      true, $8,
      'active', 5, NOW() + INTERVAL '7 days'
    )
  `;

  await client.query(query, [
    systemUserId,
    categoryId,
    title,
    'Pairwise preference label for model responses',
    JSON.stringify(payload),
    rewardAmount,
    rewardCurrency,
    JSON.stringify({ world_id: true, level: 'orb' }),
  ]);
  return true;
}

async function run() {
  const client = await pool.connect();
  try {
    const [systemUserId, categoryId] = await Promise.all([
      getSystemUserId(client),
      getQualityCategoryId(client),
    ]);

    const items = await loadSample();
    let inserted = 0;
    for (const item of items) {
      try {
        const didInsert = await insertTask(client, systemUserId, categoryId, item);
        if (didInsert) inserted += 1;
      } catch (error) {
        console.error(`Failed to insert task ${item.id}:`, error);
      }
    }

    console.log(`Inserted ${inserted} tasks into the database.`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
