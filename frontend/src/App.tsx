import { useState, useEffect } from 'react';
import { Plus, MessageSquare, Grid3x3, Map as MapIcon, User as UserIcon, LogOut, Archive } from 'lucide-react';
import LiveMap from './components/LiveMap';
import FeedView from './components/FeedView';
import PostItemForm from './components/PostItemForm';
import ChatInterface from './components/ChatInterface';
import AuthModal from './components/AuthModal';
import MyPostsModal from './components/MyPostsModal';
import ConfirmDialog from './components/ConfirmDialog';
import ForgotPasswordModal from './components/ForgotPasswordModal'; // Added this import
import Toast, { type ToastType } from './components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthService } from './services/AuthService';
import { PostService } from './services/PostService';
import type { User } from './types/auth';
import Header from './components/Header';
import type { CategoryId } from './types/categories';
import { type DialogType } from './components/ConfirmDialog';
import Footer from './components/Footer';
import type { Post } from './types/categories';

type ViewMode = 'feed' | 'map';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('feed');
  const [isPostFormOpen, setIsPostFormOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatTarget, setChatTarget] = useState<{ id: string; name: string; postId: number; postTitle: string; postType: 'LOST' | 'FOUND'; postImage?: string } | null>(null);

  // New State for My Posts
  const [isMyPostsOpen, setIsMyPostsOpen] = useState(false);
  const [userPostCount, setUserPostCount] = useState(0);

  // Alert State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: DialogType;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'confirm',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: () => { },
  });

  const [toast, setToast] = useState<{
    isVisible: boolean;
    message: string;
    type: ToastType;
  }>({
    isVisible: false,
    message: '',
    type: 'success',
  });

  // Auth State
  const [user, setUser] = useState<User | null>(AuthService.getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Header State Lifted
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'ALL'>('ALL');
  const [selectedType, setSelectedType] = useState<'ALL' | 'LOST' | 'FOUND'>('ALL');

  // Notifications
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  // Subscribe to real-time messages for notifications
  useEffect(() => {
    if (!user) return;

    const channel = import('./services/ChatService').then(({ ChatService }) => {
      return ChatService.subscribeToMessages(user.id, () => {
        setHasUnreadMessages(true);
        showToast('You have a new message!', 'success');
      });
    });

    return () => {
      channel.then(c => c.unsubscribe());
    };
  }, [user]);

  // One-time cleanup of legacy mock data (runs once per browser)
  useEffect(() => {
    const hasCleaned = localStorage.getItem('khojsetu_legacy_cleaned_v2');
    if (!hasCleaned) {
      console.log('🧹 Cleaning legacy mock data...');
      const keysToRemove = [
        'khojsetu_posts',
        'khojsetu_chats',
        'khojsetu_users',
        'khojsetu_mock_creds',
        'khojsetu_current_user' // Force re-login
      ];
      keysToRemove.forEach(k => localStorage.removeItem(k));
      localStorage.setItem('khojsetu_legacy_cleaned_v2', 'true');

      // Optional: Force reload to clear memory state
      window.location.reload();
    }
  }, []);

  // One-time cleanup of legacy data
  useEffect(() => {
    const hasCleaned = localStorage.getItem('khojsetu_cleaned_legacy');
    if (!hasCleaned) {
      console.log('Cleaning legacy data...');
      localStorage.removeItem('khojsetu_posts');
      localStorage.removeItem('khojsetu_chats');
      localStorage.removeItem('khojsetu_users'); // Clears old users
      localStorage.removeItem('khojsetu_user');  // Clears current session
      localStorage.setItem('khojsetu_cleaned_legacy', 'true');
      window.location.reload(); // Force reload to apply clean state
    }
  }, []);

  // Check for logged-in user on mount
  useEffect(() => {
    const currentUser = AuthService.getCurrentUser();
    setUser(currentUser);
    if (currentUser) {
      loadPostCount(currentUser.id);
    }
  }, []);

  const loadPostCount = async (userId: string) => {
    const posts = await PostService.getAllPosts();
    const count = posts.filter(p => p.userId === userId).length;
    setUserPostCount(count);
  };

  const handleLogout = () => {
    AuthService.logout();
    setUser(null);
    setShowProfileMenu(false);
    setUserPostCount(0);
    showToast('Logged out successfully', 'success');
  };

  // Alert Helpers
  const showConfirm = (title: string, message: string, onConfirm: () => void, type: DialogType = 'confirm', confirmText?: string) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      type,
      confirmText,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const showAlert = (title: string, message: string, type: DialogType = 'alert') => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      type,
      onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })),
    });
  };

  const showToast = (message: string, type: ToastType) => {
    setToast({ isVisible: true, message, type });
  };

  const handlePostClick = () => {
    if (!user) {
      setIsAuthModalOpen(true);
    } else {
      setIsPostFormOpen(true);
    }
  };

  return (
    <div className="h-screen w-screen bg-background text-text overflow-hidden relative selection:bg-primary/30">

      {/* Global Alerts */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        confirmText={confirmDialog.confirmText}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />

      {/* Unified Header */}
      <Header
        viewMode={viewMode}
        setViewMode={setViewMode}
        user={user}
        onChatOpen={() => setIsChatOpen(true)}
        onLoginOpen={() => setIsAuthModalOpen(true)}
        onProfileClick={() => setShowProfileMenu(!showProfileMenu)}
        showProfileMenu={showProfileMenu}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedType={selectedType}
        setSelectedType={setSelectedType}
        onImageSearch={async () => {
          showToast("Image search initiated...", "success");
        }}
      />

      {/* Content Area */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          {viewMode === 'feed' ? (
            <motion.div
              key="feed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 0 }}
              transition={{ duration: 0.3 }}
              className="h-full overflow-y-auto"
            >
              <FeedView
                searchQuery={searchQuery}
                selectedCategory={selectedCategory}
                selectedType={selectedType}
                currentUser={user}
                onContact={(post) => {
                  if (!user) {
                    showToast("Please login to contact the owner", "error");
                    setIsAuthModalOpen(true);
                    return;
                  }
                  // Prevent self-chat
                  if (String(post.userId) === String(user.id)) {
                    showToast("You cannot chat with yourself!", "error");
                    return;
                  }

                  setChatTarget({
                    id: post.userId,
                    name: post.createdByName || post.contactInfo || `User ${post.userId}`,
                    postId: post.id,
                    postTitle: post.title,
                    postType: post.type
                  });
                  setIsChatOpen(true);
                }}
                onShowConfirm={showConfirm}
                onShowToast={showToast}
              />
              {/* Footer Integrated here */}
              <Footer />
            </motion.div>
          ) : (
            <motion.div
              key="map"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 0 }}
              transition={{ duration: 0.3 }}
              className="h-full pt-0 md:pt-0"
            >
              <LiveMap
                currentUser={user}
                onContact={(post: Post) => {
                  if (!user) {
                    showToast("Please login to contact the owner", "error");
                    setIsAuthModalOpen(true);
                    return;
                  }
                  if (String(post.userId) === String(user.id)) {
                    showToast("You cannot chat with yourself!", "error");
                    return;
                  }
                  setChatTarget({
                    id: post.userId,
                    name: post.createdByName || post.contactInfo || `User ${post.userId}`,
                    postId: post.id,
                    postTitle: post.title,
                    postType: post.type,
                    postImage: post.imageUrl
                  });
                  setIsChatOpen(true);
                }}
                onDelete={(postId: number) => {
                  showConfirm(
                    "Delete Post?",
                    "Are you sure you want to delete this post? This cannot be undone.",
                    async () => {
                      try {
                        await PostService.deletePost(postId);
                        showToast("Post deleted successfully", "success");
                        // Refresh map by reloading or using state. For now, reload is safest for the user's current flow.
                        window.location.reload();
                      } catch (error) {
                        showToast("Failed to delete post", "error");
                      }
                    },
                    "danger",
                    "Delete"
                  );
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MOBILE BOTTOM NAVIGATION (The Friendly Zone) */}
      <div className="md:hidden fixed bottom-6 left-4 right-4 z-50">
        <div className="bg-surface/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-2 flex justify-between items-center px-6">
          <button
            onClick={() => setViewMode('feed')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${viewMode === 'feed' ? 'text-primary scale-110' : 'text-gray-400 hover:text-white'}`}
          >
            <Grid3x3 className="w-6 h-6" />
            <span className="text-[10px] font-medium">Feed</span>
          </button>

          <button
            onClick={() => setViewMode('map')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${viewMode === 'map' ? 'text-primary scale-110' : 'text-gray-400 hover:text-white'}`}
          >
            <MapIcon className="w-6 h-6" />
            <span className="text-[10px] font-medium">Map</span>
          </button>

          {/* Middle: Add Post FAB (Docked) */}
          <div className="relative -top-5"> {/* Push up slightly to break boundary if desired, or remove -top-5 to stay inline. User wanted 'lower', so let's keep it inline or just slightly popped */}
            <motion.button
              onClick={handlePostClick}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-3.5 bg-gradient-to-tr from-primary to-secondary rounded-full text-white shadow-xl shadow-primary/40 border-4 border-background"
            >
              <Plus className="w-6 h-6" />
            </motion.button>
          </div>

          <button
            onClick={() => {
              setIsChatOpen(true);
              setHasUnreadMessages(false); // Clear notification on open
            }}
            className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all text-gray-400 hover:text-white"
          >
            <div className="relative">
              <MessageSquare className="w-6 h-6" />
              {hasUnreadMessages && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-surface animate-pulse"></span>
              )}
            </div>
            <span className="text-[10px] font-medium">Chat</span>
          </button>

          <button
            onClick={() => user ? setShowProfileMenu(!showProfileMenu) : setIsAuthModalOpen(true)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${showProfileMenu ? 'text-primary' : 'text-gray-400 hover:text-white'}`}
          >
            {user ? (
              <img src={user.avatar} className={`w-6 h-6 rounded-full border-2 ${showProfileMenu ? 'border-primary' : 'border-transparent'}`} />
            ) : (
              <UserIcon className="w-6 h-6" />
            )}
            <span className="text-[10px] font-medium">{user ? 'Me' : 'Login'}</span>
          </button>
        </div>
      </div>

      {/* Desktop Floating Action Button (Hidden on Mobile) */}
      <motion.button
        onClick={handlePostClick}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="hidden md:block fixed z-[60] 
                    bottom-8 right-8
                    p-4 bg-gradient-to-tr from-primary to-secondary rounded-full text-white shadow-2xl shadow-primary/50 border-4 border-background"
      >
        <Plus className="w-7 h-7" />
      </motion.button>

      {/* Mobile Profile Menu Overlay (Appears when 'Me' is clicked) */}
      <AnimatePresence>
        {showProfileMenu && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-0 z-[55] flex flex-col justify-end md:absolute md:top-16 md:right-0 md:left-auto md:w-72 md:h-auto md:justify-start"
            onClick={() => setShowProfileMenu(false)} // Close when clicking outside
          >
            <div onClick={e => e.stopPropagation()} className="absolute right-0 mt-2 w-64 bg-surface/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden py-2 z-50">
              <div className="px-4 py-3 border-b border-border text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-secondary p-0.5 mx-auto mb-2">
                  <img src={user?.avatar} alt={user?.name} className="w-full h-full rounded-full bg-black" />
                </div>
                <p className="font-bold text-lg text-text truncate">{user?.name}</p>
                <p className="text-xs text-muted truncate">@{user?.email?.split('@')[0]}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                  <span>{userPostCount} Posts</span>
                </div>
              </div>

              <div className="p-2 space-y-1">
                <button
                  onClick={() => { setIsMyPostsOpen(true); setShowProfileMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition group"
                >
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition">
                    <Archive className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="block font-semibold text-text">My Posts</span>
                    <span className="text-xs text-muted">Manage your listings</span>
                  </div>
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 transition group"
                >
                  <div className="p-2 rounded-lg bg-red-500/10 text-red-500 group-hover:bg-red-500 group-hover:text-white transition">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="block font-semibold text-red-500 group-hover:text-red-600 dark:group-hover:text-red-400">Log Out</span>
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals & Overlays */}
      <AnimatePresence mode="wait">
        {isPostFormOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsPostFormOpen(false)}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <PostItemForm
                onClose={() => setIsPostFormOpen(false)}
                onShowAlert={showAlert}
              />
            </div>
          </motion.div>
        )}
        {isChatOpen && (
          <ChatInterface
            onClose={() => {
              setIsChatOpen(false);
              setChatTarget(null);
            }}
            initialContact={chatTarget}
            onShowConfirm={showConfirm}
            onShowAlert={showAlert}
          />
        )}
        {/* Authentication Modal */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onLogin={(user) => {
            setUser(user);
            setIsAuthModalOpen(false);
          }}
          onForgotPassword={() => {
            setIsAuthModalOpen(false);
            setShowForgotPassword(true);
          }}
        />

        {/* Forgot Password Modal */}
        <ForgotPasswordModal
          isOpen={showForgotPassword}
          onClose={() => setShowForgotPassword(false)}
          onLoginClick={() => {
            setShowForgotPassword(false);
            setIsAuthModalOpen(true);
          }}
        />
        {isMyPostsOpen && (
          <MyPostsModal
            onClose={() => {
              setIsMyPostsOpen(false);
              if (user) loadPostCount(user.id);
            }}
            onShowConfirm={showConfirm}
            onShowToast={showToast}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
