export interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    joinedAt: Date;
}

export type AuthState = {
    user: User | null;
    isAuthenticated: boolean;
};
