import React, { useEffect, useMemo, useState } from 'react';

const features = [
  ['ST', 'Smart Token Generation', 'Create structured tokens instantly for every service desk and branch.'],
  ['RT', 'Real-Time Queue Tracking', 'Keep operators, admins, and public screens synchronized as tokens move.'],
  ['MC', 'Multi-Counter Management', 'Coordinate active counters, staff, and service points from one workspace.'],
  ['BR', 'Branch Management', 'Scale queue operations across departments, branches, and industries.'],
  ['RC', 'Staff Role Control', 'Give each user the correct dashboard, permissions, and workflow.'],
  ['QH', 'Queue History', 'Review completed, skipped, emergency, and cancelled queue activity.'],
  ['AD', 'Analytics Dashboard', 'Track operational flow with queue, branch, staff, and token insights.'],
  ['SMS', 'SMS Notifications', 'Notify users with verification and queue updates when messaging is enabled.'],
  ['WA', 'WhatsApp Notifications', 'Prepare customer-friendly queue messages for WhatsApp-based updates.'],
  ['AI', 'AI Waiting-Time Prediction', 'Estimate wait time and service demand with intelligent queue signals.'],
  ['FB', 'Customer Feedback Collection', 'Capture service feedback after queue completion.'],
  ['BK', 'Backup & Restore', 'Support safer operations with backup-ready deployment planning.'],
  ['HM', 'System Health Monitoring', 'Monitor runtime status, services, and operational health signals.'],
  ['TV', 'TV Cast Display', 'Show live token movement on HDMI, smart TV, browser, or local display devices.'],
  ['QR', 'QR Code Queue Tracking', 'Let customers open public queue views through scan-friendly URLs.'],
  ['SA', 'Security & Audit Logs', 'Record key login, device, token, and admin activity for review.'],
  ['GC', 'GDPR / HIPAA / CCPA Readiness', 'Include privacy, consent, access control, and audit-ready building blocks.'],
  ['DM', 'Device Monitoring', 'Track trusted device details for safer account activity.'],
  ['LA', 'Live Activity Logs', 'Give admins a timeline of important system events.']
];

const industries = [
  ['H+', 'Hospitals'],
  ['CL', 'Clinics'],
  ['BK', 'Banks'],
  ['SC', 'Schools'],
  ['UN', 'Universities'],
  ['GO', 'Government Offices'],
  ['SV', 'Service Centers'],
  ['SL', 'Salons'],
  ['RT', 'Retail Stores'],
  ['CO', 'Corporate Offices']
];

const securityBadges = [
  'Secure Authentication',
  'OTP Verification',
  'Audit Logs',
  'Role-Based Access Control',
  'Device Monitoring',
  'GDPR Ready',
  'HIPAA Ready',
  'CCPA Ready',
  'Data Encryption',
  'Session Security'
];

const faqs = [
  ['How does AI Queue work?', 'Teams create or import tokens, operators call the next customer, and public displays update in real time.'],
  ['Can I manage multiple branches?', 'Yes. Admin users can manage industries, branches, counters, staff, and branch-level operations.'],
  ['Does it support TV displays?', 'Yes. TV Cast supports HDMI browser windows, display URLs, QR access, and Bluetooth or WiFi queue data.'],
  ['Can customers track queues online?', 'Yes. Public queue and display views can show the current token, next token, counter, and status.'],
  ['Is the system secure?', 'The platform includes role access, password hashing, session controls, audit logs, OTP flows, and device monitoring.'],
  ['Does it support notifications?', 'The system includes OTP messaging support and notification-ready queue communication workflows.']
];

const stats = [
  ['Tokens Managed', 48000, '+'],
  ['Active Counters', 128, '+'],
  ['Average Wait Time', 12, ' min'],
  ['Customer Satisfaction', 96, '%']
];

const navLinks = ['Features', 'Pricing', 'Documentation', 'Support', 'Contact'];
const footerLinks = ['Privacy Policy', 'Terms of Service'];

function useAnimatedCounters(enabled = true) {
  const [values, setValues] = useState(stats.map(() => 0));

  useEffect(() => {
    if (!enabled) return undefined;
    const duration = 1400;
    const started = performance.now();
    let frame;

    const tick = (now) => {
      const progress = Math.min((now - started) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValues(stats.map(([, target]) => Math.round(target * eased)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [enabled]);

  return values;
}

function WelcomePage({ onDone }) {
  const [openFaq, setOpenFaq] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const counters = useAnimatedCounters(true);
  const logoSrc = `${process.env.PUBLIC_URL || ''}/image/logo.png`;

  useEffect(() => {
    const timer = setTimeout(onDone, 45000);
    return () => clearTimeout(timer);
  }, [onDone]);

  const featureRows = useMemo(() => features, []);

  const scrollToDemo = () => {
    document.getElementById('tv-cast-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className="welcome-page landing-page" aria-label="AI Queue landing page">
      <section className="landing-hero">
        <div className="landing-glow landing-glow-one" />
        <div className="landing-glow landing-glow-two" />
        <nav className="landing-nav" aria-label="Landing navigation">
          <div className="landing-brand">
            <img src={logoSrc} alt="" />
            <span>AI Queue</span>
          </div>
          <button
            type="button"
            className="landing-menu-toggle"
            onClick={() => setMobileNavOpen((isOpen) => !isOpen)}
            aria-expanded={mobileNavOpen}
            aria-controls="landing-mobile-nav"
            aria-label="Toggle navigation menu"
          >
            <span />
            <span />
            <span />
          </button>
          <div id="landing-mobile-nav" className={`landing-nav-links ${mobileNavOpen ? 'open' : ''}`}>
            {navLinks.map((item) => (
              <button type="button" key={item} onClick={() => setMobileNavOpen(false)}>{item}</button>
            ))}
          </div>
          <button type="button" className="landing-nav-action" onClick={onDone}>Sign Up</button>
        </nav>

        <div className="hero-grid">
          <div className="hero-copy reveal-up">
            <span className="hero-kicker">Intelligent queue automation</span>
            <h1>AI Queue Management System</h1>
            <p className="hero-subtitle">Reduce waiting time, manage tokens, and improve customer flow with intelligent queue automation.</p>
            <p className="hero-description">
              A modern queue management platform designed for hospitals, banks, schools, service centers, offices, clinics, salons, and enterprises.
            </p>
            <div className="hero-actions">
              <button type="button" className="landing-btn primary ripple" onClick={onDone}>Get Started</button>
              <button type="button" className="landing-btn secondary ripple" onClick={scrollToDemo}>View Demo</button>
            </div>
          </div>

          <div className="hero-visual reveal-up" aria-label="Animated queue illustration">
            <div className="ai-orbit">
              <span />
              <span />
              <span />
            </div>
            <div className="queue-stage">
              <div className="queue-header">
                <span>Live Queue</span>
                <strong>Counter 03</strong>
              </div>
              <div className="queue-token-card active">
                <small>Now Serving</small>
                <strong>A102</strong>
              </div>
              <div className="queue-token-stack">
                <span>A103</span>
                <span>A104</span>
                <span>A105</span>
              </div>
              <div className="animated-queue-line" aria-hidden="true">
                <span className="queue-counter-point">Desk</span>
                {['A103', 'A104', 'A105', 'A106'].map((token) => (
                  <span className="queue-person" key={token}>
                    <b>{token}</b>
                    <i />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section intro-section reveal-up">
        <div className="section-heading">
          <span>Product Introduction</span>
          <h2>What is AI Queue?</h2>
          <p>
            AI Queue is a smart queue management platform that helps organizations automate token generation, manage customer flow,
            monitor service counters, reduce waiting times, and improve operational efficiency.
          </p>
        </div>
        <div className="intro-cards">
          {['Automate tokens', 'Monitor counters', 'Improve service'].map((item, index) => (
            <article className="glass-card intro-card" key={item} style={{ '--delay': `${index * 90}ms` }}>
              <span className="card-icon">{index === 0 ? 'TG' : index === 1 ? 'CM' : 'CX'}</span>
              <h3>{item}</h3>
              <p>{index === 0 ? 'Issue clean queue numbers with service-aware routing.' : index === 1 ? 'See branch, staff, and counter activity as it happens.' : 'Reduce waiting pressure with clearer customer movement.'}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="section-heading">
          <span>Platform Features</span>
          <h2>Everything needed for modern queue operations</h2>
        </div>
        <div className="feature-grid">
          {featureRows.map(([icon, title, description], index) => (
            <article className="glass-card feature-card" key={title} style={{ '--delay': `${index * 28}ms` }}>
              <span className="card-icon">{icon}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section why-section">
        <div className="section-heading">
          <span>Why Choose AI Queue</span>
          <h2>Built for faster service and calmer waiting rooms</h2>
        </div>
        <div className="benefit-grid">
          {['Faster Customer Service', 'Reduced Waiting Time', 'Improved Staff Productivity', 'Better Customer Experience', 'Real-Time Monitoring', 'Scalable Multi-Branch Support', 'Secure and Reliable'].map((benefit) => (
            <div className="benefit-pill" key={benefit}>{benefit}</div>
          ))}
        </div>
        <div className="stats-grid">
          {stats.map(([label,, suffix], index) => (
            <article className="glass-card stat-card" key={label}>
              <strong>{counters[index].toLocaleString()}{suffix}</strong>
              <span>{label}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="section-heading">
          <span>Industries</span>
          <h2>Flexible for public service, healthcare, retail, and enterprise teams</h2>
        </div>
        <div className="industry-grid">
          {industries.map(([icon, label]) => (
            <article className="glass-card industry-card" key={label}>
              <span>{icon}</span>
              <strong>{label}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section tv-section" id="tv-cast-preview">
        <div className="section-heading">
          <span>TV Display & Queue Visualization</span>
          <h2>External display mode for public queue screens</h2>
          <p>Use HDMI Display Support, Website URL Display, Bluetooth / WiFi Display Support, and Smart TV Integration.</p>
        </div>
        <div className="tv-layout">
          <div className="tv-preview">
            <div className="tv-screen">
              <div className="tv-topbar">
                <span>AI Queue Display</span>
                <time>10:42 AM</time>
              </div>
              <div className="tv-token-row">
                <div>
                  <small>Current Token</small>
                  <strong>A102</strong>
                </div>
                <div>
                  <small>Next Token</small>
                  <strong>A103</strong>
                </div>
              </div>
              <div className="tv-person">
                <span className="person-head">A102</span>
                <span className="person-body" />
              </div>
              <div className="tv-counter-card">
                <span>Serving By: Dr. Kumar</span>
                <strong>Counter 03</strong>
              </div>
            </div>
          </div>
          <div className="tv-methods">
            {['HDMI Display Support', 'Website URL Display', 'Bluetooth / WiFi Display Support', 'Smart TV Integration'].map((method) => (
              <article className="glass-card method-card" key={method}>
                <h3>{method}</h3>
                <p>Live queue data stays synchronized with token movement and counter changes.</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section security-section">
        <div className="section-heading">
          <span>Security & Compliance</span>
          <h2>Trust controls for teams handling real customer flow</h2>
        </div>
        <div className="security-grid">
          {securityBadges.map((badge) => <span className="security-badge" key={badge}>{badge}</span>)}
        </div>
      </section>

      <section className="landing-section analytics-section">
        <div className="section-heading">
          <span>Analytics & Monitoring</span>
          <h2>Understand queue performance at a glance</h2>
        </div>
        <div className="dashboard-preview glass-card">
          <div className="chart-card">
            <h3>Queue Analytics</h3>
            <div className="bar-chart" aria-hidden="true">
              <span style={{ height: '58%' }} />
              <span style={{ height: '82%' }} />
              <span style={{ height: '46%' }} />
              <span style={{ height: '74%' }} />
              <span style={{ height: '64%' }} />
            </div>
          </div>
          <div className="chart-card">
            <h3>Wait-Time Analysis</h3>
            <div className="line-chart" aria-hidden="true" />
          </div>
          <div className="monitor-list">
            {['Counter Performance', 'Branch Performance', 'Live Activity Logs'].map((item) => (
              <div className="skeleton-row" key={item}><span>{item}</span><i /></div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section testimonials-section">
        <div className="section-heading">
          <span>Customer Stories</span>
          <h2>Designed for real service teams</h2>
        </div>
        <div className="testimonial-grid">
          {[
            ['Hospital Administrator', 'Our waiting area became easier to manage because staff can see live token movement and patients know where to go.'],
            ['Bank Manager', 'The branch team handles counters more confidently with queue history, role controls, and public displays.'],
            ['Service Center Operator', 'Calling the next token and keeping customers informed is much smoother than manual lists.']
          ].map(([role, quote]) => (
            <article className="glass-card testimonial-card" key={role}>
              <p>{quote}</p>
              <strong>{role}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section faq-section">
        <div className="section-heading">
          <span>FAQ</span>
          <h2>Answers before you start</h2>
        </div>
        <div className="faq-list">
          {faqs.map(([question, answer], index) => (
            <article className={`faq-item ${openFaq === index ? 'open' : ''}`} key={question}>
              <button type="button" onClick={() => setOpenFaq(openFaq === index ? -1 : index)}>
                <span>{question}</span>
                <b>{openFaq === index ? '-' : '+'}</b>
              </button>
              <p>{answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section cta-section">
        <div>
          <span>Start today</span>
          <h2>Ready to Modernize Your Queue Management?</h2>
        </div>
        <div className="hero-actions">
          <button type="button" className="landing-btn primary ripple" onClick={onDone}>Get Started</button>
          <button type="button" className="landing-btn secondary ripple" onClick={scrollToDemo}>Request Demo</button>
        </div>
      </section>

      <footer className="landing-footer">
        {footerLinks.map((item) => (
          <button type="button" key={item}>{item}</button>
        ))}
        <span>Produced by Callback</span>
      </footer>

      <button type="button" className="landing-top-button" onClick={scrollToTop} aria-label="Move to top">
        &uarr;
      </button>
    </main>
  );
}

export default WelcomePage;
