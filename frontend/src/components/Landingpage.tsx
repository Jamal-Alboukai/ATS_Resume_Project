import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Menu, Play, Shield, Zap, X } from 'lucide-react';
import styles from './Landingpage.module.css';

const featureCards = [
  {
    title: 'Instant parsing',
    description: 'Upload a PDF or DOCX and see a structured ATS-ready breakdown in seconds.',
    icon: Zap,
  },
  {
    title: 'Bias guardrails',
    description: 'Consistent scoring with transparent signals on formatting and keyword coverage.',
    icon: Shield,
  },
  {
    title: 'Shareable reports',
    description: 'Export clean summaries your team can review without logging in.',
    icon: CheckCircle2,
  },
];

const steps = [
  'Upload your resume securely',
  'Pick a target role or import a JD',
  'Get an ATS score plus keyword fixes',
  'Export and share with recruiters',
];

const LandingPage: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={styles.lpPage}>
      <div className={styles.lpBackdrop} aria-hidden="true" />

      <header className={styles.lpNav}>
        <div className={styles.lpNavShell}>
          <Link to="/" className={styles.lpBrand}>
            <div className={styles.lpBrandMark}>ATS</div>
            <div>
              <p className={styles.lpBrandTitle}>Resume Analyzer</p>
              <p className={styles.lpBrandTagline}>Landing</p>
            </div>
          </Link>

          <nav className={`${styles.lpNavLinks} ${menuOpen ? styles.lpNavLinksOpen : ''}`}>
            <a href="#features" className={styles.lpNavLink}>
              Features
            </a>
            <a href="#workflow" className={styles.lpNavLink}>
              How it works
            </a>
            <a href="#cta" className={styles.lpNavLink}>
              Start
            </a>
            <div className={styles.lpNavActions}>
              <Link to="/login" className={styles.lpGhostBtn}>
                Log in
              </Link>
              <Link to="/register" className={styles.lpPrimaryBtn}>
                Get started
                <ArrowRight size={16} />
              </Link>
            </div>
          </nav>

          <button
            aria-label="Toggle menu"
            className={styles.lpMenuBtn}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <main className={styles.lpShell}>
        <section className={styles.lpHero} id="hero">
          <div className={styles.lpHeroContent}>
            <p className={styles.lpKicker}>ATS-ready in minutes</p>
            <h1 className={styles.lpHeadline}>
              Ship resumes that clear the filter and land interviews.
            </h1>
            <p className={styles.lpSubhead}>
              A focused landing experience that stays isolated from your app styles. Upload, score,
              and export without touching the dashboard chrome.
            </p>
            <div className={styles.lpHeroActions}>
              <Link to="/register" className={styles.lpPrimaryBtn}>
                Try it free
                <ArrowRight size={16} />
              </Link>
              <Link to="/login" className={styles.lpGhostBtn}>
                View dashboard
              </Link>
            </div>
            <div className={styles.lpBadgeRow}>
              <div className={styles.lpStat}>
                <span className={styles.lpStatLabel}>Avg. parse</span>
                <span className={styles.lpStatValue}>1.4s</span>
              </div>
              <div className={styles.lpStat}>
                <span className={styles.lpStatLabel}>Keyword coverage</span>
                <span className={styles.lpStatValue}>92%</span>
              </div>
              <div className={styles.lpStat}>
                <span className={styles.lpStatLabel}>Exports</span>
                <span className={styles.lpStatValue}>CSV - PDF</span>
              </div>
            </div>
          </div>

          <div className={styles.lpHeroCard}>
            <div className={styles.lpHeroCardHeader}>
              <div>
                <p className={styles.lpCardLabel}>Live ATS score</p>
                <p className={styles.lpCardTitle}>Product Designer</p>
              </div>
              <div className={styles.lpPill}>API-safe</div>
            </div>
            <div className={styles.lpScoreRow}>
              <div>
                <p className={styles.lpCardLabel}>Overall</p>
                <p className={styles.lpScoreValue}>88%</p>
              </div>
              <div className={styles.lpScoreMeta}>
                <span className={styles.lpScoreChip}>Formatting clean</span>
                <span className={styles.lpScoreChip}>Keywords 24/26</span>
              </div>
            </div>
            <div className={styles.lpCardGrid}>
              <div className={styles.lpMetric}>
                <p className={styles.lpCardLabel}>Match to JD</p>
                <p className={styles.lpMetricValue}>78%</p>
                <p className={styles.lpMetricHint}>Add metrics to 2 bullets</p>
              </div>
              <div className={styles.lpMetric}>
                <p className={styles.lpCardLabel}>Time to parse</p>
                <p className={styles.lpMetricValue}>1.7s</p>
                <p className={styles.lpMetricHint}>Under target (2.0s)</p>
              </div>
            </div>
            <div className={styles.lpProgress}>
              <div className={styles.lpProgressBar} style={{ width: '88%' }} />
            </div>
            <div className={styles.lpCardFooter}>
              <div className={styles.lpFootNote}>
                <CheckCircle2 size={16} />
                Clean, isolated styles (no globals)
              </div>
              <button className={styles.lpInlineBtn}>
                Watch demo
                <Play size={14} />
              </button>
            </div>
          </div>
        </section>

        <section className={styles.lpFeatures} id="features">
          <div className={styles.lpSectionHeader}>
            <p className={styles.lpKicker}>Why it fits</p>
            <h2 className={styles.lpSectionTitle}>A focused, conflict-free landing</h2>
            <p className={styles.lpSectionSub}>
              This page ships with its own CSS module and wrapper, so your dashboard, sidebar, and global
              styles remain untouched.
            </p>
          </div>
          <div className={styles.lpFeatureGrid}>
            {featureCards.map((card) => (
              <article key={card.title} className={styles.lpFeatureCard}>
                <div className={styles.lpIconBadge}>
                  <card.icon size={18} />
                </div>
                <h3 className={styles.lpFeatureTitle}>{card.title}</h3>
                <p className={styles.lpFeatureCopy}>{card.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.lpWorkflow} id="workflow">
          <div className={styles.lpWorkflowCard}>
            <div className={styles.lpSectionHeader}>
              <p className={styles.lpKicker}>Workflow</p>
              <h2 className={styles.lpSectionTitle}>Built to guide candidates</h2>
              <p className={styles.lpSectionSub}>
                Clear steps, exportable insights, and fast feedback without colliding with your existing components.
              </p>
            </div>
            <ol className={styles.lpStepList}>
              {steps.map((step) => (
                <li key={step} className={styles.lpStepItem}>
                  <span className={styles.lpStepDot} />
                  <span className={styles.lpStepText}>{step}</span>
                </li>
              ))}
            </ol>
            <div className={styles.lpInlineCta}>
              <Link to="/register" className={styles.lpPrimaryBtn}>
                Create free account
                <ArrowRight size={16} />
              </Link>
              <Link to="/login" className={styles.lpGhostBtn}>
                Sign in
              </Link>
            </div>
          </div>
        </section>

        <section className={styles.lpCTA} id="cta">
          <div className={styles.lpCTAContent}>
            <div>
              <p className={styles.lpKicker}>Get started</p>
              <h2 className={styles.lpSectionTitle}>Drop in a resume and see the score.</h2>
              <p className={styles.lpSectionSub}>
                No credit card. All styles sandboxed to this page. Your dashboard remains untouched.
              </p>
            </div>
            <div className={styles.lpCtaActions}>
              <Link to="/register" className={styles.lpPrimaryBtn}>
                Try free
                <ArrowRight size={16} />
              </Link>
              <Link to="/login" className={styles.lpGhostBtn}>
                Log in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.lpFooter}>
        <div className={styles.lpShell}>
          <p className={styles.lpFooterText}>ATS Resume Analyzer - Isolated landing - {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;










