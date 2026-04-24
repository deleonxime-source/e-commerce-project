import { useHardcodedAdmin } from '../context/HardcodedAdminContext.jsx';

export function useIsAdmin() {
  const s = useHardcodedAdmin();
  return s.status === 'resolved' && s.isAdmin;
}
