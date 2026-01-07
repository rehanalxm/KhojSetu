import { useState, useEffect, useRef } from 'react';
import { Send, X, ArrowLeft, MessageCircle, MoreVertical, MapPin, Loader2, Trash2, Eraser, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthService } from '../services/AuthService';
import { ChatService, type ChatConversation } from '../services/ChatService';

interface ChatProps {
    onClose: () => void;
    initialContact?: { id: string; name: string; postId: number; postTitle: string; postType: 'LOST' | 'FOUND'; postImage?: string } | null;
    onShowConfirm?: (title: string, message: string, onConfirm: () => void, type?: any, confirmText?: string) => void;
    onShowAlert?: (title: string, message: string, type?: any) => void;
}

export default function ChatInterface({ onClose, initialContact, onShowConfirm, onShowAlert }: ChatProps) {
    const currentUser = AuthService.getCurrentUser();
    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [showMenu, setShowMenu] = useState(false);
    const hasHandledInitial = useRef(false);

    const handleDeleteChat = async () => {
        if (!activeConversationId || !currentUser) return;
        const activeConv = conversations.find(c => c.id === activeConversationId);
        if (!activeConv) return;

        onShowConfirm?.(
            "Delete Conversation?",
            "This will permanently delete this conversation and all its messages for both users. This cannot be undone.",
            async () => {
                try {
                    await ChatService.deleteConversation(currentUser.id, activeConv.participantId, activeConv.postId);
                    setConversations(prev => prev.filter(c => c.id !== activeConversationId));
                    setActiveConversationId(null);
                    setShowMenu(false);
                } catch (error) {
                    console.error(error);
                    onShowAlert?.("Error", "Failed to delete chat.", "danger");
                }
            },
            "danger",
            "Delete"
        );
    };

    const handleClearChat = async () => {
        if (!activeConversationId || !currentUser) return;
        const activeConv = conversations.find(c => c.id === activeConversationId);
        if (!activeConv) return;

        onShowConfirm?.(
            "Clear Messages?",
            "This will delete all messages in this chat. This action is permanent.",
            async () => {
                try {
                    // Logic: Delete all messages for this conv
                    await ChatService.deleteConversation(currentUser.id, activeConv.participantId, activeConv.postId);
                    // Instead of removing from list, we just empty the messages
                    setConversations(prev => prev.map(c =>
                        c.id === activeConversationId ? { ...c, messages: [], lastMessage: '' } : c
                    ));
                    setShowMenu(false);
                } catch (error) {
                    console.error(error);
                    onShowAlert?.("Error", "Failed to clear messages.", "danger");
                }
            },
            "danger",
            "Clear"
        );
    };

    // Initial Load & Realtime Subscription
    useEffect(() => {
        if (!currentUser) return;

        setLoading(true);
        loadConversations().finally(() => setLoading(false));

        // Subscribe to real-time messages
        const subscription = ChatService.subscribeToMessages(currentUser.id, () => {
            loadConversations(); // Reload conversations on new message
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [currentUser?.id]);

    // Handle "Contact" button click from Feed
    useEffect(() => {
        if (initialContact && currentUser && !loading && !hasHandledInitial.current) {
            hasHandledInitial.current = true;
            handleCreateOrOpenConversation(initialContact);
        }
    }, [initialContact, currentUser, loading]);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (messagesEndRef.current) {
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }, [activeConversationId, conversations, input]);

    const loadConversations = async () => {
        if (!currentUser) return;
        try {
            const convs = await ChatService.getConversations(currentUser.id);
            // Preserve the active conversation if it was a temporary new one
            setConversations(() => {
                // Merge real convs with temps (deduplicate if temp became real)
                // For simplicity, we just use real convs, but if we are in a temp chat, keep it?
                // Actually, if a message was received for a temp chat, it would now be a real chat in 'convs'.

                // We should check if the active conversation (if temp) is now in the list
                return convs;
            });

            // If we had a temp conversation that got a real message, we should switch to the real ID?
            // This is complex. For now, simple reload.
        } catch (error) {
            console.error('Failed to load conversations:', error);
        }
    };

    const handleCreateOrOpenConversation = async (contact: {
        id: string;
        name: string;
        postId: number;
        postTitle: string;
        postType: 'LOST' | 'FOUND';
        postImage?: string;
    }) => {
        const existing = conversations.find(c =>
            c.postId === contact.postId && c.participantId === contact.id
        );

        if (existing) {
            setActiveConversationId(existing.id);
        } else {
            const tempId = `temp-${Date.now()}`;
            const newConv: ChatConversation = {
                id: tempId,
                participantId: contact.id,
                participantName: contact.name,
                participantAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.name}`,
                participantEmail: '',
                postId: contact.postId,
                postTitle: contact.postTitle,
                postType: contact.postType,
                messages: [],
                createdAt: new Date(),
                lastMessageAt: new Date(),
                lastMessage: '',
                unreadCount: 0
            };
            setConversations(prev => [newConv, ...prev]);
            setActiveConversationId(tempId);

            // Automatically send the reference message
            const refData = {
                title: contact.postTitle,
                image: contact.postImage,
                type: contact.postType,
                postId: contact.postId
            };
            const referenceMsg = `[REF_CARD]${JSON.stringify(refData)}`;

            try {
                if (currentUser) {
                    await ChatService.sendMessage(
                        currentUser,
                        contact.id,
                        contact.postId,
                        referenceMsg
                    );
                }
                await loadConversations();
            } catch (err) {
                console.error("Failed to send auto-message", err);
            }
        }
    };

    const handleSendMessage = async () => {
        if (!input.trim() || !activeConversationId || !currentUser) return;

        const activeConv = conversations.find(c => c.id === activeConversationId);
        if (!activeConv) return;

        setSending(true);
        try {
            await ChatService.sendMessage(
                currentUser,
                activeConv.participantId,
                activeConv.postId,
                input.trim()
            );

            setInput("");
            await loadConversations(); // Refresh to get the new message with correct DB ID

            // If this was a temp conversation, the refresh might populate the REAL conversation.
            // We need to ensure we switch the active ID to the real one if needed.
            if (activeConversationId.startsWith('temp-')) {
                // After reload, find the conversation with same post/participant
                const updatedConvs = await ChatService.getConversations(currentUser.id);
                const realConv = updatedConvs.find(c =>
                    c.postId === activeConv.postId && c.participantId === activeConv.participantId
                );
                if (realConv) {
                    setActiveConversationId(realConv.id);
                }
            }

        } catch {
            console.error('Failed to send message.');
        } finally {
            setSending(false);
        }
    };

    const handleShareLocation = async () => {
        if (!activeConversationId || !currentUser) return;
        const activeConv = conversations.find(c => c.id === activeConversationId);
        if (!activeConv) return;

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const locationText = `📍 Shared location: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;

                    try {
                        await ChatService.sendMessage(
                            currentUser,
                            activeConv.participantId,
                            activeConv.postId,
                            locationText
                        );
                        loadConversations();
                    } catch (error) {
                        console.error('Failed to send location:', error);
                    }
                },
                () => {
                    alert('Could not access your location.');
                }
            );
        }
    };

    const activeConversation = activeConversationId
        ? conversations.find(c => c.id === activeConversationId)
        : null;

    const formatTime = (date: Date) => {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="fixed bottom-4 right-4 w-[90vw] md:w-96 h-[80vh] md:h-[500px] bg-surface/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col z-[1000]"
        >
            {/* Header */}
            <div className="bg-surface/80 backdrop-blur-md p-4 border-b border-border flex justify-between items-center relative z-50">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {activeConversationId && (
                        <button
                            onClick={() => setActiveConversationId(null)}
                            className="p-1 hover:bg-black/5 rounded-full transition flex-shrink-0"
                        >
                            <ArrowLeft className="w-5 h-5 text-muted hover:text-text" />
                        </button>
                    )}

                    {activeConversation ? (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <img
                                src={activeConversation.participantAvatar}
                                alt={activeConversation.participantName}
                                className="w-8 h-8 rounded-full ring-2 ring-primary/30"
                            />
                            <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-text text-sm truncate">
                                    {activeConversation.participantName}
                                </h3>
                                <p className="text-xs text-muted truncate">
                                    {activeConversation.postType === 'LOST' ? '🔍' : '✓'} {activeConversation.postTitle}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-primary/20 rounded-lg flex-shrink-0">
                                <MessageCircle className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-bold text-text">Messages</h3>
                                <p className="text-xs text-muted">
                                    {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                    {activeConversationId && (
                        <div className="relative">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition"
                            >
                                <MoreVertical className="w-5 h-5 text-muted hover:text-text" />
                            </button>

                            {/* Dropdown Menu */}
                            <AnimatePresence>
                                {showMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                        className="absolute -right-2 top-full mt-3 w-52 bg-surface/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-[100] p-1.5"
                                    >
                                        <button
                                            onClick={() => { onShowAlert?.("Coming Soon", "User profiles will be available in a future update!", "info"); setShowMenu(false); }}
                                            className="w-full text-left px-4 py-3 rounded-xl text-sm text-text hover:bg-white/10 transition flex items-center gap-3 active:scale-95"
                                        >
                                            <div className="p-1.5 bg-blue-500/20 rounded-lg">
                                                <UserIcon className="w-4 h-4 text-blue-500" />
                                            </div>
                                            <span className="font-semibold tracking-wide">View Profile</span>
                                        </button>
                                        <button
                                            onClick={handleClearChat}
                                            className="w-full text-left px-4 py-3 rounded-xl text-sm text-orange-500 hover:bg-orange-500/10 transition flex items-center gap-3 active:scale-95"
                                        >
                                            <div className="p-1.5 bg-orange-500/20 rounded-lg">
                                                <Eraser className="w-4 h-4 text-orange-500" />
                                            </div>
                                            <span className="font-semibold tracking-wide">Clear Chat</span>
                                        </button>
                                        <div className="my-1.5 border-t border-white/5" />
                                        <button
                                            onClick={handleDeleteChat}
                                            className="w-full text-left px-4 py-3 rounded-xl text-sm text-red-500 hover:bg-red-500/10 transition flex items-center gap-3 active:scale-95"
                                        >
                                            <div className="p-1.5 bg-red-500/20 rounded-lg">
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </div>
                                            <span className="font-semibold tracking-wide">Delete Chat</span>
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition"
                    >
                        <X className="w-5 h-5 text-muted hover:text-text" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-surface/30 scrollbar-thin scrollbar-thumb-muted/30 scrollbar-track-transparent">
                {loading && conversations.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400 gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Loading chats...</span>
                    </div>
                ) : !activeConversationId ? (
                    // Conversations List
                    <div className="p-2 space-y-1">
                        {conversations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                <div className="p-4 bg-white/5 rounded-full mb-3">
                                    <MessageCircle className="w-8 h-8 text-gray-500" />
                                </div>
                                <p className="text-sm text-gray-400">No conversations yet</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Contact someone on a post to start chatting!
                                </p>
                            </div>
                        ) : (
                            conversations.map((conv) => (
                                <motion.div
                                    key={conv.id}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setActiveConversationId(conv.id)}
                                    className="p-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl cursor-pointer transition flex items-center gap-3 border border-transparent hover:border-border"
                                >
                                    <img
                                        src={conv.participantAvatar}
                                        alt={conv.participantName}
                                        className="w-12 h-12 rounded-full ring-2 ring-white/10"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-0.5" >
                                            <h4 className="font-semibold text-sm text-text truncate">
                                                {conv.participantName}
                                            </h4>
                                            <span className="text-[10px] text-gray-500 flex-shrink-0 ml-2">
                                                {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleDateString() : 'New'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted truncate mb-1">
                                            {conv.lastMessage || 'Start a conversation'}
                                        </p>
                                        <div className="flex gap-1">
                                            <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase">
                                                {conv.postType}
                                            </span>
                                            <span className="text-[10px] text-muted bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full truncate max-w-[100px]">
                                                {conv.postTitle}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                ) : (
                    // Messages View
                    <div className="p-4 flex flex-col h-full">
                        {activeConversation?.messages && activeConversation.messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <p className="text-sm text-gray-400">No messages yet</p>
                                <p className="text-xs text-gray-500 mt-1">Say Hello! 👋</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-3 overflow-y-auto flex-1">
                                    {activeConversation?.messages.map((msg, index) => {
                                        const isCurrentUser = msg.senderId === currentUser?.id;
                                        const isRefCard = msg.text.startsWith('[REF_CARD]');

                                        let refContent = null;
                                        if (isRefCard) {
                                            try {
                                                refContent = JSON.parse(msg.text.replace('[REF_CARD]', ''));
                                            } catch (e) { }
                                        }

                                        return (
                                            <motion.div
                                                key={msg.id || index}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`flex w-full mb-4 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                                            >
                                                {!isCurrentUser && (
                                                    <img
                                                        src={msg.senderAvatar}
                                                        alt={msg.senderName}
                                                        className="w-8 h-8 rounded-full mr-2 ring-1 ring-white/10 flex-shrink-0 self-end mb-1"
                                                    />
                                                )}

                                                {isRefCard && refContent ? (
                                                    <div className={`max-w-[85%] rounded-2xl overflow-hidden shadow-xl border border-white/10 bg-surface/50 backdrop-blur-md flex flex-col ${isCurrentUser ? 'rounded-br-none' : 'rounded-bl-none'}`}>
                                                        {refContent.image && (
                                                            <div className="h-40 w-full relative">
                                                                <img src={refContent.image} className="w-full h-full object-cover" />
                                                                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
                                                                <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase text-white shadow-lg ${refContent.type === 'LOST' ? 'bg-red-500' : 'bg-green-500'}`}>
                                                                    {refContent.type}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <div className="p-3">
                                                            <p className="text-[10px] text-muted uppercase font-bold tracking-wider mb-1">
                                                                {isCurrentUser ? 'I am interested in:' : 'Looking for:'}
                                                            </p>
                                                            <h4 className="font-bold text-sm text-text leading-tight">{refContent.title}</h4>
                                                        </div>
                                                        <div className="px-3 pb-2 flex justify-between items-center gap-4 opacity-70">
                                                            <span className="text-[9px] font-bold text-muted whitespace-nowrap">REF CARD</span>
                                                            <span className="text-[9px] text-muted whitespace-nowrap">{formatTime(msg.timestamp)}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-md ${isCurrentUser
                                                            ? 'bg-gradient-to-br from-primary to-indigo-600 text-white rounded-br-none'
                                                            : 'bg-surface border border-border text-text rounded-bl-none'
                                                            }`}
                                                    >
                                                        <p className="break-words font-medium">{msg.text}</p>
                                                        <div className="flex justify-end mt-1 items-center gap-1 opacity-70">
                                                            <span className="text-[9px] font-medium">{formatTime(msg.timestamp)}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Input Area */}
            {activeConversationId && (
                <div className="p-3 bg-surface border-t border-border">
                    <div className="flex gap-2 mb-2">
                        <button
                            onClick={handleShareLocation}
                            className="p-3 bg-surface border border-border rounded-full text-muted hover:text-primary hover:border-primary transition"
                            title="Share Location"
                        >
                            <MapPin className="w-5 h-5" />
                        </button>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Type a message..."
                            disabled={sending}
                            className="flex-1 bg-black/5 dark:bg-black/40 border border-border rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition text-text placeholder-muted disabled:opacity-50"
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!input.trim() || sending}
                            className="p-3 min-w-[44px] min-h-[44px] bg-gradient-to-r from-primary to-secondary rounded-full text-white hover:opacity-90 transition shadow-lg shadow-primary/30 flex items-center justify-center disabled:opacity-50"
                        >
                            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
