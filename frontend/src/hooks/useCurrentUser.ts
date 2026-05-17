import { useQuery } from '@tanstack/react-query';
import { getMe } from '../api';
import type { UserRead } from '../types';

export function useCurrentUser(): UserRead | undefined {
  const { data } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  return data;
}
