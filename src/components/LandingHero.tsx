import React, { useState } from 'react';
import {
  ArrowRight,
  Calendar,
  Download,
  ImagePlus,
  MapPin,
  Scissors,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { GOOGLE_REGISTRATION_FORM_URL } from '../config/links';

interface LandingHeroProps {
  onOpenStudio: () => void;
}

const SHOWCASE_FLYERS = [
  {
    id: 0,
    num: '01',
    src: '/hero-flyer.jpg',
    alt: "Exemple de flyer J'y serai — portrait homme",
    label: 'Rendu N&B Officiel',
  },
  {
    id: 1,
    num: '02',
    src: '/hero-flyer-2.jpg',
    alt: "Exemple de flyer J'y serai — portrait femme",
    label: 'Intégration douce',
  },
];

export const LandingHero: React.FC<LandingHeroProps> = ({ onOpenStudio }) => {
  const [frontIndex, setFrontIndex] = useState<number>(0);

  const frontCard = SHOWCASE_FLYERS[frontIndex];
  const backCard = SHOWCASE_FLYERS[frontIndex === 0 ? 1 : 0];

  return (
    <div className="hero-page">
      {/* Optical Lens Flares & Ambient Light Layers */}
      <div className="hero-flare-orb hero-flare-orb-a" aria-hidden="true" />
      <div className="hero-flare-orb hero-flare-orb-b" aria-hidden="true" />
      <div className="hero-flare-streak" aria-hidden="true" />
      <div className="hero-flare-ring hero-flare-ring-a" aria-hidden="true" />
      <div className="hero-flare-ring hero-flare-ring-b" aria-hidden="true" />
      <div className="hero-ambient-arc" aria-hidden="true" />

      <header className="hero-nav">
        <div className="hero-wordmark">
          <span>THE ARMY OF THE LORD</span>
        </div>

        <nav className="hero-pill-nav" aria-label="Navigation principale">
          <button type="button" className="hero-pill-link is-active">
            Accueil
          </button>
          <a
            href={GOOGLE_REGISTRATION_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hero-pill-link"
          >
            Enregistrement
          </a>
          <button
            type="button"
            className="hero-pill-link"
            onClick={onOpenStudio}
          >
            Créer mon flyer
          </button>
        </nav>

        <a
          href={GOOGLE_REGISTRATION_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hero-date-chip"
        >
          <Calendar size={14} />
          <span>28 DÉC · 18H</span>
        </a>
      </header>

      <main className="hero-grid">
        <section className="hero-copy">

          <h1 className="hero-headline">
            <span className="hl-outline">THE FINGER</span>
            <span className="hl-solid">OF GOD</span>
            <span className="h1-accent">Tu y seras ?</span>
          </h1>

          <p className="hero-description">
            Rejoignez la grande nuit du 28 décembre, de 18h à 06h à Efoulan
            Pont. Confirmez votre participation et générez votre affiche
            officielle avec détourage automatique de votre photo.
          </p>

          <div className="hero-cta-row">
            <button
              type="button"
              className="btn-flame btn-flame-hero"
              onClick={onOpenStudio}
            >
              <span>Créer mon flyer</span>
              <ArrowRight size={17} />
            </button>

            <a
              href={GOOGLE_REGISTRATION_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-paper-hero"
            >
              <UserCheck size={16} />
              <span>S&apos;enregistrer</span>
            </a>
          </div>

          <div className="hero-facts">
            <div className="hero-fact">
              <Calendar size={14} />
              <span>Lundi 28 Déc. 2026 · 18h – 06h</span>
            </div>
            <div className="hero-fact">
              <MapPin size={14} />
              <span>Miracle Centre · Efoulan Pont</span>
            </div>
          </div>
        </section>

        {/* Dual Fanned Showcase using BOTH Flyer Examples */}
        <section className="hero-visual">
          <div className="hero-card-annotation" aria-hidden="true">
            <span>{frontCard.label}</span>
            <svg width="48" height="34" viewBox="0 0 48 34" fill="none">
              <path
                d="M44 4C31 4 15 11 7 28M7 28L5 19M7 28L16 26"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="hero-deck">
            {/* Back Card (clickable to bring forward) */}
            <button
              type="button"
              className="hero-deck-back"
              onClick={() => setFrontIndex(backCard.id)}
              aria-label={`Afficher l'exemple ${backCard.num}`}
            >
              <div className="hero-showcase-frame">
                <img
                  src={backCard.src}
                  alt={backCard.alt}
                  className="hero-showcase-img"
                />
              </div>
            </button>

            {/* Front Active Card */}
            <div
              className="hero-showcase-card"
              onClick={onOpenStudio}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenStudio();
                }
              }}
            >
              <div className="hero-showcase-frame">
                <img
                  src={frontCard.src}
                  alt={frontCard.alt}
                  className="hero-showcase-img"
                />
                <span className="hero-showcase-badge">
                  <Sparkles size={12} />
                  Détourage IA
                </span>
              </div>

              <div className="hero-showcase-footer">
                <div>
                  <div className="hero-showcase-title">
                    Flyer « J&apos;y serai »
                  </div>
                  <div className="hero-showcase-sub">
                    Importez votre photo · Export HD
                  </div>
                </div>
                <span className="hero-showcase-arrow">
                  <ArrowRight size={16} />
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Bottom Editorial Strip + 01/02 Switcher (occupies lower hero cleanly) */}
      <footer className="hero-bottom-strip">
        <div className="hero-steps-bar">
          <div className="hero-step-pill">
            <ImagePlus size={15} className="hero-step-icon" />
            <div>
              <strong>Importez</strong>
              <span>Une photo portrait claire</span>
            </div>
          </div>

          <div className="hero-step-pill">
            <Scissors size={15} className="hero-step-icon" />
            <div>
              <strong>Détourage IA</strong>
              <span>Fond supprimé + N&amp;B officiel</span>
            </div>
          </div>

          <div className="hero-step-pill">
            <Download size={15} className="hero-step-icon" />
            <div>
              <strong>Téléchargez</strong>
              <span>Prêt pour WhatsApp &amp; réseaux</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
