import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Trash2, UploadCloud } from 'lucide-react';
import { apiErrorMessage } from '../../api/client';
import { documentsApi } from '../../api/documentsApi';

const statusLabels = {
  PENDING: 'En attente',
  PROCESSING: 'En traitement',
  READY: 'Prêt',
  FAILED: 'Échec',
} as const;

export function CourseDocuments({ courseId }: { courseId: number }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['course-documents', courseId],
    queryFn: () => documentsApi.list(courseId),
    refetchInterval: query => query.state.data?.some(
      document => document.status === 'PENDING' || document.status === 'PROCESSING',
    ) ? 2000 : false,
  });
  const upload = useMutation({
    mutationFn: (file: File) => documentsApi.upload(courseId, file, setProgress),
    onSuccess: async () => {
      setErrorMessage('');
      await queryClient.invalidateQueries({ queryKey: ['course-documents', courseId] });
    },
    onError: error => setErrorMessage(apiErrorMessage(error, 'Le téléversement a échoué.')),
    onSettled: () => setProgress(null),
  });
  const remove = useMutation({
    mutationFn: documentsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['course-documents', courseId] }),
    onError: error => setErrorMessage(apiErrorMessage(error, 'Impossible de supprimer ce document.')),
  });

  const selectFile = (file?: File) => {
    if (!file) return;
    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Sélectionnez un fichier PDF valide.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setErrorMessage('Le PDF ne doit pas dépasser 20 Mo.');
      return;
    }
    setErrorMessage('');
    upload.mutate(file);
  };

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Documents du cours</h2>
        <p className="mt-1 text-xs text-slate-500">Les PDF indexés alimentent l’assistant et la génération de quiz.</p>
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={event => event.preventDefault()}
        onDrop={event => {
          event.preventDefault();
          selectFile(event.dataTransfer.files[0]);
        }}
        disabled={upload.isPending}
        className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 px-4 py-6 text-center text-xs text-indigo-700 hover:bg-indigo-50 disabled:opacity-60 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-300"
      >
        <UploadCloud className="h-5 w-5" />
        {upload.isPending ? `Téléversement… ${progress ?? 0}%` : 'Déposez un PDF ici ou cliquez pour le choisir (20 Mo max)'}
        {progress !== null && (
          <span className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-indigo-100">
            <span className="block h-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={event => {
          selectFile(event.target.files?.[0]);
          event.currentTarget.value = '';
        }}
      />
      {(errorMessage || error) && (
        <p role="alert" className="text-xs text-red-600">{errorMessage || apiErrorMessage(error)}</p>
      )}
      {isLoading ? (
        <p className="text-xs text-slate-500">Chargement des documents…</p>
      ) : data.length === 0 ? (
        <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500 dark:bg-slate-800">Aucun document ajouté.</p>
      ) : (
        <ul className="space-y-2">
          {data.map(document => (
            <li key={document.id} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-100">{document.title}</p>
                <p className={`mt-1 text-[10px] ${document.status === 'FAILED' ? 'text-red-600' : document.status === 'READY' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {statusLabels[document.status]}{document.pageCount ? ` · ${document.pageCount} page(s)` : ''}
                </p>
                {document.errorMessage && <p className="mt-1 text-[10px] text-red-600">{document.errorMessage}</p>}
              </div>
              <button
                type="button"
                aria-label={`Supprimer ${document.title}`}
                disabled={remove.isPending}
                onClick={() => remove.mutate(document.id)}
                className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
