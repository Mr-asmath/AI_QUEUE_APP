import React, { useEffect, useMemo, useState } from 'react';
import { useTvDisplayData } from '../hooks/useTvDisplayData';

const announcements = [
  'Please wait for your token number.',
  'Proceed to the assigned counter when called.',
  'Keep your documents ready.',
  'Thank you for your patience.',
  'Follow staff instructions.'
];

function TVDisplayPage({ branchId, counterId }) {
  const { display, status, lastSync, refresh } = useTvDisplayData(branchId, counterId);
  const [now, setNow] = useState(new Date());
  const [autoFullscreen, setAutoFullscreen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!autoFullscreen || document.fullscreenElement) return;
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, [autoFullscreen]);

  const marquee = useMemo(() => announcements.join('   •   '), []);
  const currentToken = display?.current_token || '--';

  const openFullscreen = () => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  return (
    <main className="tv-display-page">
      <header className="tv-topbar">
        <div>
          <span className={`tv-live-dot ${status}`}></span>
          <strong>{display?.branch_name || 'AI Queue Display'}</strong>
          <small>{display?.department || 'Department'}</small>
        </div>
        <div className="tv-clock">
          <strong>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</strong>
          <small>{now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</small>
        </div>
        <div className="tv-display-actions">
          <button type="button" onClick={openFullscreen}>Full Screen</button>
          <button type="button" onClick={() => setAutoFullscreen((value) => !value)}>{autoFullscreen ? 'Auto Full On' : 'Auto Full Off'}</button>
          <button type="button" onClick={refresh}>Refresh</button>
        </div>
      </header>

      <section className="tv-token-grid">
        <article className="tv-token-card recent">
          <span>Recently Served</span>
          <strong>{display?.recent_token || '--'}</strong>
        </article>
        <article className={`tv-current-stage ${display?.changed ? 'token-change' : ''}`}>
          <div className="queue-person">
            <div className="queue-person-head"></div>
            <div className="queue-person-body">
              <strong>{currentToken}</strong>
            </div>
          </div>
          <div className="tv-serving-copy">
            <span>Serving By</span>
            <strong>{display?.service_provider || 'Service Desk'}</strong>
            <span>Counter</span>
            <strong>{display?.counter || counterId}</strong>
          </div>
        </article>
        <article className="tv-token-card next">
          <span>Next Token</span>
          <strong>{display?.next_token || '--'}</strong>
        </article>
      </section>

      <section className="tv-status-strip">
        <div>
          <span>Queue Status</span>
          <strong>{display?.status || 'Waiting'}</strong>
        </div>
        <div>
          <span>Counter Number</span>
          <strong>{display?.counter || counterId}</strong>
        </div>
        <div>
          <span>Last Sync</span>
          <strong>{lastSync || '--'}</strong>
        </div>
      </section>

      <footer className="tv-announcement">
        <span>{marquee}</span>
      </footer>
    </main>
  );
}

export default TVDisplayPage;
