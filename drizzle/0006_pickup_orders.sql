CREATE TABLE IF NOT EXISTS pickup_orders (date TEXT NOT NULL, direction TEXT NOT NULL, order_json TEXT NOT NULL DEFAULT '[]', PRIMARY KEY(date,direction));
