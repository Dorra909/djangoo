import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsUpDown, Search } from 'lucide-react';
import { Skeleton } from './Skeleton';

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  actions?: (row: T) => React.ReactNode;
  pageSize?: number;
}

export function DataTable<T extends Record<string, unknown>>({
  data, columns, loading, searchPlaceholder = 'Rechercher...', searchKeys = [], actions, pageSize = 10,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const filtered = data.filter(row =>
    searchKeys.length === 0 || searchKeys.some(k => String(row[k] ?? '').toLowerCase().includes(search.toLowerCase()))
  );

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey];
        const cmp = String(av).localeCompare(String(bv));
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : filtered;

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              {columns.map(col => (
                <th key={col.key} className="px-4 py-3 text-left">
                  <button
                    onClick={() => col.sortable && handleSort(col.key)}
                    className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 ${col.sortable ? 'hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer' : 'cursor-default'}`}
                  >
                    {col.label}
                    {col.sortable && <ChevronsUpDown className="w-3 h-3" />}
                  </button>
                </th>
              ))}
              {actions && <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paged.length === 0 ? (
              <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-10 text-center text-sm text-slate-400">Aucun résultat trouvé</td></tr>
            ) : paged.map((row, i) => (
              <tr key={i} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300">
                    {col.render ? col.render(row) : String(row[col.key] ?? '')}
                  </td>
                ))}
                {actions && <td className="px-4 py-3 text-right">{actions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500">{filtered.length} résultats</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-600 dark:text-slate-400">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
