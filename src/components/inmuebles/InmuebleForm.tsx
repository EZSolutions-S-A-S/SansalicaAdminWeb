import { useState, type ChangeEvent, type SyntheticEvent } from 'react';
import * as inmueblesService from '@/services/http/inmueblesService';
import { ClientApiError } from '@/services/http/httpClient';
import { mapFieldErrors } from '@/services/http/errorMapping';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Lightbox } from '@/components/ui/Lightbox';
import type { Inmueble, InmuebleInput, OperationType, PropertyType, InmuebleStatus } from '@/types/inmueble';

const OPERATION_TYPES: OperationType[] = ['Venta', 'Alquiler'];
const PROPERTY_TYPES: PropertyType[] = ['Casa', 'Apartamento', 'Local Comercial', 'Terreno', 'Finca'];
const STATUSES: InmuebleStatus[] = ['Disponible', 'Reservado', 'Vendido'];

const FEATURES_OPTIONS = [
  'Balcón',
  'Cocina Integral',
  'Aire Acondicionado',
  'Amoblado',
  'Terraza',
  'Cuarto de Servicio',
  'Clósets Empotrados',
  'Piso en Madera',
  'Estudio',
  'Ventanas Panorámicas',
];

const AMENITIES_OPTIONS = [
  'Piscina',
  'Salón Social',
  'Vigilancia 24h',
  'Parqueadero Visitantes',
  'Gimnasio',
  'Ascensor',
  'Zona BBQ',
  'Portería',
  'Jardín',
  'Cancha de Tenis',
];

function toInput(inmueble?: Inmueble): InmuebleInput {
  if (!inmueble) {
    return {
      title: '',
      operation_type: 'Venta',
      property_type: 'Apartamento',
      price: 0,
      square_meters: 0,
      location: '',
      description: '',
      features: [],
      amenities: [],
      status: 'Disponible',
      featured: false,
    };
  }
  return {
    title: inmueble.title,
    operation_type: inmueble.operation_type,
    property_type: inmueble.property_type,
    price: Number(inmueble.price),
    square_meters: Number(inmueble.square_meters),
    location: inmueble.location,
    description: inmueble.description,
    floor: inmueble.floor,
    bedrooms: inmueble.bedrooms,
    bathrooms: inmueble.bathrooms,
    parking_spots: inmueble.parking_spots,
    features: inmueble.features,
    amenities: inmueble.amenities,
    status: inmueble.status,
    featured: inmueble.featured,
  };
}

function toggleValue(list: string[] | undefined, value: string): string[] {
  const current = list ?? [];
  return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
}

// Conservative client-side cap: neither Django nor the R2/Render chain in
// front of it advertise an explicit upload limit, so this exists to give a
// clear message instead of the request failing upstream with an opaque
// non-JSON error (large phone photos can otherwise hit that unannounced limit).
const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;

const THOUSANDS_FORMATTER = new Intl.NumberFormat('es-CO');

function formatThousands(digits: string): string {
  if (!digits) return '';
  return THOUSANDS_FORMATTER.format(Number(digits));
}

interface InmuebleFormProps {
  inmueble?: Inmueble;
  onCreated: (created: Inmueble) => void;
  onUpdated: (updated: Inmueble) => void;
  onCancel: () => void;
}

export function InmuebleForm({ inmueble, onCreated, onUpdated, onCancel }: InmuebleFormProps) {
  // Creating a brand-new inmueble is a 2-step sequence (details, then photos);
  // editing an existing one always shows everything on a single screen.
  const isCreateFlow = !inmueble;
  const [step, setStep] = useState<'details' | 'photos'>('details');
  const [createdInmueble, setCreatedInmueble] = useState<Inmueble | null>(null);
  const activeInmueble = inmueble ?? createdInmueble;
  const showDetailsSection = !isCreateFlow || step === 'details';
  const showPhotosSection = !isCreateFlow || step === 'photos';

  const [form, setForm] = useState<InmuebleInput>(toInput(inmueble));
  const [priceDisplay, setPriceDisplay] = useState(() =>
    inmueble ? formatThousands(String(Math.round(Number(inmueble.price)))) : ''
  );
  const [photos, setPhotos] = useState(inmueble?.photos ?? []);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [uploadSummary, setUploadSummary] = useState<string | null>(null);

  function update<K extends keyof InmuebleInput>(key: K, value: InmuebleInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handlePriceChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const cursor = input.selectionStart ?? input.value.length;
    const digitsBeforeCursor = input.value.slice(0, cursor).replace(/\D/g, '').length;
    const digits = input.value.replace(/\D/g, '');
    const formatted = formatThousands(digits);

    update('price', digits ? Number(digits) : 0);
    setPriceDisplay(formatted);

    requestAnimationFrame(() => {
      let count = 0;
      let pos = formatted.length;
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) count++;
        if (count === digitsBeforeCursor) {
          pos = i + 1;
          break;
        }
      }
      if (digitsBeforeCursor === 0) pos = 0;
      input.setSelectionRange(pos, pos);
    });
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFormError(null);
    setFieldErrors({});
    try {
      if (inmueble) {
        const updated = await inmueblesService.update(inmueble.id, form);
        onUpdated(updated);
      } else {
        const created = await inmueblesService.create(form);
        setCreatedInmueble(created);
        setStep('photos');
      }
    } catch (error) {
      if (error instanceof ClientApiError) {
        setFormError(error.detail ?? 'Revisá los campos marcados.');
        setFieldErrors(mapFieldErrors(error.fieldErrors));
      } else {
        setFormError('No se pudo conectar con el servidor.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  function handleFinish() {
    if (createdInmueble) onCreated(createdInmueble);
  }

  function handleSelectPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    const notImages = files.filter((file) => !file.type.startsWith('image/'));
    const tooLarge = files.filter((file) => file.type.startsWith('image/') && file.size > MAX_PHOTO_SIZE_BYTES);
    const images = files.filter((file) => file.type.startsWith('image/') && file.size <= MAX_PHOTO_SIZE_BYTES);

    const messages: string[] = [];
    if (notImages.length > 0) {
      messages.push(`${notImages.length} archivo${notImages.length === 1 ? '' : 's'} descartado${notImages.length === 1 ? '' : 's'} por no ser imagen`);
    }
    if (tooLarge.length > 0) {
      messages.push(`${tooLarge.length} descartado${tooLarge.length === 1 ? '' : 's'} por pesar más de 10 MB`);
    }

    setPhotoFiles(images);
    setUploadSummary(messages.length > 0 ? `Se omitieron archivos: ${messages.join(', ')}.` : null);
  }

  async function handleUploadPhotos() {
    if (!activeInmueble || photoFiles.length === 0) return;
    const total = photoFiles.length;
    let uploaded = 0;
    let failed = 0;
    let nextOrder = photos.length;

    for (const file of photoFiles) {
      setUploadProgress({ current: uploaded + failed + 1, total });
      try {
        const photo = await inmueblesService.uploadPhoto(activeInmueble.id, file, nextOrder);
        setPhotos((prev) => [...prev, photo]);
        nextOrder += 1;
        uploaded += 1;
      } catch {
        failed += 1;
      }
    }

    setUploadProgress(null);
    setPhotoFiles([]);
    setUploadSummary(
      failed > 0
        ? `${uploaded} de ${total} fotos subidas. ${failed} fallaron — intentá de nuevo.`
        : uploaded > 0
          ? `${uploaded} foto${uploaded === 1 ? '' : 's'} subida${uploaded === 1 ? '' : 's'} correctamente.`
          : null
    );
  }

  async function handleDeletePhoto(photoId: number) {
    if (!activeInmueble) return;
    await inmueblesService.deletePhoto(activeInmueble.id, photoId);
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }

  return (
    <form className="form-container" onSubmit={handleSubmit}>
      <ErrorBanner message={formError} />

      {isCreateFlow && (
        <p className="form-step-indicator">
          {step === 'details' ? 'Paso 1 de 2 · Datos del inmueble' : 'Paso 2 de 2 · Fotos'}
        </p>
      )}

      {showDetailsSection && (
        <>
          <div className="form-card">
            <h2 className="section-title">
              <span className="title-decorator"></span>
              Información general
            </h2>

            <div className="form-group full-width" style={{ marginBottom: 24 }}>
              <label htmlFor="title">
                Título <span className="required">*</span>
              </label>
              <input id="title" type="text" value={form.title} onChange={(e) => update('title', e.target.value)} required />
              {fieldErrors.title && <span className="field-error">{fieldErrors.title}</span>}
            </div>

            <div className="form-row four-cols">
              <div className="form-group">
                <label htmlFor="operation_type">
                  Operación <span className="required">*</span>
                </label>
                <select
                  id="operation_type"
                  value={form.operation_type}
                  onChange={(e) => update('operation_type', e.target.value as OperationType)}
                >
                  {OPERATION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="property_type">
                  Tipo <span className="required">*</span>
                </label>
                <select
                  id="property_type"
                  value={form.property_type}
                  onChange={(e) => update('property_type', e.target.value as PropertyType)}
                >
                  {PROPERTY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="price">
                  Precio <span className="required">*</span>
                </label>
                <div className="field-currency-wrap">
                  <span className="field-currency-prefix">$</span>
                  <input
                    id="price"
                    type="text"
                    inputMode="numeric"
                    value={priceDisplay}
                    onChange={handlePriceChange}
                    required
                  />
                </div>
                {fieldErrors.price && <span className="field-error">{fieldErrors.price}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="status">
                  Estado <span className="required">*</span>
                </label>
                <select id="status" value={form.status} onChange={(e) => update('status', e.target.value as InmuebleStatus)}>
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="checkbox-label" style={{ marginTop: 24 }}>
              <input type="checkbox" checked={form.featured ?? false} onChange={(e) => update('featured', e.target.checked)} />
              Destacado en el catálogo
            </label>
          </div>

          <div className="form-card">
            <h2 className="section-title">
              <span className="title-decorator"></span>
              Ubicación
            </h2>
            <div className="form-group full-width">
              <label htmlFor="location">
                Ubicación <span className="required">*</span>
              </label>
              <input
                id="location"
                type="text"
                placeholder="Ej. Bogotá - El Rosales"
                value={form.location}
                onChange={(e) => update('location', e.target.value)}
                required
              />
              {fieldErrors.location && <span className="field-error">{fieldErrors.location}</span>}
            </div>
          </div>

          <div className="form-card">
            <h2 className="section-title">
              <span className="title-decorator"></span>
              Características físicas
            </h2>
            <div className="form-row four-cols">
              <div className="form-group">
                <label htmlFor="square_meters">
                  Superficie m² <span className="required">*</span>
                </label>
                <input
                  id="square_meters"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.square_meters === 0 ? '' : form.square_meters}
                  onChange={(e) => update('square_meters', e.target.value === '' ? 0 : Number(e.target.value))}
                  required
                />
                {fieldErrors.square_meters && <span className="field-error">{fieldErrors.square_meters}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="bedrooms">Dormitorios</label>
                <input
                  id="bedrooms"
                  type="number"
                  min="0"
                  value={form.bedrooms ?? ''}
                  onChange={(e) => update('bedrooms', e.target.value === '' ? null : Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="bathrooms">Baños</label>
                <input
                  id="bathrooms"
                  type="number"
                  min="0"
                  value={form.bathrooms ?? ''}
                  onChange={(e) => update('bathrooms', e.target.value === '' ? null : Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="parking_spots">Parqueaderos</label>
                <input
                  id="parking_spots"
                  type="number"
                  min="0"
                  value={form.parking_spots ?? ''}
                  onChange={(e) => update('parking_spots', e.target.value === '' ? null : Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="form-card">
            <h2 className="section-title">
              <span className="title-decorator"></span>
              Descripción
            </h2>
            <div className="form-group full-width">
              <textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                rows={4}
                placeholder="Descripción detallada del inmueble..."
              />
            </div>
          </div>
        </>
      )}

      {showPhotosSection && (
        <div className="form-card photos-form-section">
          <h2 className="section-title">
            <span className="title-decorator"></span>
            Fotos
          </h2>

          {activeInmueble ? (
            <>
              {photos.length > 0 && (
                <ul className="photo-thumb-list">
                  {photos.map((photo, index) => (
                    <li key={photo.id}>
                      {photo.url && (
                        <img
                          src={photo.url}
                          alt=""
                          style={{ cursor: 'zoom-in' }}
                          onClick={() => setLightboxIndex(index)}
                        />
                      )}
                      <button
                        type="button"
                        className="photo-thumb-remove"
                        onClick={() => handleDeletePhoto(photo.id)}
                        aria-label="Eliminar foto"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {uploadSummary && <p className="help-text">{uploadSummary}</p>}
              <div className="form-row two-cols">
                <input type="file" accept="image/*" multiple onChange={handleSelectPhotos} />
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleUploadPhotos}
                  disabled={photoFiles.length === 0 || uploadProgress !== null}
                >
                  {uploadProgress
                    ? `Subiendo ${uploadProgress.current} de ${uploadProgress.total}…`
                    : photoFiles.length > 1
                      ? `+ agregar ${photoFiles.length} fotos`
                      : '+ agregar foto'}
                </button>
              </div>
            </>
          ) : (
            <p className="help-text">Guardá el inmueble primero para poder agregar fotos.</p>
          )}
        </div>
      )}

      {showDetailsSection && (
        <div className="checkboxes-container">
          <div className="form-card">
            <h2 className="section-title">
              <span className="title-decorator"></span>
              Características del inmueble
            </h2>
            <div className="checkbox-list">
              {FEATURES_OPTIONS.map((option) => (
                <label key={option} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={(form.features ?? []).includes(option)}
                    onChange={() => update('features', toggleValue(form.features, option))}
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>

          <div className="form-card">
            <h2 className="section-title">
              <span className="title-decorator"></span>
              Áreas comunes del conjunto
            </h2>
            <div className="checkbox-list">
              {AMENITIES_OPTIONS.map((option) => (
                <label key={option} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={(form.amenities ?? []).includes(option)}
                    onChange={() => update('amenities', toggleValue(form.amenities, option))}
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="form-actions">
        {isCreateFlow && step === 'photos' ? (
          <button type="button" className="action-btn" onClick={handleFinish}>
            Finalizar
          </button>
        ) : (
          <>
            <button type="button" className="action-btn btn-cancel" onClick={onCancel}>
              Cancelar
            </button>
            <button type="submit" className="action-btn" disabled={isSaving}>
              {isSaving ? 'Guardando…' : inmueble ? 'Guardar cambios' : 'Continuar'}
            </button>
          </>
        )}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          images={photos.map((photo) => ({ url: photo.url ?? '' }))}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </form>
  );
}
