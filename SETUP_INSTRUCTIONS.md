# Ì∫Ä SUPABASE SETUP - DO THIS NOW

Your deleted all tables. Here's what to do:

## ‚ö° QUICK SETUP (5 minutes)

### Step 1: Go to Supabase Dashboard
- Open: https://app.supabase.com
- Select: KhojSetu project
- Go to: **SQL Editor** (left sidebar)

### Step 2: Copy ALL the SQL and Run It

1. Open file: `SUPABASE_QUICK_SQL.sql` (in your repo)
2. Copy the entire content
3. Paste it into Supabase SQL Editor
4. Click **"Run"**
5. Wait for "Success" ‚úì

### Step 3: Verify Tables Created
- Go to: **Table Editor** (left sidebar)
- You should see:
  - ‚úÖ profiles
  - ‚úÖ posts
  - ‚úÖ conversations
  - ‚úÖ messages

### Step 4: Update .env.local

Edit: `frontend/.env.local`

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_USE_MOCK=false
```

How to get values:
- Go to Supabase: Settings ‚Üí API
- Copy URL under "Project URL"
- Copy Key under "anon public"

### Step 5: Restart Frontend

```bash
cd frontend
npm run dev
```

### Step 6: Test It

1. Open: http://localhost:5173
2. Click "Sign Up"
3. Enter email, password, name, gender
4. Enter any 6 digits for OTP (mock mode)
5. ‚úì Should be logged in

---

## Ì≥ã What the SQL Creates

| Table | Purpose | Rows Created By |
|-------|---------|-----------------|
| profiles | User info (name, email, avatar) | Signup process |
| posts | Lost/Found items with location | Users creating posts |
| conversations | Chat threads between users | Users starting chat |
| messages | Individual chat messages | Users sending messages |

---

## Ì¥ê Security

All tables have **Row Level Security (RLS)** enabled:
- Users can only see their own data
- Users can only modify their own posts
- Only conversation participants can see/send messages

No changes needed to frontend - it's already configured!

---

## ‚ùì Issues?

### "Table does not exist"
- Did you run the SQL script? Check!

### "Unauthorized" error
- Are you signed up? Sign up first!
- Check you're using correct email

### "Environment variables missing"
- Update .env.local with Supabase credentials
- Restart: `npm run dev`

### Still not working?
- Check browser console (F12)
- Check Supabase tables exist
- Make sure server is running on localhost:5173

---

## ‚úÖ DONE!

Once tables are created and .env.local is updated:

‚úÖ Authentication works (signup, login, password reset with OTP)
‚úÖ Can create posts
‚úÖ Posts appear on map
‚úÖ Can start conversations
‚úÖ Can send messages
‚úÖ Real-time chat works

Everything should work exactly as before!
