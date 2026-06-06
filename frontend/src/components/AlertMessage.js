import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

function AlertMessage({ type = 'info', children, duration = 5000 }) {
  const [visible, setVisible] = useState(Boolean(children));

  useEffect(() => {
    setVisible(Boolean(children));
    if (!children) return undefined;

    const timer = window.setTimeout(() => setVisible(false), duration);
    return () => window.clearTimeout(timer);
  }, [children, duration]);

  if (!children || !visible) return null;

  return createPortal(
    <div className={`${type}-message`} role="alert" aria-live="polite">
      {children}
    </div>,
    document.body
  );
}

export default AlertMessage;
