import { supabase } from '../lib/supabase';
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
    id: string;
    participantId: string;
    participantName: string;
    participantAvatar: string;
    participantEmail: string;
    postId: string | number;
    postTitle: string;
    postType: 'LOST' | 'FOUND';
    messages: ChatMessage[];
    createdAt: Date;
    lastMessageAt: Date;
    lastMessage: string;
    unreadCount: number;
}


export const ChatService = {
    // ======================== GET CONVERSATIONS ========================
    getConversations: async (userId: string): Promise<ChatConversation[]> => {
        let messages: any[] = [];

        try {
            // First try 'messages' table
            let res = await supabase
                .from('messages')
                .select(
                    `
                    id, content, created_at, sender_id, receiver_id, post_id,
                    sender:profiles!sender_id (name, avatar_url, email),
                    receiver:profiles!receiver_id (name, avatar_url, email),
                    post:post_id (title, type)
                `
                )
                .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
                .order('created_at', { ascending: false });

            // If 'messages' failed, fallback try 'chats'
            if (res.error) {
                res = await supabase
                    .from('chats')
                    .select(
                        `
                        id, content, created_at, sender_id, receiver_id, post_id,
                        sender:profiles!sender_id (name, avatar_url, email),
                        receiver:profiles!receiver_id (name, avatar_url, email),
                        post:post_id (title, type)
                    `
                    )
                    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
                    .order('created_at', { ascending: false });
            }

            if (res.error) {
                console.error('Error fetching chats:', res.error);
                return [];
            }
            messages = res.data || [];
        } catch (err: any) {
            console.error('getConversations failed:', err);
            return [];
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
                    participantId,
                    participantName: participant?.name || participant?.email?.split('@')[0] || 'Unknown User',
                    participantAvatar: participant?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${participantId}`,
                    participantEmail: participant?.email || '',
                    postId: msg.post_id,
                    postTitle: msg.post?.title || 'Item Discussion',
                    postType: (msg.post?.type || 'LOST').toUpperCase() as 'LOST' | 'FOUND',
                    messages: [],
                    createdAt: new Date(msg.created_at),
                    lastMessageAt: new Date(msg.created_at),
                    lastMessage: msg.content,
                    unreadCount: 0
                });
            }
        }

        return Array.from(conversationsMap.values()).sort(
            (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
        );
    },

    // ======================== GET MESSAGES ========================
    getMessages: async (
        userId: string,
        participantId: string,
        postId: string | number
    ): Promise<ChatMessage[]> => {
        try {
            let res = await supabase
                .from('messages')
                .select(`*, sender:profiles!sender_id (name, avatar_url)`)
                .eq('post_id', postId)
                .or(
                    `and(sender_id.eq.${userId},receiver_id.eq.${participantId}),and(sender_id.eq.${participantId},receiver_id.eq.${userId})`
                )
                .order('created_at', { ascending: true });

            if (res.error) {
                res = await supabase
                    .from('chats')
                    .select(`*, sender:profiles!sender_id (name, avatar_url)`)
                    .eq('post_id', postId)
                    .or(
                        `and(sender_id.eq.${userId},receiver_id.eq.${participantId}),and(sender_id.eq.${participantId},receiver_id.eq.${userId})`
                    )
                    .order('created_at', { ascending: true });
            }

            if (res.error) {
                console.error('Error fetching messages:', res.error);
                return [];
            }

            return (res.data || []).map((msg) => ({
                id: msg.id.toString(),
                senderId: msg.sender_id,
                senderName: msg.sender?.name || 'User',
                senderAvatar: msg.sender?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.sender_id}`,
                text: msg.content,
                timestamp: new Date(msg.created_at),
                messageType: 'text' as const
            }));
        } catch (err: any) {
            console.error('getMessages failed:', err);
            return [];
        }
    },

    // ======================== SEND MESSAGE ========================
    sendMessage: async (
        currentUser: User,
        participantId: string,
        postId: string | number,
        text: string
    ): Promise<ChatMessage | null> => {
        try {
            const insertPayload = {
                sender_id: currentUser.id,
                receiver_id: participantId,
                post_id: postId,
                content: text
            };

            let res = await supabase
                .from('messages')
                .insert(insertPayload)
                .select(`*, sender:profiles!sender_id (name, avatar_url)`)
                .single();

            if (res.error) {
                res = await supabase
                    .from('chats')
                    .insert(insertPayload)
                    .select(`*, sender:profiles!sender_id (name, avatar_url)`)
                    .single();
            }

            if (res.error) {
                console.error('Send message failed:', res.error);
                throw new Error(`Message delivery failed: ${res.error.message}`);
            }

            const data = res.data;
            return {
                id: data.id.toString(),
                senderId: data.sender_id,
                senderName: data.sender?.name || currentUser.name,
                senderAvatar: data.sender?.avatar_url || currentUser.avatar,
                text: data.content,
                timestamp: new Date(data.created_at)
            };
        } catch (err: any) {
            console.error('sendMessage failed:', err);
            throw new Error(err?.message || 'Failed to send message. Please try again.');
        }
    },

    // ======================== REAL-TIME SUBSCRIPTION ========================
    subscribeToMessages: (userId: string, onNewMessage: (payload: any) => void) => {
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
                    onNewMessage(payload.new);
                }
            )
            .subscribe();
    },

    // ======================== DELETE CONVERSATION ========================
    deleteConversation: async (
        currentUserId: string,
        participantId: string,
        postId: string | number
    ) => {
        try {
            const filterMatch = { post_id: postId };
            const filterOr = `and(sender_id.eq.${currentUserId},receiver_id.eq.${participantId}),and(sender_id.eq.${participantId},receiver_id.eq.${currentUserId})`;

            let res = await supabase
                .from('messages')
                .delete()
                .match(filterMatch)
                .or(filterOr);

            if (res.error) {
                res = await supabase
                    .from('chats')
                    .delete()
                    .match(filterMatch)
                    .or(filterOr);
            }

            if (res.error) {
                console.error('Error deleting conversation:', res.error);
                throw res.error;
            }
            return true;
        } catch (err: any) {
            console.error('deleteConversation failed:', err);
            throw new Error(err?.message || 'Failed to delete conversation.');
        }
    }
};
