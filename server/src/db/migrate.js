import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function migrate() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
  console.log('Schema aplicado em', db.name);
}

migrate();
