import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Calendar, MessageSquare, ChevronLeft, ChevronRight, Share2, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { Post } from '../types/categories';
import { getCategoryColor, getTimeAgo } from '../types/categories';

interface PostDetailModalProps {
    post: Post;
    onClose: () => void;
    onContact: (post: Post) => void;
    onOpenProfile: (userId: string) => void;
}

export default function PostDetailModal({ post, onClose, onContact, onOpenProfile }: PostDetailModalProps) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const images = post.imageUrls && post.imageUrls.length > 0 ? post.imageUrls : [post.imageUrl].filter(Boolean) as string[];

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-surface/95 border border-white/10 w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Image Section */}
                <div className="relative w-full md:w-1/2 aspect-square md:aspect-auto bg-black flex items-center justify-center overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.img
                            key={currentImageIndex}
                            src={images[currentImageIndex]}
                            alt={post.title}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="w-full h-full object-contain"
                        />
                    </AnimatePresence>

                    {/* Navigation Arrows */}
                    {images.length > 1 && (
                        <>
                            <button
                                onClick={prevImage}
                                className="absolute left-4 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white backdrop-blur-sm transition-all"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <button
                                onClick={nextImage}
                                className="absolute right-4 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white backdrop-blur-sm transition-all"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>

                            {/* Dots */}
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                                {images.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentImageIndex ? 'bg-primary w-4' : 'bg-white/50'}`}
                                    />
                                ))}
                            </div>
                        </>
                    )}

                    <button
                        onClick={onClose}
                        className="absolute top-4 left-4 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white md:hidden"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Section */}
                <div className="flex-1 p-6 md:p-8 overflow-y-auto flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase border ${getCategoryColor(post.category)}`}>
                            {post.category}
                        </span>
                        <div className="flex gap-2">
                            <button className="p-2 hover:bg-white/5 rounded-full transition text-muted hover:text-white">
                                <Share2 className="w-5 h-5" />
                            </button>
                            <button onClick={onClose} className="hidden md:flex p-2 hover:bg-white/5 rounded-full transition text-muted hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                        {post.type === 'LOST' ? (
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                        ) : (
                            <ShieldCheck className="w-5 h-5 text-green-500" />
                        )}
                        <h1 className="text-2xl md:text-3xl font-black text-text leading-tight tracking-tight">
                            {post.title}
                        </h1>
                    </div>

                    <p className="text-muted text-sm flex items-center gap-2 mb-6">
                        <Calendar className="w-4 h-4" />
                        Posted {getTimeAgo(post.timestamp)}
                    </p>

                    <div className="space-y-6 flex-1">
                        <div>
                            <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Description</h3>
                            <p className="text-text leading-relaxed whitespace-pre-wrap">
                                {post.description}
                            </p>
                        </div>

                        <div>
                            <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Location</h3>
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-start gap-3">
                                <div className="p-2 bg-primary/20 rounded-lg text-primary">
                                    <MapPin className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-text font-medium">{post.location.name}</p>
                                    <p className="text-xs text-muted mt-0.5">Verified Location</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/10">
                            <button
                                onClick={() => onOpenProfile(post.userId)}
                                className="flex items-center gap-3 w-full p-2 hover:bg-white/5 rounded-2xl transition group"
                            >
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-tr from-primary to-secondary p-0.5">
                                    <img
                                        src={`https://api.dicebear.com/7.x/personas/svg?seed=${post.createdByName || post.userId}`}
                                        alt={post.createdByName}
                                        className="w-full h-full rounded-full bg-black object-cover"
                                    />
                                </div>
                                <div className="text-left flex-1">
                                    <p className="text-text font-bold group-hover:text-primary transition">{post.createdByName || 'Anonymous User'}</p>
                                    <p className="text-xs text-muted">View Profile & History</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 flex gap-3">
                        <button
                            onClick={() => onContact(post)}
                            className="flex-1 bg-gradient-to-r from-primary to-secondary text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/30 hover:opacity-90 transition flex items-center justify-center gap-2"
                        >
                            <MessageSquare className="w-5 h-5" />
                            Contact {post.type === 'LOST' ? 'Finder' : 'Owner'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
