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

export const ChatService = {
    /**
     * Get all conversations for the current user
     * Since we don't have a 'conversations' table, we infer them from messages
     */
    getConversations: async (userId: string): Promise<ChatConversation[]> => {
        // Fetch all messages involving the user
        const { data: messages, error } = await supabase
            .from('messages')
            .select(`
                *,
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

        const conversationsMap = new Map<string, ChatConversation>();

        for (const msg of messages) {
            // Determine the "other" participant
            const isSender = msg.sender_id === userId;
            const participantId = isSender ? msg.receiver_id : msg.sender_id;
            const participant = isSender ? msg.receiver : msg.sender;

            // Unique Key for a conversation: PostID + ParticipantID
            // (A user can have multiple chats with different people about the same post,
            // OR multiple chats with same person about different posts)
            // We'll treat (PostID + ParticipantID) as unique conversation key.
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
                    messages: [],
                    createdAt: new Date(msg.created_at), // Approx
                    lastMessageAt: new Date(msg.created_at),
                    lastMessage: msg.content,
                    unreadCount: 0
                });
            }

            const conv = conversationsMap.get(conversationKey)!;

            // Add message to conversation
            conv.messages.push({
                id: msg.id.toString(),
                senderId: msg.sender_id,
                senderName: msg.sender?.name || 'Unknown',
                senderAvatar: msg.sender?.avatar_url || '',
                text: msg.content,
                timestamp: new Date(msg.created_at),
                messageType: 'text', // Basic text support for now, expand if JSON needed
            });

            // Re-sort messages by time ascending within conversation
            conv.messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        }

        return Array.from(conversationsMap.values()).sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
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
            console.error("Send failed:", error);
            return null;
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
                (payload) => {
                    console.log('New message received!', payload);
                    onNewMessage();
                }
            )
            .subscribe();
    },

    /**
     * Delete a conversation (Delete all messages between two users for a specific post)
     */
    deleteConversation: async (currentUserId: string, participantId: string, postId: number) => {
        // Delete messages where (sender=current AND receiver=participant AND post=postId)
        // OR (sender=participant AND receiver=current AND post=postId)
        const { error, count } = await supabase
            .from('messages')
            .delete({ count: 'exact' })
            .match({ post_id: postId })
            .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${participantId}),and(sender_id.eq.${participantId},receiver_id.eq.${currentUserId})`);

        if (error) {
            console.error("Error deleting conversation:", error);
            throw error;
        }

        console.log(`Deleted ${count} messages for conversation ${postId}_${participantId}`);
        return true;
    }
};
