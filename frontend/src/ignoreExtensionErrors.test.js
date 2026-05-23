const loadErrorGuard = () => {
  jest.isolateModules(() => {
    require('./ignoreExtensionErrors');
  });
};

test('suppresses MetaMask extension connection errors', () => {
  loadErrorGuard();

  const event = new ErrorEvent('error', {
    message: 'Failed to connect to MetaMask',
    filename:
      'chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn/scripts/inpage.js',
  });
  const preventDefault = jest.spyOn(event, 'preventDefault');
  const stopImmediatePropagation = jest.spyOn(event, 'stopImmediatePropagation');

  window.dispatchEvent(event);

  expect(preventDefault).toHaveBeenCalled();
  expect(stopImmediatePropagation).toHaveBeenCalled();
});

test('does not suppress normal app errors', () => {
  loadErrorGuard();

  const event = new ErrorEvent('error', {
    message: 'Regular app error',
    filename: 'http://localhost:3000/static/js/main.js',
  });
  const preventDefault = jest.spyOn(event, 'preventDefault');
  const stopImmediatePropagation = jest.spyOn(event, 'stopImmediatePropagation');

  window.dispatchEvent(event);

  expect(preventDefault).not.toHaveBeenCalled();
  expect(stopImmediatePropagation).not.toHaveBeenCalled();
});
