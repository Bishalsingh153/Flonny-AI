import { useAuth } from './useAuth';

export const useApi = () => {
  const { authFetch } = useAuth();
  return { authFetch };
};
