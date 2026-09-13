import { useEffect, useRef, useState } from 'react';
import * as inmueblesService from '@/services/http/inmueblesService';
import { Spinner } from '@/components/ui/Spinner';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { Inmueble, InmuebleListParams, InmuebleStatus, PropertyType } from '@/types/inmueble';
import type { PaginatedResponse } from '@/types/api';

const PROPERTY_TYPES: PropertyType[] = ['Casa', 'Apartamento', 'Local Comercial', 'Terreno', 'Finca'];
const STATUSES: InmuebleStatus[] = ['Disponible', 'Reservado', 'Vendido'];
const SEARCH_DEBOUNCE_MS = 350;

function formatPrice(priceStr: string): string {
  const price = parseFloat(priceStr);
  if (Number.isNaN(price)) return priceStr;
  if (price >= 1_000_000_000) {
    const val = price / 1_000_000_000;
    return `$${val % 1 !== 0 ? val.toFixed(1) : val} mil mill.`;
  }
  if (price >= 1_000_000) {
    const val = price / 1_000_000;
    return `$${val % 1 !== 0 ? val.toFixed(1) : val} M`;
  }
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(price);
}

function statusClass(status: InmuebleStatus): string {
  if (status === 'Reservado') return 'status-reservado';
  if (status === 'Vendido') return 'status-vendido';
  return 'status-disponible';
}

function InmuebleRow({
  inmueble,
  onChanged,
  onEdit,
}: {
  inmueble: Inmueble;
  onChanged: () => void;
  onEdit: (id: number) => void;
}) {
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const optionsRef = useRef<HTMLDivElement>(null);

  const photoUrl = inmueble.photos[0]?.url;
  const operationLabel = inmueble.operation_type === 'Venta' ? 'Venta' : 'Renta';
  const badgeClass = inmueble.operation_type === 'Venta' ? 'badge-venta' : 'badge-renta';
  const detailUrl = `/admin/inmuebles/${inmueble.id}`;

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  async function handleStatusChange(status: InmuebleStatus) {
    setUpdatingStatus(true);
    setStatusError(null);
    try {
      await inmueblesService.update(inmueble.id, { status });
    } catch {
      setStatusError('No se pudo actualizar el estado.');
    } finally {
      setUpdatingStatus(false);
      onChanged();
    }
  }

  async function handleConfirmDelete() {
    setIsDeleting(true);
    try {
      await inmueblesService.remove(inmueble.id);
      onChanged();
    } finally {
      setIsDeleting(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <article className="inmueble-card">
      <a href={detailUrl} className="image-container" aria-label={`Ver detalle de ${inmueble.title}`}>
        {photoUrl && <img src={photoUrl} alt={inmueble.title} className="thumbnail" />}
        <span className={`operation-badge ${badgeClass}`}>{operationLabel}</span>
      </a>

      <div className="details-container">
        <div className="primary-info">
          <h3 className="title">
            <a href={detailUrl} className="title-link">
              {inmueble.title}
            </a>
          </h3>
          <p className="location">
            <span className="icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </span>
            {inmueble.location}
          </p>
          {statusError && <span className="field-error">{statusError}</span>}
        </div>

        <div className="secondary-info">
          <div className="metrics">
            <p className="price">{formatPrice(inmueble.price)}</p>
            <p className="area">{Math.round(Number(inmueble.square_meters))} m²</p>
          </div>

          <div className="actions">
            <select
              className={`status-select ${statusClass(inmueble.status)}`}
              value={inmueble.status}
              disabled={updatingStatus}
              onChange={(e) => handleStatusChange(e.target.value as InmuebleStatus)}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <div className={`options-container ${menuOpen ? 'is-open' : ''}`} ref={optionsRef}>
              <button
                className="options-btn"
                aria-label="Opciones"
                aria-expanded={menuOpen}
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
              >
                ⋮
              </button>
              {menuOpen && (
                <div className="dropdown-menu">
                  <a className="dropdown-item" href={detailUrl}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    Visualizar
                  </a>
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(inmueble.id);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                    </svg>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="dropdown-item delete-item"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmingDelete(true);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {confirmingDelete && (
        <ConfirmDialog
          title="Eliminar inmueble"
          message={`¿Estás seguro de que deseas eliminar "${inmueble.title}"? Esta acción no se puede deshacer.`}
          isBusy={isDeleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </article>
  );
}

interface InmueblesListProps {
  data: PaginatedResponse<Inmueble> | null;
  isLoading: boolean;
  error: string | null;
  params: InmuebleListParams;
  setParams: (updater: (params: InmuebleListParams) => InmuebleListParams) => void;
  reload: () => void;
  onEdit: (id: number) => void;
}

export function InmueblesList({ data, isLoading, error, params, setParams, reload, onEdit }: InmueblesListProps) {
  const [searchInput, setSearchInput] = useState(params.search ?? '');

  useEffect(() => {
    const handle = setTimeout(() => {
      setParams((p) => {
        const normalized = searchInput || undefined;
        // Bail out (same reference) when nothing actually changed, e.g. on
        // mount, so it doesn't trigger a redundant reload.
        if ((p.search ?? undefined) === normalized) return p;
        return { ...p, search: normalized, page: 1 };
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput, setParams]);

  return (
    <div>
      <div className="filters-row">
        <div className="search-box">
          <span className="search-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
          <input
            type="text"
            placeholder="Buscar inmueble"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="dropdowns">
          <select
            className="filter-select"
            value={params.property_type ?? ''}
            onChange={(e) =>
              setParams((p) => ({ ...p, property_type: (e.target.value || undefined) as PropertyType, page: 1 }))
            }
          >
            <option value="">Todos los tipos</option>
            {PROPERTY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select
            className="filter-select"
            value={params.status ?? ''}
            onChange={(e) =>
              setParams((p) => ({ ...p, status: (e.target.value || undefined) as InmuebleStatus, page: 1 }))
            }
          >
            <option value="">Todos los estados</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {data && <p className="count-text">{data.results.length} de {data.count} mostrados</p>}

      <ErrorBanner message={error} />

      {isLoading && !data && <Spinner label="Cargando inmuebles…" />}

      {data && data.results.length === 0 && <p className="empty-state">No hay inmuebles que coincidan con la búsqueda.</p>}

      {data && data.results.length > 0 && (
        <div className="inmuebles-list">
          {data.results.map((inmueble) => (
            <InmuebleRow key={inmueble.id} inmueble={inmueble} onChanged={reload} onEdit={onEdit} />
          ))}
        </div>
      )}

      {data && data.count > data.page_size && (
        <div className="pagination">
          <button
            type="button"
            className="btn-cancel-pill"
            disabled={(params.page ?? 1) <= 1}
            onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}
          >
            Anterior
          </button>
          <span>
            Página {data.page} de {Math.ceil(data.count / data.page_size)}
          </span>
          <button
            type="button"
            className="btn-cancel-pill"
            disabled={data.page * data.page_size >= data.count}
            onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
