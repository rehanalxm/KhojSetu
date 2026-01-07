import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, X, CheckCircle2 } from 'lucide-react';

export type DialogType = 'confirm' | 'alert' | 'success' | 'danger';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    type?: DialogType;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmDialog({
    isOpen,
    title,
    message,
    type = 'confirm',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'danger':
            case 'confirm': return <AlertTriangle className="w-6 h-6 text-red-400" />;
            case 'success': return <CheckCircle2 className="w-6 h-6 text-green-400" />;
            default: return <Info className="w-6 h-6 text-blue-400" />;
        }
    };

    const getIconBg = () => {
        switch (type) {
            case 'danger':
            case 'confirm': return 'bg-red-500/20';
            case 'success': return 'bg-green-500/20';
            default: return 'bg-blue-500/20';
        }
    };

    const getConfirmBtnClass = () => {
        switch (type) {
            case 'danger':
            case 'confirm': return 'bg-red-500 hover:bg-red-600 shadow-red-500/30';
            case 'success': return 'bg-green-500 hover:bg-green-600 shadow-green-500/30';
            default: return 'bg-primary hover:bg-primary/90 shadow-primary/30';
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-surface/95 backdrop-blur-xl border border-border rounded-3xl p-8 max-w-sm w-full shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] relative z-10"
                    >
                        <button
                            onClick={onCancel}
                            className="absolute top-6 right-6 text-muted hover:text-text transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex flex-col items-center text-center mb-8">
                            <div className={`w-16 h-16 rounded-2xl ${getIconBg()} flex items-center justify-center mb-6`}>
                                {getIcon()}
                            </div>
                            <h3 className="text-2xl font-bold text-text mb-3 leading-tight">{title}</h3>
                            <p className="text-muted text-base leading-relaxed">
                                {message}
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            {type === 'confirm' || type === 'danger' ? (
                                <>
                                    <button
                                        onClick={onCancel}
                                        className="flex-1 order-2 sm:order-1 px-6 py-3.5 rounded-2xl text-sm font-bold text-text bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all active:scale-95"
                                    >
                                        {cancelText}
                                    </button>
                                    <button
                                        onClick={onConfirm}
                                        className={`flex-1 order-1 sm:order-2 px-6 py-3.5 rounded-2xl text-sm font-bold text-white shadow-lg transition-all active:scale-95 ${getConfirmBtnClass()}`}
                                    >
                                        {confirmText}
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={onConfirm}
                                    className={`w-full px-6 py-3.5 rounded-2xl text-sm font-bold text-white shadow-lg transition-all active:scale-95 ${getConfirmBtnClass()}`}
                                >
                                    Okay
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

