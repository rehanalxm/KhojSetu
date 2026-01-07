import { motion } from 'framer-motion';
import { MapPin, Clock, MessageCircle, Trash2, Smartphone, ImageIcon } from 'lucide-react';
import { CATEGORIES, getTimeAgo } from '../types/categories';
import type { Post } from '../types/categories';
import type { User } from '../types/auth';

interface PostCardProps {
    post: Post;
    onClick?: () => void;
    onContact?: (post: Post) => void;
    onDelete?: (postId: number) => void;
    currentUser: User | null;
}

export default function PostCard({ post, onClick, onContact, onDelete, currentUser }: PostCardProps) {
    // Check ownership
    // Use String constraints to ensure loose equality works regardless of number/string types
    const isOwner = currentUser && (String(post.userId) === String(currentUser.id));

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="group bg-surface hover:bg-surface/80 border border-border rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 relative flex flex-col h-full"
            onClick={onClick}
        >
            {/* Image Area - Taller and cleaner */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/40">
                {/* Status & Category Badges (Floating) */}
                <div className="absolute top-4 left-4 z-10 flex gap-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold shadow-lg backdrop-blur-md border border-white/20 flex items-center gap-1.5 ${post.type === 'LOST'
                        ? 'bg-red-500/90 text-white'
                        : 'bg-green-500/90 text-white'
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${post.type === 'LOST' ? 'bg-white animate-pulse' : 'bg-white'}`}></div>
                        {post.type}
                    </div>
                </div>
                {post.imageUrl ? (
                    <img
                        src={post.imageUrl}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-surface to-surface/50">
                        <ImageIcon className="w-12 h-12 text-muted" />
                    </div>
                )}

                {/* Category Badge - Bottom Right of Image */}
                <div className="absolute bottom-3 right-3">
                    <span className="px-2 py-1 rounded-md text-[10px] font-medium bg-black/60 backdrop-blur-md text-white border border-white/10 flex items-center gap-1">
                        <Smartphone className="w-3 h-3" />
                        {post.category}
                    </span>
                </div>
            </div>

            {/* Content Area */}
            <div className="p-4 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-text leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                        {post.title}
                    </h3>
                    <span className="text-[10px] text-muted whitespace-nowrap pt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {getTimeAgo(post.timestamp)}
                    </span>
                </div>

                <p className="text-xs text-muted mb-4 line-clamp-2 leading-relaxed flex-1">
                    {post.description}
                </p>

                {/* Footer Info */}
                <div className="flex items-center gap-2 text-xs text-muted mb-4">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span className="truncate max-w-[200px]">{post.location.name || "Unknown Location"}</span>
                </div>

                {/* Actions */}
                <div className="mt-auto pt-3 border-t border-border flex gap-2">
                    {!isOwner && (
                        <button
                            className="flex-1 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary hover:text-white font-semibold text-xs transition-all flex items-center justify-center gap-2"
                            onClick={(e) => {
                                e.stopPropagation();
                                onContact?.(post);
                            }}
                        >
                            <MessageCircle className="w-3.5 h-3.5" />
                            Contact
                        </button>
                    )}

                    {isOwner && onDelete && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(post.id);
                            }}
                            className="flex-1 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-white font-semibold text-xs transition-all flex items-center justify-center gap-2"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
