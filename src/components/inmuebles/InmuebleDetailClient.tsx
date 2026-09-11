import { useState } from 'react';
import { InmuebleForm } from '@/components/inmuebles/InmuebleForm';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import * as inmueblesService from '@/services/http/inmueblesService';
import type { Inmueble, InmuebleStatus } from '@/types/inmueble';

function formatPrice(priceStr: string): string {
  const price = parseFloat(priceStr);
  if (Number.isNaN(price)) return priceStr;
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(price);
}

function statusClass(status: InmuebleStatus): string {
  if (status === 'Reservado') return 'status-reservado';
  if (status === 'Vendido') return 'status-vendido';
  return 'status-disponible';
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function InmuebleDetailClient({ inmueble: initial }: { inmueble: Inmueble }) {
  const [inmueble, setInmueble] = useState(initial);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const operationLabel = inmueble.operation_type === 'Venta' ? 'Venta' : 'Renta';
  const badgeClass = inmueble.operation_type === 'Venta' ? 'badge-venta' : 'badge-renta';
  const photos = inmueble.photos;
  const safePhotoIndex = photos.length > 0 ? Math.min(activePhotoIndex, photos.length - 1) : 0;

  function showPrevPhoto() {
    setActivePhotoIndex((i) => (i - 1 + photos.length) % photos.length);
  }
  function showNextPhoto() {
    setActivePhotoIndex((i) => (i + 1) % photos.length);
  }

  async function refreshInmueble() {
    try {
      const fresh = await inmueblesService.get(inmueble.id);
      setInmueble(fresh);
    } catch {
      // Keep showing the last known data if the refresh fails.
    }
  }

  async function handleConfirmDelete() {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await inmueblesService.remove(inmueble.id);
      window.location.href = '/admin/inmuebles';
    } catch {
      setIsDeleting(false);
      setConfirmingDelete(false);
      setDeleteError('No se pudo eliminar el inmueble. Intentá de nuevo.');
    }
  }

  return (
    <div>
      <a href="/admin/inmuebles" className="link-underline" style={{ marginBottom: 16, display: 'inline-block' }}>
        ← Volver a inmuebles
      </a>

      <ErrorBanner message={deleteError} />

      <header className="detail-header">
        <div>
          <h1>{inmueble.title}</h1>
          <p className="location">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            {inmueble.location}
          </p>
        </div>
        <div className="detail-actions">
          <button type="button" className="btn-gold-outline" onClick={() => setIsEditing(true)}>
            Editar
          </button>
          <button type="button" className="btn-cancel-pill" onClick={() => setConfirmingDelete(true)} disabled={isDeleting}>
            {isDeleting ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </header>

      <div className="detail-badges">
        <span className={`badge-pill ${badgeClass}`}>{operationLabel}</span>
        <span className={`status-badge ${statusClass(inmueble.status)}`}>{inmueble.status}</span>
        {inmueble.featured && <span className="badge-pill" style={{ background: 'var(--color-gold-deep)' }}>Destacado</span>}
      </div>

      {photos.length > 0 ? (
        <div className="detail-gallery">
          <div className="detail-gallery-main">
            <img src={photos[safePhotoIndex].url ?? ''} alt={inmueble.title} />
            {photos.length > 1 && (
              <>
                <button type="button" className="gallery-nav-btn gallery-nav-prev" onClick={showPrevPhoto} aria-label="Foto anterior">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>
                <button type="button" className="gallery-nav-btn gallery-nav-next" onClick={showNextPhoto} aria-label="Foto siguiente">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
                <span className="gallery-counter">
                  {safePhotoIndex + 1} / {photos.length}
                </span>
              </>
            )}
          </div>
          {photos.length > 1 && (
            <div className="detail-gallery-thumbs">
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  className={`detail-gallery-thumb ${index === safePhotoIndex ? 'is-active' : ''}`}
                  onClick={() => setActivePhotoIndex(index)}
                  aria-label={`Ver foto ${index + 1}`}
                >
                  <img src={photo.url ?? ''} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="detail-gallery">
          <div className="detail-gallery-main" />
        </div>
      )}

      <div className="detail-grid">
        <div>
          <div className="detail-card">
            <h3>Precio</h3>
            <p className="detail-price">{formatPrice(inmueble.price)}</p>
            <p className="stat-label">{inmueble.operation_type}</p>
          </div>

          <div className="detail-card">
            <h3>Características</h3>
            <div className="detail-specs">
              <div className="detail-spec">
                <span className="value">{Math.round(Number(inmueble.square_meters))}</span>
                <span className="label">m²</span>
              </div>
              {inmueble.bedrooms !== null && (
                <div className="detail-spec">
                  <span className="value">{inmueble.bedrooms}</span>
                  <span className="label">Dormitorios</span>
                </div>
              )}
              {inmueble.bathrooms !== null && (
                <div className="detail-spec">
                  <span className="value">{inmueble.bathrooms}</span>
                  <span className="label">Baños</span>
                </div>
              )}
              {inmueble.parking_spots !== null && (
                <div className="detail-spec">
                  <span className="value">{inmueble.parking_spots}</span>
                  <span className="label">Parqueaderos</span>
                </div>
              )}
              {inmueble.floor !== null && (
                <div className="detail-spec">
                  <span className="value">{inmueble.floor}</span>
                  <span className="label">Piso</span>
                </div>
              )}
            </div>
          </div>

          {inmueble.description && (
            <div className="detail-card">
              <h3>Descripción</h3>
              <p className="detail-description">{inmueble.description}</p>
            </div>
          )}

          {inmueble.features.length > 0 && (
            <div className="detail-card">
              <h3>Características del inmueble</h3>
              <div className="chip-list">
                {inmueble.features.map((feature) => (
                  <span key={feature} className="chip-static">
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          )}

          {inmueble.amenities.length > 0 && (
            <div className="detail-card">
              <h3>Áreas comunes</h3>
              <div className="chip-list">
                {inmueble.amenities.map((amenity) => (
                  <span key={amenity} className="chip-static">
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="detail-card">
            <h3>Información</h3>
            <ul className="detail-meta-list">
              <li>
                <span className="meta-label">Tipo</span>
                <span className="meta-value">{inmueble.property_type}</span>
              </li>
              <li>
                <span className="meta-label">Operación</span>
                <span className="meta-value">{inmueble.operation_type}</span>
              </li>
              <li>
                <span className="meta-label">Estado</span>
                <span className="meta-value">{inmueble.status}</span>
              </li>
              <li>
                <span className="meta-label">Destacado</span>
                <span className="meta-value">{inmueble.featured ? 'Sí' : 'No'}</span>
              </li>
              <li>
                <span className="meta-label">Publicado</span>
                <span className="meta-value">{formatDate(inmueble.created_at)}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {isEditing && (
        <Modal title={`Editar: ${inmueble.title}`} onClose={() => setIsEditing(false)}>
          <InmuebleForm
            inmueble={inmueble}
            onCreated={() => setIsEditing(false)}
            onUpdated={(updated) => {
              setInmueble(updated);
              setIsEditing(false);
            }}
            onCancel={() => {
              setIsEditing(false);
              refreshInmueble();
            }}
          />
        </Modal>
      )}

      {confirmingDelete && (
        <ConfirmDialog
          title="Eliminar inmueble"
          message={`¿Estás seguro de que deseas eliminar "${inmueble.title}"? Esta acción no se puede deshacer.`}
          isBusy={isDeleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}
