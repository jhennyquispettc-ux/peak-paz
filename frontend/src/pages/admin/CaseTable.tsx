import type { Page } from '../../api/types';
import type { Resource } from '../../hooks/useResource';
import DataTable, { type Column } from '../../ui/DataTable';
import EmptyState from '../../ui/EmptyState';
import ErrorState from '../../ui/ErrorState';
import LoadingState from '../../ui/LoadingState';
import Pagination from '../../ui/Pagination';

export default function CaseTable<T extends { id: string }>({
  caption,
  columns,
  list,
  page,
  onPage,
  onOpen,
  emptyTitle,
}: {
  caption: string;
  columns: Column<T>[];
  list: Resource<Page<T>>;
  page: number;
  onPage: (page: number) => void;
  onOpen?: (row: T) => void;
  emptyTitle: string;
}) {
  if (list.error) {
    return (
      <ErrorState message={list.error} onRetry={() => void list.reload()} />
    );
  }
  if (!list.data) return <LoadingState />;
  if (list.data.data.length === 0) {
    return (
      <div className="card">
        <EmptyState title={emptyTitle} />
      </div>
    );
  }
  return (
    <>
      <DataTable
        caption={caption}
        columns={columns}
        rows={list.data.data}
        rowKey={(row) => row.id}
        onRowClick={onOpen}
      />
      <Pagination
        page={page}
        totalPages={list.data.meta.totalPages}
        onChange={onPage}
      />
    </>
  );
}
