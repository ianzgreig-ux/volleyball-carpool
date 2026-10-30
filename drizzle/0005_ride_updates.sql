CREATE TABLE IF NOT EXISTS ride_updates (
  date TEXT NOT NULL, direction TEXT NOT NULL CHECK(direction IN ('there','back')),
  family INTEGER NOT NULL, pickup_time TEXT NOT NULL DEFAULT '',
  pickup_location TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','on_my_way','arrived','completed')),
  eta_minutes INTEGER, status_at TEXT, updated_at TEXT NOT NULL,
  PRIMARY KEY(date,direction)
);
