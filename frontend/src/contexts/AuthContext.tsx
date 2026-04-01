// src/contexts/AuthContext.tsx
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'user' | 'admin';

export interface UserProfile {
    id: number;
    email: string;
    role: UserRole;
    full_name?: string;
    phone?: string;
    city?: string;
    position?: string;
    experience_years?: number | null;
    skills?: string;
    desired_salary?: number | null;
    work_format?: string;
    employment_type?: string;
    about?: string;
    created_at: string;
}

interface AuthContextType {
    user: UserProfile | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    hasRole: (role: UserRole) => boolean;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    updateUser: (user: UserProfile) => void;
    refreshToken: () => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = "http://localhost:8000";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUserProfile = async (): Promise<UserProfile | null> => {
        try {
            const res = await fetch(`${API_URL}/auth/me`, {
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
            });
            
            if (res.ok) {
                const data = await res.json();
                return data;
            }
            return null;
        } catch (error) {
            console.error("Error fetching user:", error);
            return null;
        }
    };

    // Функция для обновления токена
    const refreshToken = async (): Promise<boolean> => {
        try {
            const res = await fetch(`${API_URL}/auth/refresh`, {
                method: "POST",
                credentials: "include",
            });
            return res.ok;
        } catch {
            return false;
        }
    };

    // Проверка авторизации при загрузке
    const checkAuth = async () => {
        setIsLoading(true);
        try {
            let userData = await fetchUserProfile();
            
            if (!userData) {
                // Если не получили данные, пробуем обновить токен
                const refreshed = await refreshToken();
                if (refreshed) {
                    userData = await fetchUserProfile();
                }
            }
            
            setUser(userData);
        } catch (error) {
            console.error("Auth check error:", error);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    // Логин
    const login = async (email: string, password: string): Promise<boolean> => {
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ 
                    username: email, 
                    password, 
                    grant_type: "password" 
                }),
                credentials: "include",
            });

            if (res.ok) {
                const userData = await fetchUserProfile();
                setUser(userData);
                return true;
            }
            return false;
        } catch (error) {
            console.error("Login error:", error);
            return false;
        }
    };

    // Логаут
    const logout = async () => {
        try {
            await fetch(`${API_URL}/auth/logout`, {
                method: "POST",
                credentials: "include",
            });
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            setUser(null);
        }
    };

    // Проверка роли
    const hasRole = (role: UserRole): boolean => {
        if (!user) return false;
        
        const roleHierarchy: Record<UserRole, number> = {
            'user': 1,
            'admin': 2
        };
        
        return roleHierarchy[user.role] >= roleHierarchy[role];
    };

    return (
        <AuthContext.Provider value={{
            user,
            isLoading,
            isAuthenticated: !!user,
            hasRole,
            login,
            logout,
            updateUser: setUser,
            refreshToken,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};