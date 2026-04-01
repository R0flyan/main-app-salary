// src/types/Auth.ts
export type UserRole = 'guest' | 'user' | 'admin';

export interface UserProfile {
    id: number;
    email: string;
    role: UserRole;  // Добавляем поле role
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

// Компонент для проверки прав
export const hasPermission = (user: UserProfile | null, requiredRole: UserRole): boolean => {
    if (!user) return requiredRole === 'guest';
    
    const roleHierarchy: Record<UserRole, number> = {
        'guest': 0,
        'user': 1,
        'admin': 2
    };
    
    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
};