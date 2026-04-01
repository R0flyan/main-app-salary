// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/auth.hook';
import type { UserRole } from '../contexts/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: UserRole;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
    children, 
    requiredRole = 'user' 
}) => {
    const { isAuthenticated, isLoading, hasRole } = useAuth();

    if (isLoading) {
        return <div style={{ color: 'white', textAlign: 'center', padding: '50px' }}>Загрузка...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRole && !hasRole(requiredRole)) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};