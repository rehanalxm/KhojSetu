-- ============================================================================
-- KhojSetu - Complete Supabase Database Schema (Production Ready)
-- Run this in Supabase SQL Editor (Dashboard -> SQL Editor -> New Query -> Run)
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. PROFILES TABLE (User Accounts)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    gender TEXT DEFAULT 'male',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop old policies to avoid duplicates
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users and admins can delete profiles" ON public.profiles;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" 
    ON public.profiles FOR SELECT 
    USING (true);

CREATE POLICY "Users can insert their own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users and admins can delete profiles" 
    ON public.profiles FOR DELETE 
    USING (
        auth.uid() = id 
        OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    );

-- Trigger to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, avatar_url, is_admin)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id),
        COALESCE((NEW.raw_user_meta_data->>'is_admin')::boolean, false)
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, public.profiles.name),
        updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for any existing auth users who lost their profile row
INSERT INTO public.profiles (id, email, name, avatar_url, is_admin)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)),
    COALESCE(raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || id),
    COALESCE((raw_user_meta_data->>'is_admin')::boolean, false)
FROM auth.users
ON CONFLICT (id) DO NOTHING;


-- ----------------------------------------------------------------------------
-- 2. POSTS TABLE (Lost and Found Items)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT,
    image_urls TEXT[] DEFAULT '{}',
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    location_name TEXT,
    contact_info TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users and admins can delete posts" ON public.posts;

CREATE POLICY "Posts are viewable by everyone" 
    ON public.posts FOR SELECT 
    USING (true);

CREATE POLICY "Authenticated users can create posts" 
    ON public.posts FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" 
    ON public.posts FOR UPDATE 
    USING (
        auth.uid() = user_id 
        OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    );

CREATE POLICY "Users and admins can delete posts" 
    ON public.posts FOR DELETE 
    USING (
        auth.uid() = user_id 
        OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    );


-- ----------------------------------------------------------------------------
-- 3. MESSAGES TABLE (Real-time Direct Messaging)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages sent to or received by them" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their messages" ON public.messages;

CREATE POLICY "Users can view messages sent to or received by them" 
    ON public.messages FOR SELECT 
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Authenticated users can send messages" 
    ON public.messages FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = sender_id);

CREATE POLICY "Users can delete their messages" 
    ON public.messages FOR DELETE 
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Enable Realtime on messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;


-- ----------------------------------------------------------------------------
-- 4. CLAIMS TABLE (Ownership verification)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    claimer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    proof_description TEXT NOT NULL,
    proof_images TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view claims" ON public.claims;
DROP POLICY IF EXISTS "Authenticated users can create claims" ON public.claims;

CREATE POLICY "Users can view claims" 
    ON public.claims FOR SELECT 
    USING (
        auth.uid() = claimer_id OR 
        auth.uid() IN (SELECT user_id FROM public.posts WHERE id = post_id)
    );

CREATE POLICY "Authenticated users can create claims" 
    ON public.claims FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = claimer_id);


-- ----------------------------------------------------------------------------
-- 5. NOTIFICATIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update notifications" ON public.notifications;

CREATE POLICY "Users can view notifications" 
    ON public.notifications FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update notifications" 
    ON public.notifications FOR UPDATE 
    USING (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- 6. STORAGE BUCKET SETUP (For images)
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) 
VALUES ('khojsetu-images', 'khojsetu-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Read Access for KhojSetu Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload item images" ON storage.objects;

CREATE POLICY "Public Read Access for KhojSetu Images" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'khojsetu-images');

CREATE POLICY "Authenticated users can upload item images" 
    ON storage.objects FOR INSERT 
    WITH CHECK (bucket_id = 'khojsetu-images' AND auth.role() = 'authenticated');

-- ============================================================================
-- End of Schema
-- ============================================================================

