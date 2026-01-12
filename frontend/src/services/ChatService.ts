import { supabase, USE_MOCK } from '../lib/supabase';
import type { User } from '../types/auth';

export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    senderAvatar: string;
    text: string;
    timestamp: Date;
    messageType?: 'text' | 'location';
    location?: {
        lat: number;
        lng: number;
        name?: string;
    };
}

export interface ChatConversation {
    id: string; // Unique ID composed of post_id and participant_ids
    participantId: string;
    participantName: string;
    participantAvatar: string;
    participantEmail: string;
    postId: number;
    postTitle: string;
    postType: 'LOST' | 'FOUND';
    messages: ChatMessage[];
    createdAt: Date;
    lastMessageAt: Date;
    lastMessage: string;
    unreadCount: number;
}

const STORAGE_KEY = 'khojsetu_mock_messages';

export const ChatService = {
    /**
     * Get all conversations for the current user
     * Since we don't have a 'conversations' table, we infer them from messages
     */
    /**
     * Get all conversations for the current user
     * Optimized: Returns metadata and last message only
     */
    getConversations: async (userId: string): Promise<ChatConversation[]> => {
        let messages: any[] = [];

        if (USE_MOCK) {
            console.log("Mock Mode: Fetching conversations...");
            const allMessages = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            messages = allMessages.filter((m: any) => m.sender_id === userId || m.receiver_id === userId);
        } else {
            // Optimized query: We just need to find all unique conversations
            // In a better schema, we'd have a 'conversations' table. 
            // Here, we fetch messages but group them.
            const { data, error } = await supabase
                .from('messages')
                .select(`
                    id, 
                    content, 
                    created_at, 
                    sender_id, 
                    receiver_id, 
                    post_id,
                    sender:sender_id (name, avatar_url, email),
                    receiver:receiver_id (name, avatar_url, email),
                    post:post_id (title, type)
                `)
                .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching chats:", error);
                return [];
            }
            messages = data || [];
        }

        const conversationsMap = new Map<string, ChatConversation>();

        for (const msg of messages) {
            const isSender = msg.sender_id === userId;
            const participantId = isSender ? msg.receiver_id : msg.sender_id;
            const participant = isSender ? msg.receiver : msg.sender;
            const conversationKey = `${msg.post_id}_${participantId}`;

            if (!conversationsMap.has(conversationKey)) {
                conversationsMap.set(conversationKey, {
                    id: conversationKey,
                    participantId: participantId,
                    participantName: participant?.name || 'Unknown',
                    participantAvatar: participant?.avatar_url || '',
                    participantEmail: participant?.email || '',
                    postId: msg.post_id,
                    postTitle: msg.post?.title || 'Unknown Post',
                    postType: msg.post?.type || 'LOST',
                    messages: [], // Initialize empty, will be loaded on demand
                    createdAt: new Date(msg.created_at),
                    lastMessageAt: new Date(msg.created_at),
                    lastMessage: msg.content,
                    unreadCount: 0
                });
            }

            // We no longer push all messages into the list metadata
        }

        return Array.from(conversationsMap.values()).sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
    },

    /**
     * Get messages for a specific conversation
     */
    getMessages: async (userId: string, participantId: string, postId: number): Promise<ChatMessage[]> => {
        if (USE_MOCK) {
            const allMessages = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            const convMessages = allMessages.filter((m: any) =>
                m.post_id === postId &&
                ((m.sender_id === userId && m.receiver_id === participantId) ||
                    (m.sender_id === participantId && m.receiver_id === userId))
            );
            return convMessages.map((msg: any) => ({
                id: msg.id.toString(),
                senderId: msg.sender_id,
                senderName: msg.sender_id === userId ? 'You' : 'Participant',
                senderAvatar: '',
                text: msg.content,
                timestamp: new Date(msg.created_at),
                messageType: 'text',
            })).sort((a: ChatMessage, b: ChatMessage) => a.timestamp.getTime() - b.timestamp.getTime());
        }

        const { data, error } = await supabase
            .from('messages')
            .select(`
                *,
                sender:sender_id (name, avatar_url)
            `)
            .eq('post_id', postId)
            .or(`and(sender_id.eq.${userId},receiver_id.eq.${participantId}),and(sender_id.eq.${participantId},receiver_id.eq.${userId})`)
            .order('created_at', { ascending: true });

        if (error) {
            console.error("Error fetching messages:", error);
            return [];
        }

        return (data || []).map((msg) => ({
            id: msg.id.toString(),
            senderId: msg.sender_id,
            senderName: msg.sender?.name || 'Unknown',
            senderAvatar: msg.sender?.avatar_url || '',
            text: msg.content,
            timestamp: new Date(msg.created_at),
            messageType: 'text',
        }));
    },

    /**
     * Send a message
     */
    sendMessage: async (
        currentUser: User,
        participantId: string,
        postId: number,
        text: string
    ): Promise<ChatMessage | null> => {
        if (USE_MOCK) {
            console.log("Mock Mode: Sending message...");
            const newMessage = {
                id: Date.now(),
                sender_id: currentUser.id,
                receiver_id: participantId,
                post_id: postId,
                content: text,
                created_at: new Date().toISOString()
            };

            const allMessages = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            allMessages.push(newMessage);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(allMessages));

            return {
                id: newMessage.id.toString(),
                senderId: currentUser.id,
                senderName: currentUser.name,
                senderAvatar: currentUser.avatar || '',
                text: text,
                timestamp: new Date()
            };
        }

        const { data, error } = await supabase
            .from('messages')
            .insert({
                sender_id: currentUser.id,
                receiver_id: participantId,
                post_id: postId,
                content: text
            })
            .select(`
                *,
                sender:sender_id (name, avatar_url)
            `)
            .single();

        if (error) {
            console.error("Send message failed in Supabase:", error);
            throw new Error(`Message delivery failed: ${error.message}`);
        }

        return {
            id: data.id.toString(),
            senderId: data.sender_id,
            senderName: data.sender?.name || currentUser.name,
            senderAvatar: data.sender?.avatar_url || currentUser.avatar,
            text: data.content,
            timestamp: new Date(data.created_at)
        };
    },

    /**
     * Subscribe to new messages
     */
    subscribeToMessages: (userId: string, onNewMessage: () => void) => {
        if (USE_MOCK) {
            // No real-time in mock mode, but we can return a dummy unsubscriber
            return { unsubscribe: () => { } };
        }

        return supabase
            .channel('public:messages')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `receiver_id=eq.${userId}`
                },
                (payload: any) => {
                    console.log('New message received!', payload);
                    onNewMessage();
                }
            )
            .subscribe();
    },

    /**
     * Delete a conversation
     */
    deleteConversation: async (currentUserId: string, participantId: string, postId: number) => {
        if (USE_MOCK) {
            console.log("Mock Mode: Deleting conversation...");
            const allMessages = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            const filtered = allMessages.filter((m: any) => {
                const belongsToConv = (m.post_id === postId) &&
                    ((m.sender_id === currentUserId && m.receiver_id === participantId) ||
                        (m.sender_id === participantId && m.receiver_id === currentUserId));
                return !belongsToConv;
            });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
            return true;
        }

        const { error } = await supabase
            .from('messages')
            .delete()
            .match({ post_id: postId })
            .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${participantId}),and(sender_id.eq.${participantId},receiver_id.eq.${currentUserId})`);

        if (error) {
            console.error("Error deleting conversation:", error);
            throw error;
        }

        return true;
    }
};
