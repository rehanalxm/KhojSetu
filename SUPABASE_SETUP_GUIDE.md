# Ì∫Ä Supabase Connection Setup Guide

Your KhojSetu app is already fully configured to work with Supabase. Here's how to connect it.

---

## ‚ö° Quick Setup (5 Minutes)

### Step 1: Create Supabase Account
1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with email
4. Verify email

### Step 2: Create New Project
1. Click "New Project"
2. Enter project name: `khojsetu`
3. Create strong password (save it!)
4. Select region closest to you
5. Click "Create new project"
6. **Wait 2-3 minutes for project to initialize**

### Step 3: Get Your Credentials
1. Once project is ready, go to **Settings ‚Üí API**
2. Find these two values:
   - **Project URL** - starts with `https://`
   - **Anon Public Key** - long string starting with `eyJ`

### Step 4: Create Environment File
1. In terminal, navigate to `frontend` folder:
   ```bash
   cd /c/Users/WCSC/KhojSetu/frontend
   ```

2. Create `.env.local` file with:
   ```bash
   VITE_SUPABASE_URL=https://your-project-url.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   VITE_USE_MOCK=false
   ```

3. **Replace** `your-project-url` and `your-anon-key-here` with actual values

### Step 5: Restart Dev Server
```bash
npm run dev
```

‚úÖ **Done!** Your app is now connected to Supabase!

---

## Ì¥ç Verify Connection

### In Browser Console (F12):
```javascript
// You should see:
"Supabase Connected: { url: 'https://your-pro...', hasKey: true }"
// NOT:
"Supabase credentials missing. App is running in Mock Mode."
```

### Test Features:
1. **Sign Up** - Create new account
2. **Create Post** - Add a LOST/FOUND item
3. **Chat** - Contact another user
4. Check **Supabase Dashboard** ‚Üí see your data!

---

## Ì≥ä Verify Data in Supabase Dashboard

### View Your Data:
1. Go to Supabase dashboard
2. Select your project
3. Click **"SQL Editor"**
4. Run these queries:

```sql
-- See all users
SELECT * FROM profiles;

-- See all posts
SELECT * FROM posts;

-- See conversations
SELECT * FROM conversations;

-- See messages
SELECT * FROM messages;
```

---

## Ì∫® If Something Goes Wrong

### Error: "Supabase credentials missing"
**Solution:**
1. Check `.env.local` file exists in `frontend/` folder
2. Check format is correct (no extra spaces)
3. Restart dev server: `npm run dev`
4. Check browser console again

### Error: "Cannot signup" or "Invalid credentials"
**Solution:**
1. Check API key has correct permissions
2. Go to Supabase ‚Üí **Settings ‚Üí Access Control**
3. Make sure anonymous access is enabled
4. Check table RLS policies (should allow anonymous)

### Error: "Data not appearing"
**Solution:**
1. Check database tables exist:
   - profiles
   - posts
   - conversations
   - messages
2. If missing, create them using SQL Editor
3. Verify RLS policies are correct

### Dev Server Won't Start
**Solution:**
```bash
# Kill any existing process
npm run dev --force

# Or restart terminal
npm run dev
```

---

## Ì≥ã Required Database Tables

The app needs these tables. **Usually auto-created**, but if missing:

### Option 1: Using SQL Script (Fastest)
1. Go to Supabase ‚Üí **SQL Editor**
2. Copy & paste this:

```sql
-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  avatar_url TEXT,
  gender VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  description TEXT,
  type VARCHAR CHECK (type IN ('LOST', 'FOUND')),
  category VARCHAR,
  image_url TEXT,
  image_urls TEXT[],
  location_lat FLOAT,
  location_lng FLOAT,
  location_name VARCHAR,
  contact_info VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_1_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  user_2_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  post_id UUID REFERENCES posts ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  content TEXT NOT NULL,
  post_reference JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can read all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for posts
CREATE POLICY "Anyone can read posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Users can create posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for conversations
CREATE POLICY "Users can read own conversations" ON conversations FOR SELECT 
  USING (auth.uid() = user_1_id OR auth.uid() = user_2_id);
CREATE POLICY "Users can create conversations" ON conversations FOR INSERT 
  WITH CHECK (auth.uid() = user_1_id OR auth.uid() = user_2_id);

-- RLS Policies for messages
CREATE POLICY "Users can read own messages" ON messages FOR SELECT 
  USING (
    conversation_id IN (
      SELECT id FROM conversations 
      WHERE auth.uid() = user_1_id OR auth.uid() = user_2_id
    )
  );
CREATE POLICY "Users can send messages" ON messages FOR INSERT 
  WITH CHECK (auth.uid() = sender_id);
```

3. Click **"Run"**
4. Done! Tables are created with correct permissions

### Option 2: Manual Creation
1. Go to **Database ‚Üí Tables**
2. Click **"New Table"**
3. Create each table manually
4. Add columns as shown in Schema section

---

## Ì¥ê Enable Authentication

### Email/Password Auth:
1. Go to Supabase ‚Üí **Authentication ‚Üí Providers**
2. Make sure **Email** is enabled (should be by default)
3. Go to **Settings ‚Üí Email Templates**
4. Customize if needed

### (Optional) Social Auth:
1. Go to **Authentication ‚Üí Providers**
2. Enable **Google**, **GitHub**, etc.
3. Follow setup instructions

---

## Ì≥∏ Enable Image Storage

### Create Storage Bucket:
1. Go to Supabase ‚Üí **Storage**
2. Click **"New Bucket"**
3. Name: `posts-images`
4. Uncheck "Private bucket" (or configure RLS)
5. Click **"Create"**

### Bucket RLS Policy:
```sql
CREATE POLICY "Anyone can read images" ON storage.objects 
  FOR SELECT USING (bucket_id = 'posts-images');

CREATE POLICY "Users can upload images" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'posts-images' AND auth.role() = 'authenticated');
```

---

## Ì≥± Real-Time Features

### Enable Realtime for Tables:
1. Go to Supabase Dashboard
2. **Realtime** section (left sidebar)
3. Enable realtime for:
   - `messages`
   - `conversations`
   - `posts`

### In your app, this enables:
- ‚úÖ Instant message delivery
- ‚úÖ Live post updates
- ‚úÖ Real-time chat notifications

---

## Ì∑™ Test Everything

### Test 1: Authentication
```bash
1. Open http://localhost:5173
2. Click "Sign Up"
3. Create account
4. Check Supabase: SQL Editor
5. Run: SELECT * FROM profiles;
6. See your profile!
```

### Test 2: Posts
```bash
1. Create a LOST/FOUND post
2. Upload image
3. Set location
4. Check Supabase: SQL Editor
5. Run: SELECT * FROM posts;
6. See your post!
```

### Test 3: Chat
```bash
1. In new tab, login as different user
2. Find first user's post
3. Click "Contact"
4. Send message
5. Check Supabase: SELECT * FROM messages;
6. See real-time message sync!
```

---

## Ì∫Ä Production Deployment

When deploying to production:

### 1. Update Environment Variables
Add to your hosting platform:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_USE_MOCK=false`

### 2. Configure CORS
In Supabase ‚Üí **Settings ‚Üí CORS**:
- Add your production domain
- Example: `https://khojsetu.vercel.app`

### 3. Enable Email Confirmations
- Go to **Authentication ‚Üí Email Templates**
- Configure custom email subjects
- Test email delivery

### 4. Setup Email Domain
- Go to **Settings ‚Üí Email**
- Add custom SMTP or use Supabase default
- Verify domain

### 5. Monitor Database
- Monitor query performance
- Set up backups
- Enable logging

---

## Ì≥û Supabase Resources

- **Official Docs**: https://supabase.com/docs
- **Community Forum**: https://github.com/supabase/supabase/discussions
- **Status Page**: https://status.supabase.com

---

## ‚úÖ Checklist

- [ ] Created Supabase account
- [ ] Created new project
- [ ] Copied Project URL & Anon Key
- [ ] Created `.env.local` file
- [ ] Added credentials to `.env.local`
- [ ] Restarted dev server
- [ ] Verified connection in browser console
- [ ] Created database tables (or imported SQL)
- [ ] Tested signup
- [ ] Tested post creation
- [ ] Tested chat
- [ ] Verified data in Supabase dashboard

---

## Ìæâ Done!

Your KhojSetu app is now connected to Supabase!

All data is:
- ‚úÖ Persisted in cloud database
- ‚úÖ Accessible across devices
- ‚úÖ Synced in real-time
- ‚úÖ Secure with RLS policies
- ‚úÖ Backed up automatically

Enjoy! Ì∫Ä

---

*Created: February 3, 2026*
