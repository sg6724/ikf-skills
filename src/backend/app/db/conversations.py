"""
Conversation Database Module

Supabase-based storage for session-based conversations.
Stores conversations and messages with artifact references.
"""

import json
import uuid
from datetime import datetime
from typing import Optional, List
from dataclasses import dataclass

from supabase import create_client, Client

from app.config import settings


@dataclass
class Message:
    """A single message in a conversation"""
    id: str
    conversation_id: str
    role: str  # "user" or "assistant"
    content: str
    thinking_steps: Optional[List[dict]] = None
    artifacts: Optional[List[dict]] = None
    created_at: Optional[str] = None


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


class ConversationDB:
    """Supabase-based conversation storage"""
    
    def __init__(self):
        if not settings.supabase_url or not settings.supabase_anon_key:
            raise ValueError("Supabase credentials not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env")
        
        self.client: Client = create_client(
            settings.supabase_url,
            settings.supabase_anon_key
        )
    
    def create_conversation(self, title: Optional[str] = None, first_message: Optional[str] = None) -> str:
        """
        Create a new conversation.
        
        Args:
            title: Optional title. If not provided, auto-generates using LLM
            first_message: First user message, used for auto-title generation
            
        Returns:
            Conversation ID
        """
        conv_id = f"conv_{uuid.uuid4().hex[:12]}"
        now = datetime.utcnow().isoformat()
        
        # Auto-generate title from first message using LLM
        if not title and first_message:
            title = self._generate_smart_title(first_message)
        elif not title:
            title = "New Conversation"
        
        self.client.table("conversations").insert({
            "id": conv_id,
            "title": title,
            "created_at": now,
            "updated_at": now
        }).execute()
        
        return conv_id
    
    def _generate_smart_title(self, message: str) -> str:
        """
        Generate a concise 2-3 word title for the conversation using Gemini.
        Falls back to truncated message if LLM fails.
        """
        try:
            from google import genai
            import os
            
            # Configure Gemini
            api_key = os.getenv("GOOGLE_API_KEY")
            if not api_key:
                raise ValueError("GOOGLE_API_KEY not set")
            
            client = genai.Client(api_key=api_key)
            
            prompt = f"""Generate a concise 2-3 word title summarizing this user message. 
Just output the title, nothing else. No quotes, no explanation.

User message: {message[:500]}

Title:"""
            
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt
            )
            title = response.text.strip().strip('"').strip("'")
            
            # Ensure it's not too long
            if len(title) > 40:
                title = title[:40].rsplit(' ', 1)[0]
            
            return title if title else self._fallback_title(message)
            
        except Exception as e:
            # Fallback to simple truncation if LLM fails
            print(f"LLM title generation failed: {e}")
            return self._fallback_title(message)
    
    def _fallback_title(self, message: str) -> str:
        """Simple fallback title generation from message."""
        title = message[:50].rsplit(' ', 1)[0]
        if len(message) > 50:
            title += "..."
        return title
    
    def list_conversations(self, limit: int = 50, offset: int = 0) -> List[ConversationSummary]:
        """
        List all conversations, most recent first.
        
        Returns list of ConversationSummary with preview from last message.
        """
        # Get conversations
        response = self.client.table("conversations")\
            .select("*")\
            .order("updated_at", desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()
        
        summaries = []
        for row in response.data:
            # Get last message for preview
            msg_response = self.client.table("messages")\
                .select("content")\
                .eq("conversation_id", row["id"])\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()
            
            last_content = msg_response.data[0]["content"] if msg_response.data else ""
            
            # Get message count
            count_response = self.client.table("messages")\
                .select("id", count="exact")\
                .eq("conversation_id", row["id"])\
                .execute()
            
            summaries.append(ConversationSummary(
                id=row["id"],
                title=row["title"],
                preview=last_content[:100] if last_content else "",
                message_count=count_response.count or 0,
                created_at=row["created_at"],
                updated_at=row["updated_at"]
            ))
        
        return summaries
    
    def get_conversation(self, conversation_id: str) -> Optional[Conversation]:
        """
        Get a conversation with all its messages.
        
        Returns None if conversation doesn't exist.
        """
        # Get conversation
        conv_response = self.client.table("conversations")\
            .select("*")\
            .eq("id", conversation_id)\
            .execute()
        
        if not conv_response.data:
            return None
        
        conv_row = conv_response.data[0]
        
        # Get messages
        msg_response = self.client.table("messages")\
            .select("*")\
            .eq("conversation_id", conversation_id)\
            .order("created_at", desc=False)\
            .execute()
        
        messages = [
            Message(
                id=row["id"],
                conversation_id=row["conversation_id"],
                role=row["role"],
                content=row["content"],
                thinking_steps=row["thinking_steps"] if row.get("thinking_steps") else None,
                artifacts=row["artifacts"] if row.get("artifacts") else None,
                created_at=row["created_at"]
            )
            for row in msg_response.data
        ]
        
        return Conversation(
            id=conv_row["id"],
            title=conv_row["title"],
            messages=messages,
            created_at=conv_row["created_at"],
            updated_at=conv_row["updated_at"]
        )
    
    def delete_conversation(self, conversation_id: str) -> bool:
        """
        Delete a conversation and all its messages.
        
        Returns True if deleted, False if not found.
        """
        # Check if exists
        check = self.client.table("conversations")\
            .select("id")\
            .eq("id", conversation_id)\
            .execute()
        
        if not check.data:
            return False
        
        # Delete messages first (CASCADE should handle this, but be explicit)
        self.client.table("messages")\
            .delete()\
            .eq("conversation_id", conversation_id)\
            .execute()
        
        # Delete conversation
        self.client.table("conversations")\
            .delete()\
            .eq("id", conversation_id)\
            .execute()
        
        return True
    
    def add_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        thinking_steps: Optional[List[dict]] = None,
        artifacts: Optional[List[dict]] = None
    ) -> str:
        """
        Add a message to a conversation.
        
        Args:
            conversation_id: The conversation to add to
            role: "user" or "assistant"
            content: Message content
            thinking_steps: Optional list of thinking/tool steps
            artifacts: Optional list of artifact references
            
        Returns:
            Message ID
        """
        message_id = f"msg_{uuid.uuid4().hex[:12]}"
        now = datetime.utcnow().isoformat()
        
        self.client.table("messages").insert({
            "id": message_id,
            "conversation_id": conversation_id,
            "role": role,
            "content": content,
            "thinking_steps": thinking_steps,
            "artifacts": artifacts,
            "created_at": now
        }).execute()
        
        # Update conversation's updated_at
        self.client.table("conversations")\
            .update({"updated_at": now})\
            .eq("id", conversation_id)\
            .execute()
        
        return message_id
    
    def update_message_artifacts(self, message_id: str, artifacts: List[dict]) -> bool:
        """
        Update artifacts for a message (used when agent generates files during streaming).
        
        Returns True if updated, False if message not found.
        """
        response = self.client.table("messages")\
            .update({"artifacts": artifacts})\
            .eq("id", message_id)\
            .execute()
        
        return len(response.data) > 0
    
    def conversation_exists(self, conversation_id: str) -> bool:
        """Check if a conversation exists"""
        response = self.client.table("conversations")\
            .select("id")\
            .eq("id", conversation_id)\
            .execute()
        
        return len(response.data) > 0


# Singleton instance
_db_instance: Optional[ConversationDB] = None


def get_db() -> ConversationDB:
    """Get the singleton database instance"""
    global _db_instance
    if _db_instance is None:
        _db_instance = ConversationDB()
    return _db_instance
