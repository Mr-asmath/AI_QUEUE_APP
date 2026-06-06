import React, { useMemo, useState } from 'react';

const intents = [
  { id: 'create_token', label: 'Create Token', keywords: ['create token', 'generate token', 'new token', 'issue token', 'customer token'] },
  { id: 'check_queue', label: 'Check Queue', keywords: ['check queue', 'view queue', 'queue list', 'waiting list', 'current queue'] },
  { id: 'cancel_token', label: 'Cancel Token', keywords: ['cancel token', 'delete token', 'remove token', 'void token'] },
  { id: 'call_next', label: 'Call Next Token', keywords: ['call next', 'next token', 'serve next', 'call customer'] },
  { id: 'transfer_token', label: 'Transfer Token', keywords: ['transfer token', 'move token', 'different counter', 'change counter'] },
  { id: 'queue_status', label: 'Queue Status', keywords: ['queue status', 'waiting time', 'how many waiting', 'queue progress'] },
  { id: 'tv_display', label: 'TV Display', keywords: ['tv display', 'display setup', 'token screen', 'public display', 'cast'] },
  { id: 'analytics_help', label: 'Analytics', keywords: ['analytics', 'reports', 'dashboard', 'metrics', 'statistics'] },
  { id: 'login_help', label: 'Login Help', keywords: ['login', 'password', 'forgot password', 'cannot access', 'sign in'] },
  { id: 'branch_management', label: 'Branch Management', keywords: ['branch', 'branches', 'branch management'] },
  { id: 'counter_management', label: 'Counter Management', keywords: ['counter', 'counters', 'counter management'] },
  { id: 'feedback', label: 'Feedback', keywords: ['feedback', 'rating', 'complaint', 'customer satisfaction'] },
  { id: 'support', label: 'Support', keywords: ['support', 'help', 'issue', 'problem', 'bug'] },
];

const helpFlows = {
  create_token: {
    title: 'Create Token',
    summary: 'Generate a new customer token from the Token section.',
    steps: ['Open the Token section.', 'Select the requested service.', 'Enter customer information.', 'Click Generate Token.', 'Save or print the token.'],
    details: 'Confirm the branch, service, and counter availability before generating the token.',
  },
  check_queue: {
    title: 'Check Queue',
    summary: 'Review waiting and active tokens from the queue dashboard.',
    steps: ['Open the Queue section.', 'Choose branch and service filters.', 'Review waiting, serving, skipped, and completed tokens.', 'Use search for a specific token.', 'Refresh if live updates are paused.'],
    details: 'Queue status can differ by branch, service, and counter assignment.',
  },
  cancel_token: {
    title: 'Cancel Token',
    summary: 'Cancel a token that should no longer be served.',
    steps: ['Open token details from the queue list.', 'Confirm token number and customer information.', 'Click Cancel Token.', 'Choose a cancellation reason if required.', 'Confirm the cancellation.'],
    details: 'Cancelled tokens should remain visible in history for audit and reporting.',
  },
  call_next: {
    title: 'Call Next Token',
    summary: 'Call the next waiting token for the assigned counter.',
    steps: ['Open the Counter dashboard.', 'Confirm branch, service, and counter.', 'Click Call Next.', 'Wait for the token to appear as serving.', 'Mark skipped if the customer is absent.'],
    details: 'Only counters assigned to the selected service should call tokens from that queue.',
  },
  transfer_token: {
    title: 'Transfer Token',
    summary: 'Move a token to another service or counter.',
    steps: ['Open active token details.', 'Click Transfer.', 'Select the target service or counter.', 'Add a transfer note if needed.', 'Confirm the transfer.'],
    details: 'Transfers help when a customer selected the wrong service or needs specialist handling.',
  },
  queue_status: {
    title: 'Queue Status',
    summary: 'Understand queue load, waiting count, and service progress.',
    steps: ['Open the queue dashboard.', 'Select branch and service.', 'Check waiting count and currently serving token.', 'Review estimated wait time if enabled.', 'Use analytics for trends.'],
    details: 'Live status depends on active token updates from operators and service providers.',
  },
  tv_display: {
    title: 'TV Display Setup',
    summary: 'Configure public token display screens.',
    steps: ['Open TV Cast settings.', 'Select branch and display layout.', 'Choose counters or services to show.', 'Open the display URL on the TV browser.', 'Test token announcements.'],
    details: 'Use HDMI mode or website URL display for reliable public screens.',
  },
  analytics_help: {
    title: 'Analytics Help',
    summary: 'Use analytics to understand service performance.',
    steps: ['Open Analytics.', 'Select the date range.', 'Filter by branch, service, or counter.', 'Review wait time, service time, skipped tokens, and throughput.', 'Export reports if needed.'],
    details: 'Analytics can reveal peak hours, staff utilization, and service bottlenecks.',
  },
  login_help: {
    title: 'Login Help',
    summary: 'Resolve common sign-in and access issues.',
    steps: ['Confirm email or username.', 'Check assigned role and branch access.', 'Use Forgot Password if needed.', 'Clear browser cache if the page loops.', 'Contact an administrator if the account is disabled.'],
    details: 'For production, use verified email and phone details for safer account recovery.',
  },
  branch_management: {
    title: 'Branch Management',
    summary: 'Create and maintain branch records.',
    steps: ['Open Branch Management.', 'Click Add Branch or edit an existing branch.', 'Enter branch name, code, location, and contact details.', 'Assign services and operating hours.', 'Save and verify the branch appears in filters.'],
    details: 'Branch configuration affects queue routing, counters, users, and reports.',
  },
  counter_management: {
    title: 'Counter Management',
    summary: 'Create counters and assign services.',
    steps: ['Open Counter Management.', 'Choose the branch.', 'Click Add Counter or edit an existing counter.', 'Assign supported services and counter users.', 'Save and test by calling a token.'],
    details: 'Counters should be named clearly so staff and display screens show consistent information.',
  },
  feedback: {
    title: 'Feedback',
    summary: 'Collect and review customer feedback.',
    steps: ['Open Feedback or Customer Satisfaction.', 'Select branch and date range.', 'Review ratings, comments, and complaint categories.', 'Follow up on low ratings.', 'Use reports to identify recurring issues.'],
    details: 'Feedback helps improve service speed and staff response quality.',
  },
  support: {
    title: 'Contact Support',
    summary: 'Escalate an issue to the support team.',
    steps: ['Collect the issue description.', 'Note branch, user, token number, and time.', 'Capture a screenshot if possible.', 'Send details to support.', 'Track the response.'],
    details: 'For urgent production issues, include logs and exact reproduction steps.',
  },
};

const roleQuickActions = {
  main_admin: ['Branch Management', 'Analytics', 'TV Display', 'Support'],
  industry_admin: ['Branch Management', 'Counter Management', 'Analytics', 'Feedback'],
  queue_operator: ['Create Token', 'Check Queue', 'Call Next Token', 'Cancel Token'],
  doctor: ['Call Next Token', 'Queue Status', 'Transfer Token', 'Feedback'],
  service_provider: ['Call Next Token', 'Queue Status', 'Transfer Token', 'Feedback'],
  user: ['Create Token', 'Queue Status', 'Login Help', 'Feedback'],
};

function detectIntent(message) {
  const normalized = message.toLowerCase().trim();
  let bestIntent = null;
  let bestScore = 0;

  intents.forEach((intent) => {
    const score = intent.keywords.reduce((total, keyword) => (
      normalized.includes(keyword) ? total + keyword.length : total
    ), normalized.includes(intent.label.toLowerCase()) ? intent.label.length : 0);

    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent.id;
    }
  });

  return bestIntent || 'support';
}

function buildReply(intentId) {
  const flow = helpFlows[intentId] || helpFlows.support;
  return {
    from: 'bot',
    title: flow.title,
    text: flow.summary,
    steps: flow.steps,
    details: flow.details,
  };
}

function GuideChatbot({ user, currentView }) {
  const [isOpen, setIsOpen] = useState(() => localStorage.getItem('aiQueueGuideOpen') === 'true');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      from: 'bot',
      title: 'AI Queue Guide',
      text: 'Hi, I can help with tokens, queue status, counters, TV display, analytics, login, and support.',
      steps: [],
      details: 'Ask a question or choose a quick help topic.',
    },
  ]);

  const quickActions = useMemo(() => {
    const role = user?.role || 'user';
    return roleQuickActions[role] || roleQuickActions.user;
  }, [user]);

  const toggleOpen = () => {
    setIsOpen((value) => {
      localStorage.setItem('aiQueueGuideOpen', String(!value));
      return !value;
    });
  };

  const sendMessage = (messageText = input) => {
    const trimmed = messageText.trim();
    if (!trimmed) return;

    const intentId = detectIntent(trimmed);
    setMessages((items) => [
      ...items,
      { from: 'user', text: trimmed },
      buildReply(intentId),
    ]);
    setInput('');
  };

  return (
    <div className={`guide-chatbot ${isOpen ? 'is-open' : ''}`} data-view={currentView}>
      {isOpen && (
        <section className="guide-chatbot-panel" aria-label="AI Queue guide assistant">
          <header className="guide-chatbot-header">
            <div>
              <span className="guide-chatbot-kicker">Guide Assistant</span>
              <h2>AI Queue Help</h2>
            </div>
            <button type="button" className="guide-chatbot-close" onClick={toggleOpen} aria-label="Close guide assistant">
              x
            </button>
          </header>

          <div className="guide-chatbot-body">
            {messages.map((message, index) => (
              <article className={`guide-message ${message.from}`} key={`${message.from}-${index}`}>
                {message.title && <strong>{message.title}</strong>}
                <p>{message.text}</p>
                {message.steps?.length > 0 && (
                  <ol>
                    {message.steps.map((step) => <li key={step}>{step}</li>)}
                  </ol>
                )}
                {message.details && <small>{message.details}</small>}
              </article>
            ))}
          </div>

          <div className="guide-chatbot-quick-actions" aria-label="Quick help topics">
            {quickActions.map((action) => (
              <button type="button" key={action} onClick={() => sendMessage(action)}>
                {action}
              </button>
            ))}
          </div>

          <form
            className="guide-chatbot-input"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about this app"
              aria-label="Ask AI Queue guide"
            />
            <button type="submit">Send</button>
          </form>
        </section>
      )}

      <button type="button" className="guide-chatbot-toggle" onClick={toggleOpen} aria-label="Open AI Queue guide assistant">
        <span className="material-icons" aria-hidden="true">chat_bubble</span>
      </button>
    </div>
  );
}

export default GuideChatbot;
