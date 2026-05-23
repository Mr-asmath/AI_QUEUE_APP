import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      status: 401,
      json: () => Promise.resolve({ success: false }),
    })
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('renders the login screen', async () => {
  render(<App />);

  expect(await screen.findByText('AI Queue Automation')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  expect(screen.getByText(/demo accounts/i)).toBeInTheDocument();
});

test('switches to the access request screen', async () => {
  render(<App />);

  await userEvent.click(await screen.findByRole('button', { name: /open request form/i }));

  expect(screen.getByText('Access Request')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^user account$/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /industry admin request/i })).toBeInTheDocument();
});
