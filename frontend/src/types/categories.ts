// Category definitions with icons and colors
export const CATEGORIES = {
    ELECTRONICS: {
        id: 'electronics',
        label: 'Electronics',
        icon: '📱',
        color: 'blue',
        examples: ['Phone', 'Laptop', 'Tablet', 'Earbuds', 'Camera']
    },
    KEYS_CARDS: {
        id: 'keys_cards',
        label: 'Keys & Cards',
        icon: '🔑',
        color: 'yellow',
        examples: ['Keys', 'ID Card', 'Credit Card', 'Driver License']
    },
    BAGS_WALLETS: {
        id: 'bags_wallets',
        label: 'Bags & Wallets',
        icon: '💼',
        color: 'purple',
        examples: ['Backpack', 'Purse', 'Wallet', 'Handbag']
    },
    PETS: {
        id: 'pets',
        label: 'Pets',
        icon: '🐾',
        color: 'orange',
        examples: ['Dog', 'Cat', 'Bird', 'Other Pet']
    },
    CLOTHING: {
        id: 'clothing',
        label: 'Clothing & Accessories',
        icon: '👕',
        color: 'pink',
        examples: ['Jacket', 'Glasses', 'Watch', 'Hat', 'Shoes']
    },
    PERSONAL: {
        id: 'personal',
        label: 'Personal Items',
        icon: '📚',
        color: 'green',
        examples: ['Books', 'Documents', 'Jewelry', 'Umbrella']
    },
    SPORTS: {
        id: 'sports',
        label: 'Sports & Gear',
        icon: '⚽',
        color: 'red',
        examples: ['Ball', 'Racket', 'Bicycle', 'Equipment']
    },
    OTHER: {
        id: 'other',
        label: 'Other',
        icon: '🎒',
        color: 'gray',
        examples: ['Miscellaneous items']
    }
} as const;

export type CategoryId = keyof typeof CATEGORIES;

export interface Post {
    id: number;
    title: string;
    description: string;
    type: 'LOST' | 'FOUND';
    category: CategoryId;
    imageUrl?: string;
    location: {
        lat: number;
        lng: number;
        name: string;
    };
    timestamp: Date;
    contactInfo?: string;
    userId: string;
    createdByName?: string;
}

export function getCategoryColor(categoryId: CategoryId): string {
    const colors: Record<string, string> = {
        blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        pink: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
        green: 'bg-green-500/20 text-green-400 border-green-500/30',
        red: 'bg-red-500/20 text-red-400 border-red-500/30',
        gray: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    const category = CATEGORIES[categoryId];
    return colors[category.color] || colors.gray;
}

export function getTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
        }
    }

    return 'Just now';
}
