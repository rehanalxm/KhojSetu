import { useState } from 'react';
import { Search, SlidersHorizontal, X, MapPin, Grid3x3, Map as MapIcon, MessageSquare, User as UserIcon, Image as ImageIcon, Bell, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CATEGORIES } from '../types/categories';
import type { CategoryId } from '../types/categories';
import type { User } from '../types/auth';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
    viewMode: 'feed' | 'map';
    setViewMode: (mode: 'feed' | 'map') => void;
    user: User | null;
    onChatOpen: () => void;
    onLoginOpen: () => void;
    onProfileClick: () => void;
    showProfileMenu: boolean;
    // Search Props
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    selectedCategory: CategoryId | 'ALL';
    setSelectedCategory: (c: CategoryId | 'ALL') => void;
    selectedType: 'ALL' | 'LOST' | 'FOUND';
    setSelectedType: (t: 'ALL' | 'LOST' | 'FOUND') => void;
    onImageSearch?: (file: File) => void;
}

export default function Header(props: HeaderProps) {
    const [showFilters, setShowFilters] = useState(false);
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-b border-white/5 transition-all duration-300">
            {/* 1. Main Navbar */}
            <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
                {/* Logo */}
                <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.location.reload()}>
                    <div className="bg-gradient-to-tr from-primary to-secondary p-2 rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                        <MapPin className="text-white w-5 h-5" />
                    </div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-text to-muted bg-clip-text text-transparent">
                        KhojSetu
                    </h1>
                </div>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-1 bg-surface/50 p-1 rounded-full border border-border mx-auto backdrop-blur-sm">
                    <button
                        onClick={() => props.setViewMode('feed')}
                        className={`px-5 py-2 rounded-full text-sm font-semibold transition flex items-center gap-2 ${props.viewMode === 'feed' ? 'bg-primary text-white shadow-lg' : 'text-muted hover:text-text'}`}
                    >
                        <Grid3x3 className="w-4 h-4" />
                        Feed
                    </button>
                    <button
                        onClick={() => props.setViewMode('map')}
                        className={`px-5 py-2 rounded-full text-sm font-semibold transition flex items-center gap-2 ${props.viewMode === 'map' ? 'bg-primary text-white shadow-lg' : 'text-muted hover:text-text'}`}
                    >
                        <MapIcon className="w-4 h-4" />
                        Map
                    </button>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-3">
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="hidden md:flex p-2.5 hover:bg-surface rounded-full transition items-center justify-center group"
                        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    >
                        {theme === 'dark' ? (
                            <Sun className="w-5 h-5 text-muted group-hover:text-yellow-400 transition" />
                        ) : (
                            <Moon className="w-5 h-5 text-muted group-hover:text-indigo-500 transition" />
                        )}
                    </button>

                    {/* Desktop Chat */}
                    <button
                        onClick={props.onChatOpen}
                        className="hidden md:block p-2.5 hover:bg-surface rounded-full transition relative group"
                        title="Messages"
                    >
                        <MessageSquare className="w-5 h-5 text-muted group-hover:text-primary transition" />
                        {/* Notification Dot Removed */}
                    </button>

                    {/* Profile */}
                    {props.user ? (
                        <div className="relative group hidden md:block">
                            <button
                                onClick={props.onProfileClick}
                                className="flex items-center gap-2 pl-1 pr-3 py-1 bg-surface hover:bg-surface/80 rounded-full border border-border transition"
                            >
                                <img src={props.user.avatar} alt="Avatar" className="w-8 h-8 rounded-full bg-surface ring-2 ring-border" />
                                <span className="text-sm font-medium text-text max-w-[100px] truncate">{props.user.name.split(' ')[0]}</span>
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={props.onLoginOpen}
                            className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-full text-sm font-bold shadow-lg shadow-primary/20 transition"
                        >
                            <UserIcon className="w-4 h-4" />
                            Login
                        </button>
                    )}

                    {/* Mobile Chat & Menu (Simplified) */}
                    {/* Mobile: Notification Bell to fill the void */}
                    {/* Mobile: Theme Toggle to replace "useless" Bell */}
                    <button
                        onClick={toggleTheme}
                        className="md:hidden p-2 text-muted hover:text-text transition relative"
                        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    >
                        {theme === 'dark' ? (
                            <Sun className="w-5 h-5 text-yellow-400" />
                        ) : (
                            <Moon className="w-5 h-5 text-indigo-500" />
                        )}
                    </button>
                </div>
            </div>

            {/* 2. Search Bar & Filters Area */}
            <div className="border-t border-border bg-background/50 backdrop-blur-md">
                <div className="max-w-3xl mx-auto px-3 md:px-4 py-2">
                    <div className="flex gap-2">
                        {/* Search Input */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                            <input
                                type="text"
                                placeholder="Search lost items..."
                                value={props.searchQuery}
                                onChange={(e) => props.setSearchQuery(e.target.value)}
                                className="w-full bg-surface border border-border rounded-full pl-9 md:pl-10 pr-9 md:pr-10 py-2 md:py-2.5 text-sm text-text placeholder-muted focus:outline-none focus:border-primary/50 transition"
                            />
                            {/* Image Search Icon inside Input */}
                            <label className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-background rounded-full cursor-pointer transition" title="Search by Image">
                                <ImageIcon className="w-4 h-4 text-muted hover:text-primary" />
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files?.[0] && props.onImageSearch) {
                                            props.onImageSearch(e.target.files[0]);
                                        }
                                    }}
                                />
                            </label>
                        </div>

                        {/* Filter Toggle */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`p-2.5 rounded-full border border-border transition ${showFilters ? 'bg-primary text-white' : 'bg-surface text-muted hover:bg-background'}`}
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Expandable Filters */}
                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="pt-3 pb-2 space-y-3">
                                    {/* Type Filter */}
                                    <div className="flex gap-2 justify-center">
                                        {(['ALL', 'LOST', 'FOUND'] as const).map(type => (
                                            <button
                                                key={type}
                                                onClick={() => props.setSelectedType(type)}
                                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${props.selectedType === type ? 'bg-text text-background' : 'bg-surface border border-border text-muted hover:text-text'}`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Category Filter (Horizontal Scroll) */}
                                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                        <button
                                            onClick={() => props.setSelectedCategory('ALL')}
                                            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition ${props.selectedCategory === 'ALL' ? 'bg-primary text-white' : 'bg-surface border border-border text-muted hover:text-text'}`}
                                        >
                                            All
                                        </button>
                                        {Object.entries(CATEGORIES).map(([key, cat]) => (
                                            <button
                                                key={key}
                                                onClick={() => props.setSelectedCategory(key as CategoryId)}
                                                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${props.selectedCategory === key ? 'bg-primary text-white' : 'bg-surface border border-border text-muted hover:text-text'}`}
                                            >
                                                <span>{cat.icon}</span>
                                                <span>{cat.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
