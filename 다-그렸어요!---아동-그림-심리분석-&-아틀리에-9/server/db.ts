import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.resolve(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'child_art.db');
export const db = new Database(dbPath);

// Enable WAL mode & foreign key constraints
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 1. users table: google_id (sub), kakao_id, email, name, avatar, provider, created_at, updated_at
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    google_id TEXT UNIQUE,
    kakao_id TEXT UNIQUE,
    email TEXT NOT NULL,
    name TEXT,
    avatar TEXT,
    provider TEXT DEFAULT 'google',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

// Safe migration if table existed before kakao_id was added
try {
  const tableInfo = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  const hasKakaoId = tableInfo.some((col) => col.name === 'kakao_id');
  if (!hasKakaoId) {
    db.exec(`ALTER TABLE users ADD COLUMN kakao_id TEXT;`);
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_kakao_id ON users(kakao_id);`);
    console.log('[DB] kakao_id 컬럼 추가 및 UNIQUE 인덱스 생성 완료');
  }
} catch (e) {
  console.warn('[DB] kakao_id migration notice:', e);
}


// 2. user_data table: foreign key user_id references users(id)
db.exec(`
  CREATE TABLE IF NOT EXISTS user_data (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    data_type TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_user_data_user_id ON user_data(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_data_type ON user_data(user_id, data_type);
`);

export interface UserRow {
  id: string;
  google_id: string | null;
  kakao_id: string | null;
  email: string;
  name: string | null;
  avatar: string | null;
  provider: string;
  created_at: string;
  updated_at: string;
}

export interface UserDataRow {
  id: string;
  user_id: string;
  data_type: string;
  content: string;
  created_at: string;
  updated_at: string;
}

/**
 * Find user by Google sub / google_id
 */
export function findUserByGoogleId(googleId: string | null | undefined): UserRow | undefined {
  if (!googleId) return undefined;
  const stmt = db.prepare('SELECT * FROM users WHERE google_id = ?');
  return stmt.get(googleId) as UserRow | undefined;
}

/**
 * Find user by Kakao ID / kakao_id
 */
export function findUserByKakaoId(kakaoId: string | null | undefined): UserRow | undefined {
  if (!kakaoId) return undefined;
  const stmt = db.prepare('SELECT * FROM users WHERE kakao_id = ?');
  return stmt.get(kakaoId) as UserRow | undefined;
}

/**
 * Find user by internal id
 */
export function findUserById(id: string): UserRow | undefined {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id) as UserRow | undefined;
}

/**
 * Find user by email
 */
export function findUserByEmail(email: string): UserRow | undefined {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email) as UserRow | undefined;
}

/**
 * Create a new user record
 */
export function createUser(params: {
  id?: string;
  googleId?: string | null;
  kakaoId?: string | null;
  email: string;
  name?: string;
  avatar?: string;
  provider?: string;
}): UserRow {
  const id = params.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date().toISOString();
  const provider = params.provider || (params.kakaoId ? 'kakao' : params.googleId ? 'google' : 'email');

  const stmt = db.prepare(`
    INSERT INTO users (id, google_id, kakao_id, email, name, avatar, provider, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    params.googleId || null,
    params.kakaoId || null,
    params.email,
    params.name || '꼬마 화가',
    params.avatar || null,
    provider,
    now,
    now
  );

  return findUserById(id)!;
}

/**
 * Update user basic profile
 */
export function updateUser(id: string, params: { name?: string; avatar?: string }): UserRow | undefined {
  const now = new Date().toISOString();
  if (params.name && params.avatar) {
    db.prepare('UPDATE users SET name = ?, avatar = ?, updated_at = ? WHERE id = ?').run(
      params.name,
      params.avatar,
      now,
      id
    );
  } else if (params.name) {
    db.prepare('UPDATE users SET name = ?, updated_at = ? WHERE id = ?').run(params.name, now, id);
  } else if (params.avatar) {
    db.prepare('UPDATE users SET avatar = ?, updated_at = ? WHERE id = ?').run(params.avatar, now, id);
  }
  return findUserById(id);
}

/**
 * Save user data into user_data table with FOREIGN KEY (user_id) REFERENCES users(id)
 */
export function saveUserStorageData(
  userId: string,
  payload: {
    artworks?: any[];
    diaries?: any[];
    records?: any[];
    dataType?: string;
    content?: any;
    data?: any;
  }
) {
  const user = findUserById(userId);
  if (!user) {
    throw new Error(`존재하지 않는 사용자 ID(${userId})입니다. 외래키 제약조건에 위배됩니다.`);
  }

  const now = new Date().toISOString();

  const upsertSingleType = (type: string, contentStr: string) => {
    const existing = db
      .prepare('SELECT id FROM user_data WHERE user_id = ? AND data_type = ?')
      .get(userId, type) as { id: string } | undefined;

    if (existing) {
      db.prepare('UPDATE user_data SET content = ?, updated_at = ? WHERE id = ?').run(
        contentStr,
        now,
        existing.id
      );
    } else {
      const rowId = `ud_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      db.prepare(`
        INSERT INTO user_data (id, user_id, data_type, content, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(rowId, userId, type, contentStr, now, now);
    }
  };

  const dataObj = payload.data && typeof payload.data === 'object' ? payload.data : payload;

  const transaction = db.transaction(() => {
    if (dataObj.artworks !== undefined) {
      upsertSingleType('artworks', JSON.stringify(dataObj.artworks));
    }
    if (dataObj.diaries !== undefined) {
      upsertSingleType('diaries', JSON.stringify(dataObj.diaries));
    }
    if (dataObj.records !== undefined) {
      upsertSingleType('records', JSON.stringify(dataObj.records));
    }
    if (dataObj.dataType && dataObj.content !== undefined) {
      const contentStr =
        typeof dataObj.content === 'string' ? dataObj.content : JSON.stringify(dataObj.content);
      upsertSingleType(dataObj.dataType, contentStr);
    }
  });

  transaction();
}

/**
 * Get all user storage data filtered by user_id
 */
export function getUserStorageData(userId: string): {
  artworks: any[];
  diaries: any[];
  records: any[];
  extra: Record<string, any>;
} {
  const rows = db
    .prepare('SELECT data_type, content, updated_at FROM user_data WHERE user_id = ?')
    .all(userId) as UserDataRow[];

  let artworks: any[] = [];
  let diaries: any[] = [];
  let records: any[] = [];
  const extra: Record<string, any> = {};

  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.content);
      if (row.data_type === 'artworks') {
        artworks = Array.isArray(parsed) ? parsed : [];
      } else if (row.data_type === 'diaries') {
        diaries = Array.isArray(parsed) ? parsed : [];
      } else if (row.data_type === 'records') {
        records = Array.isArray(parsed) ? parsed : [];
      } else {
        extra[row.data_type] = parsed;
      }
    } catch {
      extra[row.data_type] = row.content;
    }
  }

  return { artworks, diaries, records, extra };
}
