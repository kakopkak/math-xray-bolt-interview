'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { DemoSeedCta } from '@/components/demo-seed-cta';
import styles from './landing-page.module.css';

type ClusterSeverity = 'none' | 'minor' | 'major' | 'fundamental';

type Cluster = {
  id: string;
  label: string;
  sev: ClusterSeverity;
  count: number;
  share: number;
};

type LandingPageProps = {
  demoSeedToken?: string;
};

const CLUSTERS: Cluster[] = [
  {
    id: 'c1',
    label: 'Märgiviga teise poolaasta lihtsustusel',
    sev: 'fundamental',
    count: 8,
    share: 35,
  },
  {
    id: 'c2',
    label: 'Segab teguriteks lahutamist valemiga',
    sev: 'major',
    count: 5,
    share: 22,
  },
  {
    id: 'c3',
    label: 'Ei kontrolli ebaharilikke lahendeid',
    sev: 'minor',
    count: 3,
    share: 13,
  },
  {
    id: 'c4',
    label: 'Unustab ± ruutjuure juures',
    sev: 'minor',
    count: 3,
    share: 13,
  },
  {
    id: 'c5',
    label: 'Ilma väärarusaamadeta',
    sev: 'none',
    count: 4,
    share: 17,
  },
];

const SEVERITY_META: Record<ClusterSeverity, { label: string; color: string }> = {
  none: { label: 'Korras', color: 'var(--severity-none)' },
  minor: { label: 'Kerge', color: 'var(--severity-minor)' },
  major: { label: 'Suurem', color: 'var(--severity-major)' },
  fundamental: { label: 'Süstemaatiline', color: 'var(--severity-fundamental)' },
};

const PROCESS = [
  { n: '01', verb: 'Kaardista', desc: 'Kogu lahendused — kirjutades või pilti laadides' },
  { n: '02', verb: 'Analüüsi', desc: 'AI tuvastab iga sammu ja märgib vea täpse asukoha' },
  { n: '03', verb: 'Rühmita', desc: 'Sarnased eksitused koondatakse klastriteks automaatselt' },
  { n: '04', verb: 'Sekku', desc: 'Vali klaster, saada sihitud harjutused klassile' },
  { n: '05', verb: 'Kinnista', desc: 'Jälgi edenemist järgmisel hinnamisel' },
] as const;

const SCATTER_DOTS = [
  { x: 7, y: 32 },
  { x: 13, y: 62 },
  { x: 21, y: 44 },
  { x: 30, y: 22 },
  { x: 38, y: 68 },
  { x: 46, y: 40 },
  { x: 54, y: 27 },
  { x: 60, y: 60 },
  { x: 67, y: 34 },
  { x: 74, y: 73 },
  { x: 81, y: 48 },
  { x: 87, y: 20 },
  { x: 92, y: 56 },
  { x: 17, y: 78 },
  { x: 34, y: 55 },
  { x: 51, y: 70 },
  { x: 69, y: 17 },
  { x: 84, y: 65 },
  { x: 43, y: 12 },
  { x: 76, y: 82 },
  { x: 25, y: 50 },
  { x: 57, y: 36 },
  { x: 89, y: 42 },
  { x: 10, y: 58 },
  { x: 64, y: 75 },
] as const;

const TOTAL_PANELS = 5;
const CTA_PANEL_INDEX = TOTAL_PANELS - 1;
const STORAGE_KEY = 'mx-lp-panel';

const quickLinksLabel = 'Maandumislehe kiirlingid';
const teacherDashboardLabel = 'Ava õpetaja töölaud';
const newAssignmentLabel = 'Loo uus ülesanne';
const tryDemoLabel = 'Proovi demot';

function AppMark({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true">
      <rect width="512" height="512" rx="112" fill="url(#landing-mark-gradient)" />
      <rect x="118" y="112" width="58" height="288" rx="6" fill="#fff" />
      <path d="M176 256 L320 112 H394 L246 256 L394 400 H320 Z" fill="#fff" />
      <path
        d="M330 312 L368 350 M368 312 L330 350"
        stroke="#C7D2FE"
        strokeWidth="18"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient
          id="landing-mark-gradient"
          x1="64"
          y1="48"
          x2="448"
          y2="464"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#4338CA" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function HeroPanel({ onJump }: { onJump: (panelIndex: number) => void }) {
  return (
    <section id="hero" className={styles.panel} aria-labelledby="hero-heading">
      <div className={styles.heroBg} />
      <div className={styles.panelInner}>
        <div className={styles.heroBody}>
          <span className={styles.kicker}>Väljakutse</span>
          <h1 id="hero-heading" className={styles.heroHeadline}>
            Tuvasta matemaatilised <em>väärarusaamad</em> enne kui need süvenevad.
          </h1>
          <p className={styles.heroLead}>
            Koosrada kaardistab iga õpilase mõttekäigu sammhaaval, grupeerib sarnased
            eksitused klastritesse ja annab sihitud harjutused — mitte järjekordse hinde.
          </p>
          <div className={styles.heroCtas}>
            <button
              type="button"
              className={`${styles.buttonBase} ${styles.buttonPrimaryLarge}`}
              onClick={() => onJump(CTA_PANEL_INDEX)}
            >
              Käivita klasterdamine
            </button>
            <button
              type="button"
              className={`${styles.buttonBase} ${styles.buttonGhost}`}
              onClick={() => onJump(1)}
            >
              Vaata kuidas →
            </button>
          </div>
          <div className={styles.heroSteps}>
            {PROCESS.map((step) => (
              <span key={step.n} className={styles.heroStep}>
                <span className={styles.heroStepNumber}>{step.n}</span>
                <span>{step.verb}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProblemPanel() {
  return (
    <section id="problem" className={styles.panel} aria-labelledby="problem-heading">
      <div className={styles.panelInner}>
        <div className={styles.problemBody}>
          <div>
            <span className={styles.kicker}>Probleem</span>
            <div className={styles.problemStat}>25</div>
            <div className={styles.problemStatSub}>
              õpilast.
              <br />
              25 hinnet.
              <br />
              Null mustrit.
            </div>
          </div>
          <div className={styles.problemRight}>
            <p id="problem-heading" className={styles.problemCopy}>
              Õpetaja näeb, kes sai 4 ja kes 3. Aga et 8 õpilast eksis samal viisil — märgiviga
              ruudu eraldamisel — jääb märkamatuks. Järgmisel tunnil kordub sama viga.
            </p>
            <div className={styles.scatterWrap} aria-label="Hajuvusdiagramm — mustrid puuduvad">
              <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                <line x1="4" y1="50" x2="96" y2="50" className={styles.scatterAxis} />
                {SCATTER_DOTS.map((dot, index) => (
                  <circle
                    key={`${dot.x}-${dot.y}-${index}`}
                    cx={dot.x}
                    cy={dot.y}
                    r="2.2"
                    className={styles.scatterDot}
                  />
                ))}
              </svg>
            </div>
            <p className={styles.scatterCaption}>8 samasugust viga — kõik hajali, ükski nähtav</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ClustersPanel({
  selectedClusterId,
  onSelectCluster,
}: {
  selectedClusterId: string;
  onSelectCluster: (clusterId: string) => void;
}) {
  const selectedCluster =
    CLUSTERS.find((cluster) => cluster.id === selectedClusterId) ?? CLUSTERS[0];
  const selectedSeverity = SEVERITY_META[selectedCluster.sev];
  const selectedSeverityStyle = {
    '--severity-color': selectedSeverity.color,
  } as CSSProperties;

  return (
    <section id="clusters" className={styles.panel} aria-labelledby="clusters-heading">
      <div className={styles.panelInner}>
        <div className={styles.clustersBody}>
          <div>
            <span className={styles.kicker}>Koosradaga</span>
            <div className={styles.clusterChart}>
              {CLUSTERS.map((cluster) => {
                const severity = SEVERITY_META[cluster.sev];
                const isActive = cluster.id === selectedClusterId;

                return (
                  <button
                    key={cluster.id}
                    type="button"
                    className={`${styles.clusterRow} ${isActive ? styles.clusterRowActive : ''}`}
                    onClick={() => onSelectCluster(cluster.id)}
                    aria-pressed={isActive}
                  >
                    <span className={styles.clusterRowLeft}>
                      <span
                        className={styles.clusterDot}
                        style={{ background: severity.color }}
                        aria-hidden="true"
                      />
                      <span className={styles.clusterLabel}>{cluster.label}</span>
                    </span>
                    <span className={styles.clusterRight}>
                      <span className={styles.clusterBar} aria-hidden="true">
                        <span
                          className={styles.clusterBarFill}
                          style={{
                            width: `${cluster.share * 2.5}%`,
                            background: severity.color,
                          }}
                        />
                      </span>
                      <span className={styles.clusterCount}>{cluster.count}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.clusterDetail}>
            <p className={styles.clusterDetailLabel}>Valitud klaster</p>
            <h2 id="clusters-heading" className={styles.clusterDetailHeading}>
              {selectedCluster.label}
            </h2>
            <div className={styles.clusterDetailMetaRow}>
              <span className={styles.severityPill} style={selectedSeverityStyle}>
                <span className={styles.severityPillDot} aria-hidden="true" />
                {selectedSeverity.label}
              </span>
              <span className={styles.clusterCount}>
                {selectedCluster.count} õpilast · {selectedCluster.share}%
              </span>
            </div>
            <p className={styles.clusterDetailDesc}>
              Iga klastri jaoks genereerib Koosrada kolm sihitud harjutust, mida saab ühe
              klõpsuga klassitunnile saata.
            </p>
            <p className={styles.clusterDetailMeta}>23 tööd · 4 klastrit tuvastatud · alla 1 min</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProcessPanel() {
  return (
    <section id="process" className={styles.panel} aria-labelledby="process-heading">
      <div className={styles.panelInner}>
        <div className={styles.processBody}>
          <div className={styles.processHead}>
            <span className={styles.kicker}>Mõju</span>
            <h2 id="process-heading" className={styles.processHeading}>
              Viis sammu. Üks vaade. Iga tund.
            </h2>
          </div>
          <div className={styles.processSteps}>
            {PROCESS.map((step) => (
              <div key={step.n} className={styles.processStep}>
                <span className={styles.processStepNumber}>{step.n}</span>
                <span className={styles.processStepVerb}>{step.verb}</span>
                <span className={styles.processStepDesc}>{step.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CtaPanel({ demoSeedToken = '' }: LandingPageProps) {
  return (
    <section id="cta" className={styles.panel} aria-labelledby="cta-heading">
      <div className={styles.ctaBg} />
      <div className={styles.panelInner}>
        <div className={styles.ctaBody}>
          <AppMark />
          <span className={styles.kicker}>Proovi praegu</span>
          <h2 id="cta-heading" className={styles.ctaHeadline}>
            Näe oma klassi <em>mõttekäiku</em> esimest korda.
          </h2>
          <p className={styles.ctaLead}>
            Koosrada on valmis kasutamiseks. Lae oma õpilaste lahendused ja saa klasterdamise
            tulemused alla minuti jooksul.
          </p>
          <div className={styles.demoCta}>
            <DemoSeedCta
              demoSeedToken={demoSeedToken}
              label="Käivita klasterdamine"
              loadingLabel="Käivitame klasterdamist…"
              errorClassName={styles.ctaError}
            />
          </div>
          <span className={styles.ctaFootnote}>alla 1 minuti · ruutvõrrandid alates täna</span>
          <nav className={styles.hiddenQuickLinks} aria-label={quickLinksLabel}>
            <Link href="/teacher">{teacherDashboardLabel}</Link>
            <Link href="/teacher/new">{newAssignmentLabel}</Link>
            <span>{tryDemoLabel}</span>
          </nav>
        </div>
      </div>
    </section>
  );
}

export function LandingPage({ demoSeedToken = '' }: LandingPageProps) {
  const scrollRootRef = useRef<HTMLDivElement | null>(null);
  const syncFrameRef = useRef<number | null>(null);
  const [currentPanel, setCurrentPanel] = useState(0);
  const [selectedClusterId, setSelectedClusterId] = useState(CLUSTERS[0].id);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotionPreference = () => setPrefersReducedMotion(media.matches);

    syncMotionPreference();
    media.addEventListener('change', syncMotionPreference);

    return () => {
      media.removeEventListener('change', syncMotionPreference);
    };
  }, []);

  useEffect(() => {
    const scrollRoot = scrollRootRef.current;
    if (!scrollRoot) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      let savedPanel = 0;

      try {
        const storedValue = window.localStorage.getItem(STORAGE_KEY);
        savedPanel = storedValue ? Number.parseInt(storedValue, 10) : 0;
      } catch {}

      const boundedPanel = Number.isFinite(savedPanel)
        ? Math.max(0, Math.min(TOTAL_PANELS - 1, savedPanel))
        : 0;

      scrollRoot.scrollLeft = boundedPanel * scrollRoot.clientWidth;
      setCurrentPanel(boundedPanel);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    const scrollRoot = scrollRootRef.current;
    if (!scrollRoot) {
      return;
    }

    const syncCurrentPanel = () => {
      const viewportWidth = Math.max(1, scrollRoot.clientWidth);
      const nextPanel = Math.max(
        0,
        Math.min(TOTAL_PANELS - 1, Math.round(scrollRoot.scrollLeft / viewportWidth))
      );

      setCurrentPanel((current) => (current === nextPanel ? current : nextPanel));

      try {
        window.localStorage.setItem(STORAGE_KEY, String(nextPanel));
      } catch {}
    };

    const handleScroll = () => {
      if (syncFrameRef.current !== null) {
        return;
      }

      syncFrameRef.current = window.requestAnimationFrame(() => {
        syncFrameRef.current = null;
        syncCurrentPanel();
      });
    };

    syncCurrentPanel();
    scrollRoot.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      scrollRoot.removeEventListener('scroll', handleScroll);
      if (syncFrameRef.current !== null) {
        window.cancelAnimationFrame(syncFrameRef.current);
        syncFrameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const scrollRoot = scrollRootRef.current;
      if (!scrollRoot) {
        return;
      }

      scrollRoot.scrollLeft = currentPanel * scrollRoot.clientWidth;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [currentPanel]);

  function goToPanel(panelIndex: number) {
    const scrollRoot = scrollRootRef.current;
    if (!scrollRoot) {
      return;
    }

    const boundedPanel = Math.max(0, Math.min(TOTAL_PANELS - 1, panelIndex));
    scrollRoot.scrollTo({
      left: boundedPanel * scrollRoot.clientWidth,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
        return;
      }

      const scrollRoot = scrollRootRef.current;
      if (!scrollRoot) {
        return;
      }

      event.preventDefault();

      const nextPanel = event.key === 'ArrowRight' ? currentPanel + 1 : currentPanel - 1;
      const boundedPanel = Math.max(0, Math.min(TOTAL_PANELS - 1, nextPanel));

      scrollRoot.scrollTo({
        left: boundedPanel * scrollRoot.clientWidth,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentPanel, prefersReducedMotion]);

  return (
    <div className={styles.landingPage}>
      <header className={styles.topNav}>
        <Link href="/" className={styles.brand} aria-label="Koosrada avaleht">
          <span className={styles.brandPill} aria-hidden="true">
            K
          </span>
          <span>Koosrada</span>
        </Link>
        <div className={styles.navRight}>
          <span className={styles.navKicker}>Matemaatika Röntgen</span>
          <button
            type="button"
            className={`${styles.buttonBase} ${styles.buttonPrimary}`}
            onClick={() => goToPanel(CTA_PANEL_INDEX)}
          >
            Käivita demo
          </button>
        </div>
      </header>

      <div ref={scrollRootRef} className={styles.scrollRoot}>
        <HeroPanel onJump={goToPanel} />
        <ProblemPanel />
        <ClustersPanel
          selectedClusterId={selectedClusterId}
          onSelectCluster={setSelectedClusterId}
        />
        <ProcessPanel />
        <CtaPanel demoSeedToken={demoSeedToken} />
      </div>

      <button
        type="button"
        className={`${styles.navArrow} ${styles.navArrowPrev}`}
        onClick={() => goToPanel(currentPanel - 1)}
        disabled={currentPanel === 0}
        aria-label="Eelmine paneel"
      >
        ←
      </button>
      <button
        type="button"
        className={`${styles.navArrow} ${styles.navArrowNext}`}
        onClick={() => goToPanel(currentPanel + 1)}
        disabled={currentPanel === TOTAL_PANELS - 1}
        aria-label="Järgmine paneel"
      >
        →
      </button>

      <div className={styles.dotNav} role="tablist" aria-label="Paneelide navigeerimine">
        {Array.from({ length: TOTAL_PANELS }, (_, index) => (
          <button
            key={`dot-${index}`}
            type="button"
            className={`${styles.dot} ${index === currentPanel ? styles.dotActive : ''}`}
            onClick={() => goToPanel(index)}
            aria-label={`Paneel ${index + 1}`}
            aria-pressed={index === currentPanel}
          />
        ))}
      </div>

      <div className={styles.panelCounter} aria-live="polite">
        {String(currentPanel + 1).padStart(2, '0')} / {String(TOTAL_PANELS).padStart(2, '0')}
      </div>
    </div>
  );
}
