"""
Conversation Database Module

SQLite-based storage for session-based conversations.
Stores conversations and messages with artifact references.
"""

import json
import sqlite3
import uuid
from datetime import datetime
from typing import Optional, List, Tuple
from dataclasses import dataclass
from pathlib import Path
import threading

from app.config import settings


# Database file location
DB_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "ikf_chat.db"


@dataclass
class Message:
    """A single message in a conversation"""
    id: int
    conversation_id: str
    role: str  # "user" or "assistant"
    content: str
    artifacts: Optional[List[dict]] = None
    timestamp: Optional[str] = None


@dataclass
class ConversationSummary:
    """Summary of a conversation for listing"""
    id: str
    title: str
    preview: str  # First ~100 chars of last message
    message_count: int
    created_at: str
    updated_at: str


@dataclass
class Conversation:
    """Full conversation with messages"""
    id: str
    title: str
    messages: List[Message]
    created_at: str
    updated_at: str
    is_shared: bool = False


class ConversationDB:
    """SQLite-based conversation storage"""
    
    _local = threading.local()
    
    def __init__(self):
        # Ensure data directory exists
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()
    
    def _get_connection(self) -> sqlite3.Connection:
        """Get thread-local database connection"""
        if not hasattr(self._local, 'connection') or self._local.connection is None:
            self._local.connection = sqlite3.connect(str(DB_PATH), check_same_thread=False)
            self._local.connection.row_factory = sqlite3.Row
        return self._local.connection
    
    def _init_db(self):
        """Initialize database tables if they don't exist"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        # Create conversations table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                title TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_shared BOOLEAN DEFAULT 0
            )
        """)
        
        # Create messages table
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
        
        # Create indexes for performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
            ON messages(conversation_id)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_conversations_updated_at 
            ON conversations(updated_at DESC)
        """)
        
        conn.commit()
    
    def create_conversation(self, title: Optional[str] = None, first_message: Optional[str] = None) -> str:
        """
        Create a new conversation.
        
        Args:
            title: Optional title. If not provided, uses first message (truncated)
            first_message: First user message, used for title if title not provided
            
        Returns:
            Conversation ID (UUID format)
        """
        conv_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        
        # Use first message as title (truncated) if no title provided
        if not title:
            title = self._generate_title(first_message) if first_message else "New Conversation"
        
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (conv_id, title, now, now)
        )
        conn.commit()
        
        return conv_id
    
    def _generate_title(self, message: str) -> str:
        """Generate a title from the first message (truncated)"""
        if not message:
            return "New Conversation"
        title = message[:50].rsplit(' ', 1)[0] if len(message) > 50 else message
        if len(message) > 50:
            title += "..."
        return title
    
    def list_conversations(self, limit: int = 50, offset: int = 0) -> Tuple[List[ConversationSummary], int]:
        """
        List all conversations, most recent first.
        
        Returns list of ConversationSummary with preview from last message.
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        # Get total count
        cursor.execute("SELECT COUNT(*) FROM conversations")
        total = cursor.fetchone()[0]
        
        # Get conversations page
        cursor.execute("""
            SELECT * FROM conversations 
            ORDER BY updated_at DESC 
            LIMIT ? OFFSET ?
        """, (limit, offset))
        conv_rows = cursor.fetchall()
        
        if not conv_rows:
            return [], total
        
        summaries: List[ConversationSummary] = []
        
        for row in conv_rows:
            conv_id = row["id"]
            
            # Get last message for preview
            cursor.execute("""
                SELECT content FROM messages 
                WHERE conversation_id = ? 
                ORDER BY timestamp DESC 
                LIMIT 1
            """, (conv_id,))
            last_msg = cursor.fetchone()
            preview = last_msg["content"][:100] if last_msg else ""
            
            # Get message count
            cursor.execute("""
                SELECT COUNT(*) FROM messages 
                WHERE conversation_id = ?
            """, (conv_id,))
            msg_count = cursor.fetchone()[0]
            
            summaries.append(ConversationSummary(
                id=conv_id,
                title=row["title"],
                preview=preview,
                message_count=msg_count,
                created_at=row["created_at"],
                updated_at=row["updated_at"]
            ))
        
        return summaries, total
    
    def get_conversation(self, conversation_id: str) -> Optional[Conversation]:
        """
        Get a conversation with all its messages.
        
        Returns None if conversation doesn't exist.
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        # Get conversation
        cursor.execute("SELECT * FROM conversations WHERE id = ?", (conversation_id,))
        conv_row = cursor.fetchone()
        
        if not conv_row:
            return None
        
        # Get messages
        cursor.execute("""
            SELECT * FROM messages 
            WHERE conversation_id = ? 
            ORDER BY timestamp ASC
        """, (conversation_id,))
        msg_rows = cursor.fetchall()
        
        messages = [
            Message(
                id=row["id"],
                conversation_id=row["conversation_id"],
                role=row["role"],
                content=row["content"],
                artifacts=json.loads(row["artifacts"]) if row["artifacts"] else None,
                timestamp=row["timestamp"]
            )
            for row in msg_rows
        ]
        
        return Conversation(
            id=conv_row["id"],
            title=conv_row["title"],
            messages=messages,
            created_at=conv_row["created_at"],
            updated_at=conv_row["updated_at"],
            is_shared=bool(conv_row["is_shared"])
        )
    
    def delete_conversation(self, conversation_id: str) -> bool:
        """
        Delete a conversation and all its messages.
        
        Returns True if deleted, False if not found.
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        # Check if exists
        cursor.execute("SELECT id FROM conversations WHERE id = ?", (conversation_id,))
        if not cursor.fetchone():
            return False
        
        # Delete messages first
        cursor.execute("DELETE FROM messages WHERE conversation_id = ?", (conversation_id,))
        
        # Delete conversation
        cursor.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
        
        conn.commit()
        return True
    
    def add_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        artifacts: Optional[List[dict]] = None,
        update_conversation_updated_at: bool = True,
    ) -> int:
        """
        Add a message to a conversation.
        
        Args:
            conversation_id: The conversation to add to
            role: "user" or "assistant"
            content: Message content
            artifacts: Optional list of artifact references
            
        Returns:
            Message ID
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        now = datetime.utcnow().isoformat()
        
        cursor.execute(
            "INSERT INTO messages (conversation_id, role, content, artifacts, timestamp) VALUES (?, ?, ?, ?, ?)",
            (conversation_id, role, content, json.dumps(artifacts) if artifacts else None, now)
        )
        message_id = cursor.lastrowid
        
        # Update conversation's updated_at
        if update_conversation_updated_at:
            cursor.execute(
                "UPDATE conversations SET updated_at = ? WHERE id = ?",
                (now, conversation_id)
            )
        
        conn.commit()
        return message_id
    
    def update_message_artifacts(self, message_id: int, artifacts: List[dict]) -> bool:
        """
        Update artifacts for a message.
        
        Returns True if updated, False if message not found.
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            "UPDATE messages SET artifacts = ? WHERE id = ?",
            (json.dumps(artifacts), message_id)
        )
        conn.commit()
        
        return cursor.rowcount > 0
    
    def conversation_exists(self, conversation_id: str) -> bool:
        """Check if a conversation exists"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT id FROM conversations WHERE id = ?", (conversation_id,))
        return cursor.fetchone() is not None
    
    def get_conversation_history(self, conversation_id: str) -> List[dict]:
        """
        Get conversation history formatted for the AI model.
        
        Returns list of {role, content} dicts in chronological order.
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT role, content FROM messages 
            WHERE conversation_id = ? 
            ORDER BY timestamp ASC
        """, (conversation_id,))
        
        return [{"role": row["role"], "content": row["content"]} for row in cursor.fetchall()]
    
    def set_conversation_shared(self, conversation_id: str, is_shared: bool) -> bool:
        """Set the is_shared flag for a conversation"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            "UPDATE conversations SET is_shared = ? WHERE id = ?",
            (1 if is_shared else 0, conversation_id)
        )
        conn.commit()
        
        return cursor.rowcount > 0
    
    def update_conversation_title(self, conversation_id: str, title: str) -> bool:
        """Update a conversation's title"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            "UPDATE conversations SET title = ? WHERE id = ?",
            (title, conversation_id)
        )
        conn.commit()
        
        return cursor.rowcount > 0


# Singleton instance
_db_instance: Optional[ConversationDB] = None


def get_db() -> ConversationDB:
    """Get the singleton database instance"""
    global _db_instance
    if _db_instance is None:
        _db_instance = ConversationDB()
    return _db_instance
