import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, KeyRound, Lock, ArrowRight, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { AuthService } from '../services/AuthService';

interface ForgotPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginClick: () => void;
}

export default function ForgotPasswordModal({ isOpen, onClose, onLoginClick }: ForgotPasswordModalProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Email, 2: OTP, 3: New Password
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await AuthService.forgotPassword(email);
            setStep(2);
            setSuccessMessage(`OTP sent to ${email}`);
        } catch (err: any) {
            setError(err.message || 'Failed to send OTP');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await AuthService.verifyOtp(email, otp);
            setStep(3);
            setSuccessMessage('OTP verified! Set your new password.');
        } catch (err: any) {
            setError(err.message || 'Invalid OTP');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await AuthService.resetPassword(email, otp, newPassword);
            setSuccessMessage('Password reset successfully! Logging you in...');
            setTimeout(() => {
                onClose();
                onLoginClick();
                // Reset state
                setStep(1);
                setEmail('');
                setOtp('');
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
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="relative bg-surface border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                        <h2 className="text-xl font-bold text-white">Reset Password</h2>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>

                    <div className="p-6">
                        {/* Progress Indicators */}
                        <div className="flex justify-center mb-8 gap-2">
                            {[1, 2, 3].map((s) => (
                                <div
                                    key={s}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${s === step ? 'w-8 bg-primary' :
                                        s < step ? 'w-8 bg-green-500' : 'w-2 bg-white/10'
                                        }`}
                                />
                            ))}
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {successMessage && !error && (
                            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                {successMessage}
                            </div>
                        )}

                        {/* Step 1: Email */}
                        {step === 1 && (
                            <form onSubmit={handleSendOtp} className="space-y-4">
                                <p className="text-gray-400 text-sm mb-4">
                                    Enter your registered email address properly to receive a 6-digit OTP code.
                                </p>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-300">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition"
                                            placeholder="john@example.com"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                        <>Send OTP <ArrowRight className="w-4 h-4" /></>
                                    )}
                                </button>
                            </form>
                        )}

                        {/* Step 2: OTP */}
                        {step === 2 && (
                            <form onSubmit={handleVerifyOtp} className="space-y-4">
                                <p className="text-gray-400 text-sm mb-4">
                                    Enter the 6-digit code sent to <span className="text-primary font-medium">{email}</span>
                                </p>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-300">OTP Code</label>
                                    <div className="relative">
                                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            required
                                            maxLength={6}
                                            value={otp}
                                            onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition tracking-widest text-lg font-mono"
                                            placeholder="000000"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                        <>Verify Code <ArrowRight className="w-4 h-4" /></>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="w-full text-sm text-gray-400 hover:text-white mt-4"
                                >
                                    Change Email
                                </button>
                            </form>
                        )}

                        {/* Step 3: New Password */}
                        {step === 3 && (
                            <form onSubmit={handleResetPassword} className="space-y-4">
                                <p className="text-gray-400 text-sm mb-4">
                                    Choose a strong password for your account.
                                </p>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-300">New Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            minLength={6}
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition"
                                            placeholder="••••••••"
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
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                        <>Reset Password <CheckCircle2 className="w-4 h-4" /></>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-white/5 border-t border-white/10 text-center">
                        <button
                            onClick={() => { onClose(); onLoginClick(); }}
                            className="text-sm text-gray-400 hover:text-white transition"
                        >
                            Back to Login
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
