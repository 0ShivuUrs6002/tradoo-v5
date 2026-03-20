import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), '.secure');
const TOKEN_FILE = path.join(DATA_DIR, 'token.json');

const ensureStorage = async () => {
  await fs.mkdir(DATA_DIR, { recursive: true });
};

export const readToken = async () => {
  try {
    await ensureStorage();
    const content = await fs.readFile(TOKEN_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
};

export const writeToken = async (tokenPayload) => {
  await ensureStorage();
  await fs.writeFile(TOKEN_FILE, JSON.stringify(tokenPayload, null, 2), { encoding: 'utf-8', mode: 0o600 });
};
