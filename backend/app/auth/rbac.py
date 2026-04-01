#/app/auth/rbac.py
from fastapi import Depends, HTTPException, status
from typing import Optional
from app.models.user import User, UserRole
from app.auth.auth import get_current_user

class RBAC:
    @staticmethod
    def require_role(allowed_roles: list[UserRole]):
        def role_checker(current_user: User = Depends(get_current_user)):
            user_role = current_user.role if isinstance(current_user.role, str) else current_user.role.value
            
            allowed_values = [role.value for role in allowed_roles]
            
            if user_role not in allowed_values:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Insufficient permissions. Required roles: {allowed_values}, your role: {user_role}"
                )
            return current_user
        return role_checker
    
    @staticmethod
    def require_admin(current_user: User = Depends(get_current_user)):
        user_role = current_user.role if isinstance(current_user.role, str) else current_user.role.value
        
        if user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Admin access required. Your role: {user_role}"
            )
        return current_user
    
    @staticmethod
    def can_modify_vacancy(vacancy, current_user: User) -> bool:
        user_role = current_user.role if isinstance(current_user.role, str) else current_user.role.value
        return (
            user_role == "admin" or 
            vacancy.owner_id == current_user.id
        )

require_user = RBAC.require_role([UserRole.USER, UserRole.ADMIN])
require_admin = RBAC.require_admin