export interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    isAdmin?: boolean;
    joinedAt: Date;
}

export type AuthState = {
    user: User | null;
    isAuthenticated: boolean;
};
