import { useState } from 'react';
import { useInmuebles } from '@/hooks/useInmuebles';
import { InmueblesList } from '@/components/inmuebles/InmueblesList';
import { InmuebleForm } from '@/components/inmuebles/InmuebleForm';
import { Modal } from '@/components/ui/Modal';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import * as inmueblesService from '@/services/http/inmueblesService';
import { ClientApiError } from '@/services/http/httpClient';
import type { Inmueble } from '@/types/inmueble';
import type { PaginatedResponse } from '@/types/api';

type ModalState = { mode: 'create' } | { mode: 'edit'; inmueble: Inmueble } | null;

export function InmueblesPageClient({ initialData }: { initialData?: PaginatedResponse<Inmueble> | null }) {
  const list = useInmuebles({ page: 1, page_size: 20 }, initialData ?? null);
  const [modal, setModal] = useState<ModalState>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function openEdit(id: number) {
    setLoadError(null);
    try {
      const inmueble = await inmueblesService.get(id);
      setModal({ mode: 'edit', inmueble });
    } catch (error) {
      setLoadError(error instanceof ClientApiError ? (error.detail ?? 'No se pudo cargar el inmueble.') : 'No se pudo conectar con el servidor.');
    }
  }

  return (
    <>
      <header className="page-header">
        <span className="subtitle">GESTIÓN</span>
        <div className="title-row">
          <h1>Inmuebles</h1>
          <button type="button" className="btn-primary" onClick={() => setModal({ mode: 'create' })}>
            + Nuevo
          </button>
        </div>
      </header>

      <ErrorBanner message={loadError} />

      <InmueblesList
        data={list.data}
        isLoading={list.isLoading}
        error={list.error}
        params={list.params}
        setParams={list.setParams}
        reload={list.reload}
        onEdit={openEdit}
      />

      {modal && (
        <Modal
          title={modal.mode === 'create' ? 'Nuevo inmueble' : `Editar: ${modal.inmueble.title}`}
          onClose={() => {
            setModal(null);
            list.reload();
          }}
        >
          <InmuebleForm
            inmueble={modal.mode === 'edit' ? modal.inmueble : undefined}
            onCreated={() => {
              setModal(null);
              list.reload();
            }}
            onUpdated={() => {
              setModal(null);
              list.reload();
            }}
            onCancel={() => {
              setModal(null);
              list.reload();
            }}
          />
        </Modal>
      )}
    </>
  );
}
