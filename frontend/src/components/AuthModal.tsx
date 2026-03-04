import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Loader2, Eye, EyeOff, Sparkles } from 'lucide-react';
import { AuthService } from '../services/AuthService';
import { USE_MOCK } from '../lib/supabase';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onForgotPassword?: () => void;
}

export default function AuthModal({ isOpen, onClose, onForgotPassword }: AuthModalProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
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
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Login request timed out. Please try again.")), 8000)
            );

            if (isLogin) {
                await Promise.race([AuthService.login(email, password), timeoutPromise]);
            } else {
                await Promise.race([AuthService.signup(name, email, password, gender), timeoutPromise]);
                if (!USE_MOCK) {
                    setSuccess('Success! Please check your email to verify your account.');
                    setLoading(false);
                    return;
                }
            }

            // Wait a tiny bit for App.tsx's onAuthStateChange to fire and update the global state
            await new Promise(resolve => setTimeout(resolve, 500));
            onClose();
        } catch (err) {
            console.error('AuthModal error block:', err);
            setError(err instanceof Error ? err.message : 'Authentication failed');
        } finally {
            console.log('AuthModal: Clearing loading state.');
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
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                onClick={onClose}
            />

            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-md bg-[#0f0f12] border border-white/10 rounded-3xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden z-10"
            >
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-secondary/20 blur-[100px] rounded-full pointer-events-none" />

                {/* Header */}
                <div className="p-8 text-center relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 transition group"
                    >
                        <X className="w-5 h-5 text-gray-500 group-hover:text-white" />
                    </button>

                    <motion.div
                        key={isLogin ? 'login-icon' : 'signup-icon'}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-6 border border-white/5 shadow-inner"
                    >
                        <Sparkles className="w-8 h-8 text-primary" />
                    </motion.div>

                    <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
                        {isLogin ? 'Welcome Back' : 'Get Started'}
                    </h2>
                    <p className="text-gray-400 text-sm">
                        {isLogin ? 'Enter your details to access your account' : 'Join the community and verify lost items'}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-5">
                    {/* Error Message */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium text-center">
                                    {error}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Success Message */}
                    <AnimatePresence>
                        {success && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium text-center">
                                    {success}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Name Field (Signup Only) */}
                    <AnimatePresence>
                        {!isLogin && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden space-y-4"
                            >
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-400 ml-1">FULL NAME</label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition" />
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="John Doe"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all font-medium"
                                            required={!isLogin}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-400 ml-1">I AM</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['male', 'female'].map((g) => (
                                            <button
                                                key={g}
                                                type="button"
                                                onClick={() => setGender(g as 'male' | 'female')}
                                                className={`py-3 rounded-xl border flex items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden ${gender === g
                                                    ? 'bg-primary/20 border-primary text-primary shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                                                    : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'
                                                    }`}
                                            >
                                                <span className="text-lg relative z-10">{g === 'male' ? '👦' : '👧'}</span>
                                                <span className="text-xs font-bold tracking-wider uppercase relative z-10">{g}</span>
                                                {gender === g && (
                                                    <motion.div
                                                        layoutId="gender-active"
                                                        className="absolute inset-0 bg-primary/10"
                                                        initial={false}
                                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                    />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Email Field */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-400 ml-1">EMAIL</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all font-medium"
                                required
                            />
                        </div>
                    </div>

                    {/* Password Field */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-xs font-semibold text-gray-400">PASSWORD</label>
                            {isLogin && onForgotPassword && (
                                <button
                                    type="button"
                                    onClick={onForgotPassword}
                                    className="text-xs text-primary hover:text-white transition"
                                >
                                    Forgot Password?
                                </button>
                            )}
                        </div>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-11 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all font-medium"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Sign In' : 'Create Account')}
                    </button>
                </form>

                {/* Footer Switcher */}
                <div className="p-6 bg-white/5 border-t border-white/5 text-center">
                    <p className="text-sm text-gray-400">
                        {isLogin ? "New to KhojSetu? " : "Already have an account? "}
                        <button
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                            }}
                            className="text-white font-semibold hover:underline decoration-primary decoration-2 underline-offset-4 transition"
                        >
                            {isLogin ? 'Create Account' : 'Sign In'}
                        </button>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
