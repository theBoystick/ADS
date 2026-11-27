import React, { useState } from 'react';
import { ArrowRight, Calendar, Check, MapPin, Users, X } from 'lucide-react';
import { RegistrationRecord } from '../types';

interface RegistrationModalProps {
  isOpen: boolean;
  existingRegistration: RegistrationRecord | null;
  onRegister: (record: RegistrationRecord) => void;
  onGoToStudio: () => void;
  onClose: () => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  existingRegistration,
  onRegister,
  onGoToStudio,
  onClose,
}) => {
  const [fullName, setFullName] = useState(
    existingRegistration?.fullName ?? ''
  );
  const [phone, setPhone] = useState(existingRegistration?.phone ?? '');
  const [email, setEmail] = useState(existingRegistration?.email ?? '');
  const [church, setChurch] = useState(existingRegistration?.church ?? '');
  const [guests, setGuests] = useState<number>(
    existingRegistration?.guests ?? 1
  );
  const [error, setError] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(!existingRegistration);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setError('Veuillez indiquer votre nom complet.');
      return;
    }
    if (!trimmedPhone || trimmedPhone.length < 6) {
      setError('Veuillez indiquer un numéro de téléphone ou WhatsApp valide.');
      return;
    }

    setError('');
    const code =
      existingRegistration?.code ??
      `TFG-${Math.floor(1000 + Math.random() * 9000)}`;

    const record: RegistrationRecord = {
      id: existingRegistration?.id ?? `reg-${Date.now()}`,
      code,
      fullName: trimmedName,
      phone: trimmedPhone,
      email: email.trim(),
      church: church.trim(),
      guests,
      createdAt: existingRegistration?.createdAt ?? new Date().toISOString(),
    };

    onRegister(record);
    setIsEditing(false);
  };

  return (
    <div className="reg-backdrop" onClick={onClose}>
      <div className="reg-card" onClick={(e) => e.stopPropagation()}>
        <div className="reg-header">
          <div>
            <span className="reg-eyebrow">28 DÉC. 2026 · 18H – 06H</span>
            <h2 className="reg-title">Enregistrement — The Finger of God</h2>
          </div>
          <button
            type="button"
            className="reg-close"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {!isEditing && existingRegistration ? (
          <div className="reg-body">
            <div className="reg-pass">
              <div className="reg-pass-top">
                <span className="reg-pass-badge">
                  <Check size={13} />
                  Inscription confirmée
                </span>
                <span className="reg-pass-code">
                  {existingRegistration.code}
                </span>
              </div>

              <div className="reg-pass-name">
                {existingRegistration.fullName}
              </div>
              <div className="reg-pass-meta">
                <span>{existingRegistration.phone}</span>
                {existingRegistration.church && (
                  <span>· {existingRegistration.church}</span>
                )}
              </div>

              <div className="reg-pass-details">
                <div>
                  <Calendar size={13} />
                  <span>Lundi 28 Déc. 2026 · 18h – 06h</span>
                </div>
                <div>
                  <MapPin size={13} />
                  <span>Miracle Centre, Yaoundé — Efoulan Pont</span>
                </div>
                <div>
                  <Users size={13} />
                  <span>
                    {existingRegistration.guests}{' '}
                    {existingRegistration.guests > 1
                      ? 'participants'
                      : 'participant'}
                  </span>
                </div>
              </div>
            </div>

            <div className="reg-actions-stack">
              <button
                type="button"
                className="btn-flame btn-flame-lg"
                onClick={() => {
                  onClose();
                  onGoToStudio();
                }}
              >
                Créer mon flyer « J&apos;y serai »
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                className="reg-link-btn"
                onClick={() => setIsEditing(true)}
              >
                Modifier mes informations
              </button>
            </div>
          </div>
        ) : (
          <form className="reg-body" onSubmit={handleSubmit}>
            <p className="reg-lead">
              Confirmez votre présence à la soirée au Miracle Centre (Yaoundé,
              Efoulan Pont).
            </p>

            <div className="reg-field">
              <label htmlFor="reg-name">Nom complet *</label>
              <input
                id="reg-name"
                type="text"
                placeholder="Ex : Samuel Mbarga"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="reg-grid-2">
              <div className="reg-field">
                <label htmlFor="reg-phone">Téléphone / WhatsApp *</label>
                <input
                  id="reg-phone"
                  type="tel"
                  placeholder="+237 6XX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="reg-field">
                <label htmlFor="reg-guests">Places</label>
                <select
                  id="reg-guests"
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                >
                  <option value={1}>1 personne</option>
                  <option value={2}>2 personnes</option>
                  <option value={3}>3 personnes</option>
                  <option value={4}>4+ personnes</option>
                </select>
              </div>
            </div>

            <div className="reg-grid-2">
              <div className="reg-field">
                <label htmlFor="reg-email">E-mail (optionnel)</label>
                <input
                  id="reg-email"
                  type="email"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="reg-field">
                <label htmlFor="reg-church">Assemblée / Quartier</label>
                <input
                  id="reg-church"
                  type="text"
                  placeholder="Optionnel"
                  value={church}
                  onChange={(e) => setChurch(e.target.value)}
                />
              </div>
            </div>

            {error && <div className="reg-error">{error}</div>}

            <div className="reg-footer">
              <button
                type="button"
                className="reg-btn-secondary"
                onClick={onClose}
              >
                Annuler
              </button>
              <button type="submit" className="btn-flame">
                Valider mon enregistrement
                <ArrowRight size={15} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
