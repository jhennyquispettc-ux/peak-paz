import { useState } from 'react';
import type { Page } from '../api/types';
import { useResource } from './useResource';

export function useCaseList<T, F extends string>(
  loader: (filter: F, page: number) => Promise<Page<T>>,
  initialFilter: F,
) {
  const [filter, setFilterState] = useState<F>(initialFilter);
  const [page, setPage] = useState(1);
  const list = useResource(() => loader(filter, page), [filter, page]);
  const setFilter = (next: F) => {
    setFilterState(next);
    setPage(1);
  };
  return { filter, setFilter, page, setPage, list };
}
