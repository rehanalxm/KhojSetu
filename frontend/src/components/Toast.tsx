import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, X } from 'lucide-react';
import { useEffect } from 'react';

export type ToastType = 'success' | 'error';

interface ToastProps {
    message: string;
    type: ToastType;
    isVisible: boolean;
    onClose: () => void;
}

export default function Toast({ message, type, isVisible, onClose }: ToastProps) {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(onClose, 3000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[120] w-full max-w-sm px-4">
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className={`
                            flex items-center gap-3 p-4 rounded-xl shadow-2xl backdrop-blur-xl border
                            ${type === 'success'
                                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                : 'bg-red-500/10 border-red-500/20 text-red-400'
                            }
                        `}
                    >
                        <div className={`p-1.5 rounded-full ${type === 'success' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                            {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        </div>
                        <p className="text-sm font-semibold flex-1">{message}</p>
                        <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-full transition">
                            <X className="w-4 h-4 opacity-70" />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
