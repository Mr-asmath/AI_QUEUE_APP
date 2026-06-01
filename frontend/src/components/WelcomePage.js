import React, { useEffect } from 'react';

function WelcomePage({ onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2200);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <section className="welcome-page" aria-label="Welcome">
      <h1>AI Queue Automation</h1>
      <div className="welcome-logo-wrap">
        <img src={`${process.env.PUBLIC_URL || ''}/image/logo.png`} alt="AI Queue Automation logo" />
      </div>
      <p>Produced by Callback</p>
    </section>
  );
}

export default WelcomePage;
