import { useRef, useState, type ChangeEvent, type SyntheticEvent } from 'react';
import * as authService from '@/services/http/authService';
import { ClientApiError } from '@/services/http/httpClient';
import type { AdminProfile } from '@/types/auth';

function initials(profile: AdminProfile): string {
  const letter = profile.first_name?.trim()?.[0] ?? profile.email?.trim()?.[0] ?? '?';
  return letter.toUpperCase();
}

export function ProfilePanel({ profile: initialProfile }: { profile: AdminProfile }) {
  const [profile, setProfile] = useState(initialProfile);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [dataMsg, setDataMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [dataForm, setDataForm] = useState({
    first_name: profile.first_name,
    last_name: profile.last_name,
    email: profile.email,
    phone: profile.phone,
  });
  const [isSavingData, setIsSavingData] = useState(false);

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [passForm, setPassForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [isSavingPass, setIsSavingPass] = useState(false);

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsUploadingPhoto(true);
    setPhotoError(null);
    try {
      const updated = await authService.uploadProfilePhoto(file);
      setProfile(updated);
    } catch (error) {
      const detail = error instanceof ClientApiError ? error.detail : null;
      setPhotoError(detail ?? 'No se pudo actualizar la foto de perfil.');
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  function startEdit() {
    setDataForm({ first_name: profile.first_name, last_name: profile.last_name, email: profile.email, phone: profile.phone });
    setDataMsg(null);
    setIsEditing(true);
  }

  async function handleSaveData(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dataForm.first_name.trim() || !dataForm.email.trim()) {
      setDataMsg({ type: 'error', text: 'Nombre y correo son obligatorios.' });
      return;
    }
    setIsSavingData(true);
    setDataMsg(null);
    try {
      const updated = await authService.updateProfile(dataForm);
      setProfile(updated);
      setDataMsg({ type: 'success', text: 'Cambios guardados correctamente.' });
      setTimeout(() => {
        setIsEditing(false);
        setDataMsg(null);
      }, 1200);
    } catch (error) {
      const detail = error instanceof ClientApiError ? error.detail : null;
      setDataMsg({ type: 'error', text: detail ?? 'No se pudieron guardar los cambios.' });
    } finally {
      setIsSavingData(false);
    }
  }

  async function handleChangePassword(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passForm.new_password.length < 8) {
      setPassMsg({ type: 'error', text: 'La nueva contraseña debe tener al menos 8 caracteres.' });
      return;
    }
    if (passForm.new_password !== passForm.confirm) {
      setPassMsg({ type: 'error', text: 'Las contraseñas no coinciden.' });
      return;
    }
    setIsSavingPass(true);
    setPassMsg(null);
    try {
      await authService.changePassword({
        current_password: passForm.current_password,
        new_password: passForm.new_password,
      });
      setPassMsg({ type: 'success', text: 'Contraseña actualizada correctamente.' });
      setTimeout(() => {
        setIsChangingPassword(false);
        setPassMsg(null);
        setPassForm({ current_password: '', new_password: '', confirm: '' });
      }, 1400);
    } catch (error) {
      const detail = error instanceof ClientApiError ? error.detail : null;
      setPassMsg({ type: 'error', text: detail ?? 'No se pudo actualizar la contraseña.' });
    } finally {
      setIsSavingPass(false);
    }
  }

  return (
    <div className="perfil-grid">
      <div className="profile-card">
        <div className="avatar-wrapper" onClick={() => photoInputRef.current?.click()}>
          <div className="avatar">
            {profile.photo_url ? (
              <img className="avatar-img" src={profile.photo_url} alt="" />
            ) : (
              <span className="avatar-letra">{initials(profile)}</span>
            )}
          </div>
          <div className={`avatar-overlay ${isUploadingPhoto ? 'is-visible' : ''}`} title="Cambiar foto">
            {isUploadingPhoto ? (
              <span className="avatar-overlay-text">…</span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
            )}
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="avatar-input"
            onChange={handlePhotoChange}
          />
        </div>

        {photoError && <p className="field-error">{photoError}</p>}

        <div className="profile-info">
          <p className="profile-name">
            {profile.first_name} {profile.last_name}
          </p>
          <p className="profile-email">{profile.email}</p>
        </div>

        <div className="profile-divider"></div>

        <ul className="profile-meta">
          <li>
            <span className="meta-label">Teléfono</span>
            <span className="meta-value">{profile.phone || '—'}</span>
          </li>
        </ul>
      </div>

      <div className="sections-col">
        <section className="section-card">
          <div className="section-head-row">
            <div className="section-head">
              <span className="section-line"></span>
              <p className="section-title">Datos del perfil</p>
            </div>
            {!isEditing && (
              <button type="button" className="btn-gold-outline" onClick={startEdit}>
                Editar
              </button>
            )}
          </div>

          {!isEditing && (
            <div>
              <div className="dato-row">
                <span className="dato-label">Nombre completo</span>
                <span className="dato-value">
                  {profile.first_name} {profile.last_name}
                </span>
              </div>
              <div className="dato-row">
                <span className="dato-label">Correo electrónico</span>
                <span className="dato-value">{profile.email}</span>
              </div>
              <div className="dato-row">
                <span className="dato-label">Teléfono</span>
                <span className="dato-value">{profile.phone || '—'}</span>
              </div>
            </div>
          )}

          {isEditing && (
            <form className="perfil-form" onSubmit={handleSaveData}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nombre</label>
                  <input
                    className="form-input"
                    value={dataForm.first_name}
                    onChange={(e) => setDataForm((f) => ({ ...f, first_name: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Apellido</label>
                  <input
                    className="form-input"
                    value={dataForm.last_name}
                    onChange={(e) => setDataForm((f) => ({ ...f, last_name: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Correo electrónico</label>
                  <input
                    className="form-input"
                    type="email"
                    value={dataForm.email}
                    onChange={(e) => setDataForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input
                    className="form-input"
                    type="tel"
                    value={dataForm.phone}
                    onChange={(e) => setDataForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
              </div>

              {dataMsg && <div className={`form-msg form-msg--${dataMsg.type}`}>{dataMsg.text}</div>}

              <div className="form-actions">
                <button type="button" className="btn-cancel-pill" onClick={() => setIsEditing(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-navy" disabled={isSavingData}>
                  {isSavingData ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="section-card">
          <div className="seguridad-row">
            <div>
              <div className="section-head">
                <span className="section-line"></span>
                <p className="section-title">Seguridad</p>
              </div>
              <p className="pass-info">
                <span className="pass-name">Contraseña de acceso</span>
              </p>
            </div>
            {!isChangingPassword && (
              <button type="button" className="btn-gold-outline" onClick={() => setIsChangingPassword(true)}>
                Cambiar contraseña
              </button>
            )}
          </div>

          {isChangingPassword && (
            <form className="perfil-form" onSubmit={handleChangePassword}>
              <div className="form-group">
                <label className="form-label">Contraseña actual</label>
                <input
                  className="form-input"
                  type="password"
                  autoComplete="current-password"
                  value={passForm.current_password}
                  onChange={(e) => setPassForm((f) => ({ ...f, current_password: e.target.value }))}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nueva contraseña</label>
                  <input
                    className="form-input"
                    type="password"
                    autoComplete="new-password"
                    value={passForm.new_password}
                    onChange={(e) => setPassForm((f) => ({ ...f, new_password: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirmar contraseña</label>
                  <input
                    className="form-input"
                    type="password"
                    autoComplete="new-password"
                    value={passForm.confirm}
                    onChange={(e) => setPassForm((f) => ({ ...f, confirm: e.target.value }))}
                  />
                </div>
              </div>

              {passMsg && <div className={`form-msg form-msg--${passMsg.type}`}>{passMsg.text}</div>}

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel-pill"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setPassForm({ current_password: '', new_password: '', confirm: '' });
                    setPassMsg(null);
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-navy" disabled={isSavingPass}>
                  {isSavingPass ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
