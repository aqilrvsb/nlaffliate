import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "app.db");

// Reuse a single connection across hot-reloads in dev.
const globalForDb = globalThis as unknown as { _db?: DatabaseSync };

export const db = globalForDb._db ?? new DatabaseSync(dbPath);
globalForDb._db = db;

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  address TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('marketer','affiliate','admin')),
  marketer_id INTEGER,              -- for affiliates: the assigned marketer
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (marketer_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tiktok_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  profile_id INTEGER NOT NULL,
  live_date TEXT NOT NULL,          -- YYYY-MM-DD (Asia/Kuala_Lumpur)
  start_time TEXT NOT NULL,         -- HH:MM
  end_time TEXT,                    -- HH:MM (optional planned end)
  note TEXT,
  post_url TEXT,                    -- link to the posted TikTok video
  ads_budget REAL,                  -- ad budget set by the marketer
  -- Marketer "allow affiliate to edit" override toggle. Default OFF. The
  -- affiliate is locked out of schedule edits only when a budget is set AND
  -- this is 0; turning it on overrides the lock.
  affiliate_can_edit INTEGER NOT NULL DEFAULT 0,
  ad_spend REAL,                    -- from bulk analytics (col: Spend)
  gross_revenue REAL,               -- from bulk analytics (col: Gross Revenue)
  roi REAL,                         -- from bulk analytics (col: ROI)
  -- pending  : screenshot and/or post link still missing
  -- completed: screenshot uploaded AND post link added
  -- missed   : marked as not gone live
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (profile_id) REFERENCES tiktok_profiles(id) ON DELETE CASCADE
);

-- Videos transferred in from PeningLab and assigned to an affiliate.
-- The affiliate posts the video to TikTok, then records the TikTok link,
-- which moves the row from Pending Post to Done Post.
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,             -- affiliate who receives it
  post_date TEXT NOT NULL,              -- YYYY-MM-DD
  video_url TEXT NOT NULL,              -- PeningLab output_url
  caption TEXT,                         -- caption
  cover_title TEXT,                     -- metadata.cover_title  (Main Text)
  cover_subtitle TEXT,                  -- metadata.cover_subtitle (Sub Text)
  cover_thumbnail_url TEXT,             -- metadata.cover_thumbnail_url
  tiktok_url TEXT,                      -- filled in by the affiliate
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | done
  source_id TEXT,                       -- PeningLab history id (dedupe)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bulk-analytics rows that could not be matched to any pending live.
-- Surfaced to the marketer in the "Unknown Affiliate" tab.
CREATE TABLE IF NOT EXISTS unknown_lives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  marketer_id INTEGER NOT NULL,
  live_name TEXT,
  live_date TEXT,
  live_time TEXT,
  duration TEXT,
  ad_spend REAL,
  gross_revenue REAL,
  roi REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (marketer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Product GMV — TikTok Ads "Product campaign data" xlsx rows, imported by
-- the marketer against a chosen report date. "Cost" is stored as spend.
CREATE TABLE IF NOT EXISTS product_gmv (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  marketer_id INTEGER NOT NULL,
  report_date TEXT NOT NULL,
  campaign_id TEXT,
  campaign_name TEXT,
  spend REAL,
  sku_orders INTEGER,
  cost_per_order REAL,
  gross_revenue REAL,
  roi REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (marketer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Overall — two GMV-Max screenshots (Overview + Key metrics) read per date.
CREATE TABLE IF NOT EXISTS overall_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  marketer_id INTEGER NOT NULL,
  report_date TEXT NOT NULL,
  -- image 1: GMV Max Overview
  cost REAL, sku_orders INTEGER, cost_per_order REAL, gross_revenue REAL, roi REAL,
  -- image 2: Key metrics
  gmv REAL, visitors INTEGER, product_impressions INTEGER, product_clicks INTEGER,
  img1_path TEXT, img2_path TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (marketer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS live_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  screenshot_path TEXT NOT NULL,
  live_title TEXT,
  gmv REAL,
  viewers INTEGER,
  items_sold INTEGER,
  duration_live TEXT,
  ai_raw TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

// --- lightweight migrations for existing databases ---
const userCols = (db.prepare("PRAGMA table_info(users)").all() as any[]).map(
  (c) => c.name
);
if (!userCols.includes("phone")) db.exec("ALTER TABLE users ADD COLUMN phone TEXT");
if (!userCols.includes("address")) db.exec("ALTER TABLE users ADD COLUMN address TEXT");
if (!userCols.includes("marketer_id"))
  db.exec("ALTER TABLE users ADD COLUMN marketer_id INTEGER");

const bookingCols = (db.prepare("PRAGMA table_info(bookings)").all() as any[]).map(
  (c) => c.name
);
if (!bookingCols.includes("post_url"))
  db.exec("ALTER TABLE bookings ADD COLUMN post_url TEXT");
if (!bookingCols.includes("ads_budget"))
  db.exec("ALTER TABLE bookings ADD COLUMN ads_budget REAL");
if (!bookingCols.includes("affiliate_can_edit"))
  db.exec("ALTER TABLE bookings ADD COLUMN affiliate_can_edit INTEGER NOT NULL DEFAULT 1");
if (!bookingCols.includes("ad_spend"))
  db.exec("ALTER TABLE bookings ADD COLUMN ad_spend REAL");
if (!bookingCols.includes("gross_revenue"))
  db.exec("ALTER TABLE bookings ADD COLUMN gross_revenue REAL");
if (!bookingCols.includes("roi"))
  db.exec("ALTER TABLE bookings ADD COLUMN roi REAL");

const resultCols = (db.prepare("PRAGMA table_info(live_results)").all() as any[]).map(
  (c) => c.name
);
if (!resultCols.includes("live_title"))
  db.exec("ALTER TABLE live_results ADD COLUMN live_title TEXT");

// One-time: the affiliate-edit toggle now defaults OFF. Rows created under
// the old DEFAULT 1 are reset once (guarded by a flag so marketer choices
// afterwards persist).
const toggleFlag = db
  .prepare("SELECT value FROM settings WHERE key = 'toggle_default_off_v1'")
  .get();
if (!toggleFlag) {
  db.exec("UPDATE bookings SET affiliate_can_edit = 0");
  db.prepare("INSERT INTO settings (key, value) VALUES ('toggle_default_off_v1', '1')").run();
}

// Status rename: scheduled -> pending, done -> completed. Idempotent.
db.exec("UPDATE bookings SET status = 'pending' WHERE status = 'scheduled'");
db.exec("UPDATE bookings SET status = 'completed' WHERE status = 'done'");
// NOTE: status is managed explicitly by the flows (affiliate post-link,
// marketer bulk-match). We deliberately do NOT re-derive it on boot —
// a bulk-matched live is completed via ad data and has no post_url.

export default db;
