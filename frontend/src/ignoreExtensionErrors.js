const METAMASK_EXTENSION_ID = 'nkbihfbeogaeaoehlefnkodbefgpgknn';

const isMetaMaskExtensionError = (value) => {
  const message = [
    value?.message,
    value?.reason?.message,
    value?.error?.message,
    value?.filename,
    value?.source,
    value?.reason?.stack,
    value?.error?.stack,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    message.includes('Failed to connect to MetaMask') ||
    message.includes(`chrome-extension://${METAMASK_EXTENSION_ID}`) ||
    message.includes(METAMASK_EXTENSION_ID)
  );
};

const suppressMetaMaskExtensionError = (event) => {
  if (!isMetaMaskExtensionError(event)) {
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();
};

window.addEventListener('error', suppressMetaMaskExtensionError, true);
window.addEventListener('unhandledrejection', suppressMetaMaskExtensionError, true);

