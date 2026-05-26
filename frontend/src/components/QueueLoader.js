import React, { useEffect, useState } from 'react';

function QueueLoader({ message = 'QUEUE LOADING', overlay = false }) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((current) => (current.length >= 3 ? '' : `${current}.`));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={overlay ? 'queue-loader-overlay' : 'queue-loader-shell'}>
      <div className="queue-loader-wrapper">
        <div className="queue-loading-frame">
          <div className="queue-loader-area">
            {[0, 1, 2, 3, 4].map((item) => (
              <div className="queue-loader-person" key={item}>
                <div className="queue-loader-head"></div>
                <div className="queue-loader-body"></div>
              </div>
            ))}
          </div>
        </div>
        <div className="queue-loading-text">{message}{dots}</div>
      </div>
    </div>
  );
}

export default QueueLoader;
