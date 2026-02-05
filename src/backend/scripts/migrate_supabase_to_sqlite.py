"""
Supabase to SQLite Migration Script

One-time script to migrate existing data from Supabase to the new SQLite database.
Run this once after implementing the SQLite schema.

Usage:
    cd src/backend
    uv run python scripts/migrate_supabase_to_sqlite.py
"""

import os
import sys
import json
import sqlite3
from pathlib import Path
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def migrate():
    """Migrate data from Supabase to SQLite"""
    
    # Check for Supabase credentials
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_ANON_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ Supabase credentials not found in .env")
        print("   Set SUPABASE_URL and SUPABASE_ANON_KEY to migrate existing data.")
        print("   If you don't have existing data, you can skip this migration.")
        return False
    
    try:
        from supabase import create_client
    except ImportError:
        print("❌ Supabase client not installed. Run: uv add supabase")
        return False
    
    # Connect to Supabase
    print(f"📡 Connecting to Supabase: {supabase_url[:50]}...")
    supabase = create_client(supabase_url, supabase_key)
    
    # Setup SQLite
    db_path = Path(__file__).resolve().parent.parent / "data" / "ikf_chat.db"
    db_path.parent.mkdir(parents=True, exist_ok=True)
    
    print(f"💾 SQLite database: {db_path}")
    
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    # Create tables
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            title TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_shared BOOLEAN DEFAULT 0
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id TEXT,
            role TEXT,
            content TEXT,
            artifacts TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        )
    """)
    
    # Create indexes
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
        ON messages(conversation_id)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_conversations_updated_at 
        ON conversations(updated_at DESC)
    """)
    
    conn.commit()
    
    # Fetch conversations from Supabase
    print("📥 Fetching conversations from Supabase...")
    conv_response = supabase.table("conversations").select("*").execute()
    conversations = conv_response.data or []
    print(f"   Found {len(conversations)} conversations")
    
    # Migrate conversations
    migrated_convs = 0
    for conv in conversations:
        try:
            cursor.execute(
                "INSERT OR REPLACE INTO conversations (id, title, created_at, updated_at, is_shared) VALUES (?, ?, ?, ?, ?)",
                (
                    conv["id"],
                    conv.get("title", "Untitled"),
                    conv.get("created_at"),
                    conv.get("updated_at"),
                    0  # is_shared defaults to false
                )
            )
            migrated_convs += 1
        except Exception as e:
            print(f"   ⚠️ Failed to migrate conversation {conv['id']}: {e}")
    
    conn.commit()
    print(f"   ✅ Migrated {migrated_convs} conversations")
    
    # Fetch messages from Supabase
    print("📥 Fetching messages from Supabase...")
    msg_response = supabase.table("messages").select("*").execute()
    messages = msg_response.data or []
    print(f"   Found {len(messages)} messages")
    
    # Migrate messages
    migrated_msgs = 0
    for msg in messages:
        try:
            # Convert artifacts from JSON if present
            artifacts = msg.get("artifacts")
            if artifacts and isinstance(artifacts, list):
                artifacts = json.dumps(artifacts)
            elif artifacts and isinstance(artifacts, str):
                # Already a string, keep as is
                pass
            else:
                artifacts = None
            
            cursor.execute(
                "INSERT INTO messages (conversation_id, role, content, artifacts, timestamp) VALUES (?, ?, ?, ?, ?)",
                (
                    msg["conversation_id"],
                    msg["role"],
                    msg["content"],
                    artifacts,
                    msg.get("created_at")  # Map created_at to timestamp
                )
            )
            migrated_msgs += 1
        except Exception as e:
            print(f"   ⚠️ Failed to migrate message {msg.get('id')}: {e}")
    
    conn.commit()
    conn.close()
    
    print(f"   ✅ Migrated {migrated_msgs} messages")
    print("")
    print("🎉 Migration complete!")
    print(f"   Database: {db_path}")
    print("")
    print("You can now remove SUPABASE_URL and SUPABASE_ANON_KEY from your .env file.")
    
    return True


if __name__ == "__main__":
    print("")
    print("=" * 60)
    print("  Supabase to SQLite Migration")
    print("=" * 60)
    print("")
    
    migrate()
