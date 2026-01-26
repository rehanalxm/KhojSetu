import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, ArrowRight, Loader2, CheckCircle2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { AuthService } from '../services/AuthService';

interface ForgotPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginClick: () => void;
    initialStep?: 1 | 2 | 3;
}

export default function ForgotPasswordModal({ isOpen, onClose, onLoginClick, initialStep = 1 }: ForgotPasswordModalProps) {
    const [step, setStep] = useState<1 | 2 | 3>(initialStep); // 1: Email, 2: OTP/Link Sent, 3: New Password
    const [email, setEmail] = useState('');
    // const [otp, setOtp] = useState(''); // Removed unused state to fix build error
    const [newPassword, setNewPassword] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Sync step with initialStep when it changes (e.g. when recovery event triggers)
    useEffect(() => {
        setStep(initialStep);
    }, [initialStep]);

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await AuthService.forgotPassword(email);
            setStep(2);
            setSuccessMessage(`Reset link sent to ${email}`);
        } catch (err: any) {
            setError(err.message || 'Failed to send reset link');
        } finally {
            setIsLoading(false);
        }
    };

    // OTP Verification removed as we use Magic Link now

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await AuthService.resetPassword(newPassword);
            setSuccessMessage('Password reset successfully! Logging you in...');
            setTimeout(() => {
                onClose();
                onLoginClick();
                // Reset state
                setStep(1);
                setEmail('');
                setNewPassword('');
                setSuccessMessage('');
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Failed to reset password');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                />

                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="relative w-full max-w-md bg-[#0f0f12] border border-white/10 rounded-3xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden z-20"
                >
                    {/* Header */}
                    <div className="px-8 pt-8 pb-4 flex justify-between items-start">
                        <div>
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500/20 to-red-500/20 flex items-center justify-center mb-4 border border-white/5">
                                <KeyRound className="w-6 h-6 text-orange-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">Recover Account</h2>
                            <p className="text-gray-400 text-sm mt-1">
                                {step === 1 && "Don't worry, we'll help you get back in."}
                                {step === 2 && "Check your inbox."}
                                {step === 3 && "Secure your account."}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition text-gray-500 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="px-8 pb-8">
                        {/* Progress Indicators */}
                        <div className="flex gap-2 mb-8 items-center">
                            {[1, 2, 3].map((s) => (
                                <div
                                    key={s}
                                    className={`h-1 rounded-full transition-all duration-500 ${s <= step ? 'bg-orange-500 flex-1' : 'bg-white/10 w-4'}`}
                                />
                            ))}
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium text-center"
                            >
                                {error}
                            </motion.div>
                        )}

                        {successMessage && !error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-6 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-xs font-medium text-center flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                {successMessage}
                            </motion.div>
                        )}

                        {/* Step 1: Email */}
                        {step === 1 && (
                            <form onSubmit={handleSendOtp} className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-400 ml-1">REGISTERED EMAIL</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-orange-500 transition" />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 focus:bg-white/10 transition-all font-medium"
                                            placeholder="john@example.com"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                        <>Send Reset Link <ArrowRight className="w-4 h-4" /></>
                                    )}
                                </button>
                            </form>
                        )}

                        {/* Step 2: Confirmation */}
                        {step === 2 && (
                            <div className="text-center space-y-6">
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 inline-block">
                                    <Mail className="w-8 h-8 text-orange-400 mx-auto" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-gray-300">
                                        We sent a magic link to <br />
                                        <span className="text-orange-400 font-semibold">{email}</span>
                                    </p>
                                    <p className="text-xs text-gray-500 max-w-xs mx-auto">
                                        Click the link in the email to automatically redirect to the new password screen.
                                    </p>
                                </div>

                                <div className="pt-4 border-t border-white/10">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="text-xs text-gray-400 hover:text-white transition"
                                    >
                                        Wrong email? Try again
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: New Password */}
                        {step === 3 && (
                            <form onSubmit={handleResetPassword} className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-400 ml-1">NEW PASSWORD</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-orange-500 transition" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            minLength={6}
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-11 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 focus:bg-white/10 transition-all font-medium"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="w-4 h-4" />
                                            ) : (
                                                <Eye className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                        <>Update Password <CheckCircle2 className="w-4 h-4" /></>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
