import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Loader2, Eye, EyeOff } from 'lucide-react';
import { AuthService } from '../services/AuthService';
import type { User as UserType } from '../types/auth';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLogin: (user: UserType) => void;
    onForgotPassword?: () => void;
}

export default function AuthModal({ isOpen, onClose, onLogin, onForgotPassword }: AuthModalProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Form States
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [gender, setGender] = useState<'male' | 'female'>('male');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            let user;
            if (isLogin) {
                user = await AuthService.login(email, password);
            } else {
                user = await AuthService.signup(name, email, password, gender);
            }
            onLogin(user);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-surface/95 backdrop-blur-xl border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative z-10"
            >
                {/* Header */}
                <div className="p-6 text-center border-b border-white/10">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        {isLogin ? 'Welcome Back' : 'Join KhojSetu'}
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">
                        {isLogin ? 'Login to manage your posts' : 'Create an account to verify items'}
                    </p>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/10 transition"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Error Message */}
                    {error && (
                        <div className="flex flex-col gap-1 items-center bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-2 rounded-lg text-sm text-center">
                            <span>{error}</span>
                            {error.toLowerCase().includes('password') && (
                                <button
                                    type="button"
                                    onClick={onForgotPassword}
                                    className="text-xs text-primary hover:text-white underline mt-1"
                                >
                                    Forgot Password?
                                </button>
                            )}
                        </div>
                    )}

                    {/* Name Field (Signup Only) */}
                    <AnimatePresence>
                        {!isLogin && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden space-y-4"
                            >
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-400">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Required for verification"
                                            className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                                            required={!isLogin}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-400">Gender (For Avatar Selection)</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setGender('male')}
                                            className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all duration-300 ${gender === 'male'
                                                ? 'bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                                }`}
                                        >
                                            <span className="text-xl">👦</span>
                                            <span className="text-sm font-bold tracking-wide">MALE</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setGender('female')}
                                            className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all duration-300 ${gender === 'female'
                                                ? 'bg-pink-500/20 border-pink-500 text-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.3)]'
                                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                                }`}
                                        >
                                            <span className="text-xl">👧</span>
                                            <span className="text-sm font-bold tracking-wide">FEMALE</span>
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Email Field with Strict Validation */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-400">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$"
                                title="Please enter a valid email address (e.g., user@domain.com)"
                                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 invalid:border-red-500/50"
                                required
                            />
                        </div>
                    </div>

                    {/* Password Field with Eye Icon */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-400">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                            >
                                {showPassword ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Forgot Password Link */}
                    {isLogin && onForgotPassword && (
                        <div className="flex justify-end -mt-1">
                            <button
                                type="button"
                                onClick={onForgotPassword}
                                className="text-xs text-gray-400 hover:text-primary transition-colors"
                            >
                                Forgot Password?
                            </button>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isLogin ? 'Sign In' : 'Create Account'}
                    </button>
                </form>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-white/5 text-center">
                    <p className="text-sm text-gray-400">
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-primary hover:text-white font-medium transition"
                        >
                            {isLogin ? 'Sign up' : 'Log in'}
                        </button>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
