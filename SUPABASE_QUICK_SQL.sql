-- ============================================================================
-- KHOJSETU - CORRECTED DATABASE SCHEMA
-- This schema is fully aligned with backend authentication and code requirements
-- Copy and paste each script ONE AT A TIME into Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- TABLE 1: PROFILES (User Accounts)
-- ============================================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  gender TEXT CHECK (gender IN ('male', 'female')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_profiles_email ON profiles(email);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete" ON profiles FOR DELETE USING (auth.uid() = id);

-- ============================================================================
-- TABLE 2: POSTS (Lost/Found Items)
-- ============================================================================
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('lost', 'found')),
  category TEXT NOT NULL,
  image_url TEXT,
  image_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  location_name TEXT DEFAULT '',
  contact_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_type ON posts(type);
CREATE INDEX idx_posts_category ON posts(category);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts_select" ON posts FOR SELECT USING (true);
CREATE POLICY "posts_insert" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_update" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "posts_delete" ON posts FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- TABLE 3: CONVERSATIONS (Chat Threads Between Users)
-- ============================================================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT different_users CHECK (user_1_id != user_2_id)
);

CREATE INDEX idx_conversations_user_1 ON conversations(user_1_id);
CREATE INDEX idx_conversations_user_2 ON conversations(user_2_id);
CREATE INDEX idx_conversations_post ON conversations(post_id);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_select" ON conversations 
  FOR SELECT USING (auth.uid() = user_1_id OR auth.uid() = user_2_id);
CREATE POLICY "conversations_insert" ON conversations 
  FOR INSERT WITH CHECK (auth.uid() = user_1_id OR auth.uid() = user_2_id);
CREATE POLICY "conversations_update" ON conversations 
  FOR UPDATE USING (auth.uid() = user_1_id OR auth.uid() = user_2_id);
CREATE POLICY "conversations_delete" ON conversations 
  FOR DELETE USING (auth.uid() = user_1_id OR auth.uid() = user_2_id);

-- ============================================================================
-- TABLE 4: MESSAGES (Individual Chat Messages)
-- ============================================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  post_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.user_1_id = auth.uid() OR c.user_2_id = auth.uid())
    )
  );
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "messages_delete" ON messages FOR DELETE USING (auth.uid() = sender_id);

-- ============================================================================
-- VERIFICATION - Run this to confirm all tables created correctly
-- ============================================================================
SELECT 
  tablename,
  CASE 
    WHEN tablename = 'profiles' THEN '✓ Profiles (user accounts)'
    WHEN tablename = 'posts' THEN '✓ Posts (lost/found items)'
    WHEN tablename = 'conversations' THEN '✓ Conversations (chat threads)'
    WHEN tablename = 'messages' THEN '✓ Messages (chat messages)'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'posts', 'conversations', 'messages')
ORDER BY tablename;
