import sqlite3
import os
from config import Config

def get_db_connection():
    """Returns a SQLite connection with row factory set to sqlite3.Row for dict-like access."""
    db_path = Config.DATABASE_PATH
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    """Initializes the database schema if tables do not exist."""
    schema_path = Config.SCHEMA_PATH
    if not os.path.exists(schema_path):
        raise FileNotFoundError(f"Schema file not found at {schema_path}")
    
    with open(schema_path, 'r', encoding='utf-8') as f:
        schema_sql = f.read()
    
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.executescript(schema_sql)
        conn.commit()
    finally:
        conn.close()

def query_db(query, args=(), one=False):
    """Convenience helper to query database and fetch results."""
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(query, args)
        r = cur.fetchall()
        return (r[0] if r else None) if one else r
    finally:
        conn.close()

def execute_db(query, args=(), commit=True):
    """Convenience helper to execute INSERT/UPDATE/DELETE queries and return lastrowid or affected rows."""
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(query, args)
        if commit:
            conn.commit()
        last_id = cur.lastrowid
        row_count = cur.rowcount
        return last_id, row_count
    finally:
        conn.close()
