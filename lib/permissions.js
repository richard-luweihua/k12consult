import { useAuth } from './auth-context';

export function useUserProfile() {
  const { user, loading } = useAuth();

  return {
    profile: user,
    loading
  };
}

export function usePermissions() {
  const { profile, loading } = useUserProfile();

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const isConsultant = profile?.role === 'consultant';
  const isUser = profile?.role === 'user' || profile?.role === 'parent_user';

  return {
    profile,
    loading,
    isAdmin,
    isConsultant,
    isUser,
    canViewAllLeads: isAdmin,
    canViewAssignedLeads: isConsultant || isAdmin,
    canViewOwnLeads: isUser || isConsultant || isAdmin,
    canManageUsers: isAdmin,
    canAssignLeads: isAdmin
  };
}
