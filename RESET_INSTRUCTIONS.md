# ��� KhojSetu - Reset & Clean Instructions

## Quick Reset Options

### Option 1: Browser Developer Tools (Quickest)
1. Open your app: `http://localhost:5173`
2. Press **F12** to open Developer Tools
3. Go to **Application** tab
4. Click **Storage** (left sidebar)
5. Select **Local Storage** → `http://localhost:5173`
6. Right-click and **Delete All** (or manually delete each key)
7. Refresh page (Ctrl+R)

**Keys to clear:**
- `khojsetu_current_user`
- `khojsetu_mock_users`
- `khojsetu_mock_posts`
- `khojsetu_conversations`
- `khojsetu_messages`
- `khojsetu_theme`

---

### Option 2: Using Reset Page
1. Go to: `http://localhost:5173/reset.html`
2. Click **"Reset All Data"** button
3. All data will be cleared automatically

---

### Option 3: Manual Command Line Reset
```bash
# Clear all git changes and go back to clean state
cd /c/Users/WCSC/KhojSetu
git clean -fd
git restore .
```

---

## After Reset

### The app will show:
- ✅ No logged-in user
- ✅ Empty posts list
- ✅ No conversations/messages
- ✅ Clean slate for testing

### To login after reset:
Use pre-made test accounts:
```
Email: alex@example.com
Password: test123

Email: sarah@example.com  
Password: test123

Email: michael@example.com
Password: test123
```

Or create a brand new account!

---

## Repository Status

### Latest Commit:
```
314f122 - Reset app data and push all changes
```

### Files Updated:
✅ frontend/src/App.tsx (fixed chat handlers)
✅ frontend/src/components/LiveMap.tsx (fixed map centering)
✅ BACKEND_CONNECTIVITY_REPORT.md (new)
✅ BACKEND_STATUS.txt (new)
✅ SUPABASE_SETUP_GUIDE.md (new)
✅ frontend/public/reset.html (new)

### All changes are safely stored in GitHub!

---

## What Was Fixed in This Push

### 1. Chat Contact Flow ✅
**Problem:** Chat button not opening chat with post details
**Solution:** Added `postImage: post.imageUrl` to all 4 contact handlers
**Files:** App.tsx lines 269, 307, 565, 593

### 2. Map Centering ✅
**Problem:** Map showing London instead of actual post locations
**Solution:** Replaced hardcoded coordinates with MapBoundsController
**Files:** LiveMap.tsx (complete rewrite)

### 3. Code Syntax ✅
**Problem:** Missing commas after postType causing build errors
**Solution:** Added commas to all postType lines
**Files:** App.tsx

### 4. Documentation ✅
**Files Added:**
- BACKEND_CONNECTIVITY_REPORT.md
- SUPABASE_SETUP_GUIDE.md
- BACKEND_STATUS.txt
- public/reset.html

---

## Current App Status

| Feature | Status |
|---------|--------|
| Authentication | ✅ Working |
| Posts Creation | ✅ Working |
| Chat System | ✅ Working |
| Map Display | ✅ Working (FIXED) |
| Real-time Sync | ✅ Configured |
| Supabase Ready | ✅ Ready to connect |

---

## Next Steps

### To Connect Real Backend:
1. Create `frontend/.env.local`
2. Add Supabase credentials
3. Set `VITE_USE_MOCK=false`
4. Restart dev server

See: `SUPABASE_SETUP_GUIDE.md`

---

*Updated: February 3, 2026*
