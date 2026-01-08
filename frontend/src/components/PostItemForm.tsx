import { useState, useEffect } from 'react';
import { X, Upload, MapPin, Loader2, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { CATEGORIES } from '../types/categories';
import type { CategoryId } from '../types/categories';
import { useGeolocation } from '../hooks/useGeolocation';
import { PostService } from '../services/PostService';
import { AuthService } from '../services/AuthService';

interface PostItemFormProps {
    onClose: () => void;
    onShowAlert?: (title: string, message: string, type?: 'confirm' | 'alert' | 'danger') => void;
}

export default function PostItemForm({ onClose, onShowAlert }: PostItemFormProps) {
    const [loading, setLoading] = useState(false);
    const [type, setType] = useState<'LOST' | 'FOUND'>('LOST');
    const [category, setCategory] = useState<CategoryId>('OTHER');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [step, setStep] = useState<1 | 2>(1); // Two-step form
    const [locationName, setLocationName] = useState('');
    const { location: userLocation, getCurrentLocation } = useGeolocation();

    useEffect(() => {
        if (userLocation.coordinates && !locationName) {
            setLocationName(`${userLocation.coordinates.lat.toFixed(4)}, ${userLocation.coordinates.lng.toFixed(4)}`);
        }
    }, [userLocation, locationName]);

    const handleUseCurrentLocation = () => {
        getCurrentLocation();
        setLocationName('Fetching location...');
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // Mock Submit
    // Submit Handler
    // Submit Handler
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        try {
            const formData = new FormData(e.currentTarget);
            const title = formData.get('title') as string;
            const description = formData.get('description') as string;
            const country = formData.get('country') as string;
            const state = formData.get('state') as string;
            const city = formData.get('city') as string;
            const landmark = formData.get('landmark') as string;

            // Concatenate location parts
            const locationParts = [landmark, city, state, country].filter(Boolean);
            const locationString = locationParts.join(', ') || locationName || 'Unknown Location';

            const currentUser = AuthService.getCurrentUser();

            if (!currentUser) {
                onShowAlert?.("Login Required", "Please login to post an item.", "alert");
                setLoading(false);
                return;
            }

            await PostService.createPost({
                title: title || 'Lost Item',
                description: description || 'No description provided',
                type,
                category,
                imageUrl: imagePreview!, // Validated by form check
                location: {
                    lat: userLocation.coordinates?.lat || 0,
                    lng: userLocation.coordinates?.lng || 0,
                    name: locationString
                },
                contactInfo: currentUser?.email || 'Anonymous',
                userId: currentUser.id,
                createdByName: currentUser?.name || 'Anonymous'
            });

            // Success
            setLoading(false);
            onClose();
            // Trigger reload to show new post
            window.location.reload();
        } catch (err) {
            console.error(err);
            onShowAlert?.("Post Failed", err instanceof Error ? err.message : 'Unknown error', "danger");
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="bg-surface/95 backdrop-blur-xl border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh]"
        >
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-border flex justify-between items-center bg-surface/95 backdrop-blur-xl z-10">
                <div>
                    <h2 className="text-lg md:text-xl font-bold text-text">
                        {step === 1 ? 'What happened?' : 'Tell us more'}
                    </h2>
                    <p className="text-xs text-muted mt-1">
                        {step === 1 ? 'Let\'s start with the basics' : 'Add details to help others'}
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="Close"
                >
                    <X className="w-5 h-5 text-muted" />
                </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 md:p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                {step === 1 ? (
                    <div className="space-y-5 md:space-y-6">
                        {/* Type Selection */}
                        <div>
                            <label className="block text-sm font-semibold text-text mb-3">Did you lose or find something? *</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setType('LOST')}
                                    className={`p-6 rounded-xl text-center transition-all duration-200 ${type === 'LOST'
                                        ? 'bg-red-500/20 text-red-600 dark:text-red-300 ring-2 ring-red-500/50 shadow-lg shadow-red-500/20'
                                        : 'bg-black/5 dark:bg-white/5 text-muted hover:text-text hover:bg-black/10 dark:hover:bg-white/10 border border-border'
                                        }`}
                                >
                                    <div className="text-4xl mb-2">😢</div>
                                    <div className="font-bold text-lg">I Lost Something</div>
                                    <div className="text-xs mt-1 opacity-70">Looking for my item</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType('FOUND')}
                                    className={`p-6 rounded-xl text-center transition-all duration-200 ${type === 'FOUND'
                                        ? 'bg-green-500/20 text-green-600 dark:text-green-300 ring-2 ring-green-500/50 shadow-lg shadow-green-500/20'
                                        : 'bg-black/5 dark:bg-white/5 text-muted hover:text-text hover:bg-black/10 dark:hover:bg-white/10 border border-border'
                                        }`}
                                >
                                    <div className="text-4xl mb-2">😊</div>
                                    <div className="font-bold text-lg">I Found Something</div>
                                    <div className="text-xs mt-1 opacity-70">Helping someone</div>
                                </button>
                            </div>
                        </div>

                        {/* Category Selection */}
                        <div>
                            <label className="block text-sm font-semibold text-text mb-3">What category? *</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {Object.entries(CATEGORIES).map(([key, cat]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setCategory(key as CategoryId)}
                                        className={`p-4 rounded-xl text-center transition-all ${category === key
                                            ? 'bg-primary/20 text-primary ring-2 ring-primary/50 shadow-lg'
                                            : 'bg-black/5 dark:bg-white/5 text-muted hover:text-text hover:bg-black/10 dark:hover:bg-white/10 border border-border'
                                            }`}
                                    >
                                        <div className="text-3xl mb-1">{cat.icon}</div>
                                        <div className="text-xs font-semibold">{cat.label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Next Button */}
                        <button
                            type="button"
                            onClick={() => setStep(2)}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold hover:opacity-90 transition shadow-lg shadow-primary/30"
                        >
                            Continue →
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Item Name */}
                        <div>
                            <label className="block text-sm font-semibold text-text mb-2">
                                What is it? *
                            </label>
                            <input
                                name="title"
                                type="text"
                                placeholder="e.g. iPhone 13 Pro, Black Backpack, House Keys"
                                className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl px-4 py-3.5 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                                required
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-semibold text-text mb-2">
                                Description *
                            </label>
                            <textarea
                                name="description"
                                placeholder="Include color, brand, distinctive features, where you lost/found it..."
                                className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl px-4 py-3.5 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition h-28 resize-none"
                                required
                            />
                        </div>

                        {/* Location Fields - Split into Country, State, City, Landmark */}
                        <div>
                            <label className="block text-sm font-semibold text-text mb-2">
                                Location Details
                            </label>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <input
                                    name="country"
                                    type="text"
                                    placeholder="Country"
                                    className="bg-black/5 dark:bg-white/5 border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                                />
                                <input
                                    name="state"
                                    type="text"
                                    placeholder="State/Province"
                                    className="bg-black/5 dark:bg-white/5 border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <input
                                    name="city"
                                    type="text"
                                    placeholder="City"
                                    className="bg-black/5 dark:bg-white/5 border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                                />
                                <button
                                    type="button"
                                    onClick={handleUseCurrentLocation}
                                    disabled={userLocation.loaded && !userLocation.coordinates && !userLocation.error}
                                    className="px-4 py-2.5 bg-primary/20 border border-primary/30 rounded-xl text-primary text-sm font-medium hover:bg-primary/30 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {userLocation.loaded && !userLocation.coordinates && !userLocation.error ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <MapPin className="w-4 h-4" />
                                            <span className="hidden sm:inline">Auto-fill</span>
                                        </>
                                    )}
                                </button>
                            </div>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                                <input
                                    name="landmark"
                                    type="text"
                                    placeholder="Landmark or specific location"
                                    defaultValue={locationName}
                                    onChange={(e) => setLocationName(e.target.value)}
                                    className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                                />
                            </div>
                            {userLocation.error && (
                                <p className="text-xs text-red-400 mt-1">
                                    Error: {userLocation.error.message}
                                </p>
                            )}
                        </div>

                        {/* Image Upload */}
                        <div>
                            <label className="block text-sm font-semibold text-text mb-2">
                                Photo (Required) *
                            </label>
                            <div className="relative">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    required={!imagePreview}
                                    id="gallery-input"
                                />
                                {imagePreview ? (
                                    <div className="relative border-2 border-dashed border-primary/50 rounded-xl p-2 bg-black/5 dark:bg-white/5">
                                        <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                                        <button
                                            type="button"
                                            onClick={() => setImagePreview(null)}
                                            className="absolute top-3 right-3 p-1.5 bg-black/60 rounded-full hover:bg-black/80 transition"
                                        >
                                            <X className="w-4 h-4 text-white" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="border-2 border-dashed border-red-500/30 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-primary/50 hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer group bg-red-500/5">
                                        <div className="p-3 bg-black/5 dark:bg-white/5 rounded-full mb-3 group-hover:scale-110 group-hover:bg-primary/20 transition">
                                            <ImageIcon className="w-6 h-6 text-muted group-hover:text-primary transition" />
                                        </div>
                                        <p className="text-sm font-medium text-text">Choose from Gallery</p>
                                        <p className="text-xs text-red-500 dark:text-red-400 mt-1">* Required to post</p>
                                    </div>
                                )}
                            </div>

                            {/* OR Camera Option */}
                            {!imagePreview && (
                                <div className="mt-3">
                                    <div className="relative text-center">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-border"></div>
                                        </div>
                                        <div className="relative flex justify-center text-xs">
                                            <span className="px-2 bg-surface text-muted">OR</span>
                                        </div>
                                    </div>
                                    <label htmlFor="camera-input" className="mt-3 w-full py-2.5 px-4 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-border rounded-xl text-sm text-text hover:text-primary transition flex items-center justify-center gap-2 cursor-pointer">
                                        <Upload className="w-4 h-4" />
                                        Use Camera
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            onChange={handleImageChange}
                                            className="hidden"
                                            id="camera-input"
                                        />
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-2 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="px-6 py-3 rounded-xl border border-border text-sm font-medium text-muted hover:text-text hover:bg-black/5 dark:hover:bg-white/5 transition"
                            >
                                ← Back
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-sm font-bold text-white hover:opacity-90 transition shadow-lg shadow-primary/30 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {loading ? 'Posting...' : `Post ${type === 'LOST' ? 'Lost' : 'Found'} Item`}
                            </button>
                        </div>
                    </div>
                )}
            </form>

            {/* Progress Indicator */}
            <div className="px-6 pb-4 flex gap-2 justify-center">
                <div className={`w-2 h-2 rounded-full transition ${step === 1 ? 'bg-primary w-8' : 'bg-gray-600'}`} />
                <div className={`w-2 h-2 rounded-full transition ${step === 2 ? 'bg-primary w-8' : 'bg-gray-600'}`} />
            </div>
        </motion.div>
    );
}
