-- RouteGen: Database Schema (SQLite)

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    company TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS delivery_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    customer_address TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    is_warehouse INTEGER DEFAULT 0,
    delivery_order INTEGER DEFAULT 0,
    priority TEXT DEFAULT 'Standard',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS route_optimizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    num_locations INTEGER NOT NULL,
    population_size INTEGER NOT NULL,
    generations INTEGER NOT NULL,
    mutation_rate REAL NOT NULL,
    crossover_rate REAL NOT NULL,
    elitism_count INTEGER DEFAULT 2,
    selection_method TEXT DEFAULT 'tournament',
    crossover_method TEXT DEFAULT 'ox',
    mutation_method TEXT DEFAULT 'inversion',
    original_distance_km REAL NOT NULL,
    optimized_distance_km REAL NOT NULL,
    distance_saved_km REAL NOT NULL,
    improvement_percentage REAL NOT NULL,
    original_time_minutes REAL NOT NULL,
    optimized_time_minutes REAL NOT NULL,
    time_saved_minutes REAL NOT NULL,
    execution_time_seconds REAL NOT NULL,
    warehouse_id INTEGER,
    convergence_history TEXT, -- JSON string of [{generation, best_distance, avg_distance}]
    route_sequence TEXT,     -- JSON string of location details in order
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS route_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    optimization_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    stop_order INTEGER NOT NULL,
    location_id INTEGER,
    location_name TEXT NOT NULL,
    customer_name TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    distance_from_prev_km REAL DEFAULT 0.0,
    cumulative_distance_km REAL DEFAULT 0.0,
    estimated_arrival_minutes REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (optimization_id) REFERENCES route_optimizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexing for speed
CREATE INDEX IF NOT EXISTS idx_locations_user ON delivery_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_optimizations_user ON route_optimizations(user_id);
CREATE INDEX IF NOT EXISTS idx_history_opt ON route_history(optimization_id);
