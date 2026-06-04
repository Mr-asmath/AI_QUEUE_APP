/* app.js - AI Queue Redesign Logic */

// --- BroadcastChannel for Real-Time Sync between Tabs ---
const syncChannel = new BroadcastChannel('ai_queue_sync_channel');

// --- Global Application State ---
let state = {
  currentUser: null,
  activeView: 'landing', // landing, login, register, reset-password, dashboard, profile, tv-display
  themeMode: 'dark',
  branches: [],
  activeBranchId: null,
  activeCounterId: "03",
  tokens: [],
  logs: [],
  theme: {
    theme_1: '#00e5ff',
    theme_2: '#e025ff',
    font_color_1: '#f3f4fd',
    font_color_2: '#9fa2c4',
    mode: 'dark'
  }
};

// --- Initial Mock Data ---
const DEFAULT_BRANCHES = [
  {
    id: "1",
    name: "City Health General Hospital",
    details: "Main branch clinical queue management system.",
    branch_type: "hospital",
    area: "Downtown",
    city: "San Francisco",
    state: "CA",
    pincode: "94103",
    latitude: "37.7749",
    longitude: "-122.4194",
    dashboard_config: {
      service_provider: {
        display_user_details: true,
        display_previous_details: true,
        display_next_details: true,
        display_current_details: true,
        display_suggestion_boxes: true,
        display_search_items: true,
        display_cash_price: true,
        display_transactions: true,
        ai_suggestion: true,
        suggestion_boxes: ["Diagnosis Notes", "Special Precautions"],
        search_items: [
          { name: "Consultation Fee", price: 50 },
          { name: "Blood Test Profile", price: 120 },
          { name: "X-Ray Chest", price: 85 },
          { name: "ECG Monitoring", price: 60 }
        ]
      },
      queue_operator: {
        can_edit_user_details: true,
        can_allocate_provider: true,
        display_user_details: true,
        display_previous_details: true,
        display_suggestions: true
      },
      user: {
        display_previous_suggestions: true,
        display_current_suggestions: true,
        display_current_queue_count: true,
        allow_generate_token: true,
        allow_reject_token: true,
        display_cash_price: true,
        display_transactions: true,
        display_operator_contact: true,
        display_provider_contact: true,
        allow_emergency_queue: true
      }
    },
    user_schema: [
      { key: "fullname", type: "text", required: true },
      { key: "age", type: "number", required: true },
      { key: "symptoms", type: "textarea", required: false }
    ]
  },
  {
    id: "2",
    name: "Capital Trust Bank",
    details: "Premium wealth management client reception queue.",
    branch_type: "bank",
    area: "Financial District",
    city: "San Francisco",
    state: "CA",
    pincode: "94104",
    latitude: "37.7894",
    longitude: "-122.4014",
    dashboard_config: {
      service_provider: {
        display_user_details: true,
        display_previous_details: false,
        display_next_details: true,
        display_current_details: true,
        display_suggestion_boxes: true,
        display_search_items: false,
        display_cash_price: false,
        display_transactions: false,
        ai_suggestion: false,
        suggestion_boxes: ["Financial Needs Notes"],
        search_items: []
      },
      queue_operator: {
        can_edit_user_details: false,
        can_allocate_provider: true,
        display_user_details: true,
        display_previous_details: false,
        display_suggestions: false
      },
      user: {
        display_previous_suggestions: false,
        display_current_suggestions: false,
        display_current_queue_count: true,
        allow_generate_token: true,
        allow_reject_token: false,
        display_cash_price: false,
        display_transactions: false,
        display_operator_contact: false,
        display_provider_contact: false,
        allow_emergency_queue: false
      }
    },
    user_schema: [
      { key: "fullname", type: "text", required: true },
      { key: "account_number", type: "text", required: true },
      { key: "service_requested", type: "select", required: true }
    ]
  }
];

const DEFAULT_TOKENS = [
  { id: "token-1", branchId: "1", number: "A101", name: "David Chen", details: { fullname: "David Chen", age: 34, symptoms: "Persistent dry cough, mild fever for 2 days" }, status: "served", counter: "01", provider: "Dr. Kumar", time: "10:15 AM", waitingTime: 8, medicines: ["Paracetamol 500mg", "Amoxicillin 500mg"], note: "Chest clear. Advised rest." },
  { id: "token-2", branchId: "1", number: "A102", name: "Alice Jenkins", details: { fullname: "Alice Jenkins", age: 29, symptoms: "Acute throat pain and difficulty swallowing" }, status: "serving", counter: "03", provider: "Dr. Kumar", time: "10:42 AM", waitingTime: 12, medicines: [], note: "" },
  { id: "token-3", branchId: "1", number: "A103", name: "Robert Miller", details: { fullname: "Robert Miller", age: 52, symptoms: "High blood pressure monitoring checkup" }, status: "waiting", counter: "", provider: "", time: "10:48 AM", waitingTime: 0, medicines: [], note: "" },
  { id: "token-4", branchId: "1", number: "A104", name: "Sophia Martinez", details: { fullname: "Sophia Martinez", age: 41, symptoms: "Allergy symptoms, sneezing and red eyes" }, status: "waiting", counter: "", provider: "", time: "10:52 AM", waitingTime: 0, medicines: [], note: "" },
  { id: "token-5", branchId: "1", number: "A105", name: "Marcus Thompson", details: { fullname: "Marcus Thompson", age: 60, symptoms: "Chronic lower back stiffness" }, status: "waiting", counter: "", provider: "", time: "10:55 AM", waitingTime: 0, medicines: [], note: "" },
  
  { id: "token-b1", branchId: "2", number: "B201", name: "Emily Watson", details: { fullname: "Emily Watson", account_number: "987654321", service_requested: "Cash Withdrawal" }, status: "served", counter: "02", provider: "Counter Desk A", time: "10:30 AM", waitingTime: 5, medicines: [], note: "Processed deposit transaction successfully." },
  { id: "token-b2", branchId: "2", number: "B202", name: "James Anderson", details: { fullname: "James Anderson", account_number: "112233445", service_requested: "Account Query" }, status: "serving", counter: "02", provider: "Counter Desk A", time: "10:45 AM", waitingTime: 10, medicines: [], note: "" },
  { id: "token-b3", branchId: "2", number: "B203", name: "Victoria Scott", details: { fullname: "Victoria Scott", account_number: "556677889", service_requested: "Loan Consultation" }, status: "waiting", counter: "", provider: "", time: "10:50 AM", waitingTime: 0, medicines: [], note: "" }
];

const DEFAULT_USERS = [
  { email: "admin@aiqueue.com", password: "password", fullname: "Alex Rivers", role: "main_admin", theme: { mode: 'dark', theme_1: '#00e5ff', theme_2: '#e025ff' } },
  { email: "operator@aiqueue.com", password: "password", fullname: "Sarah Connor", role: "queue_operator", theme: { mode: 'dark', theme_1: '#00e5ff', theme_2: '#e025ff' } },
  { email: "doctor@aiqueue.com", password: "password", fullname: "Dr. Kumar", role: "doctor", theme: { mode: 'dark', theme_1: '#00e5ff', theme_2: '#e025ff' } }
];

const QUICK_MEDICINES = {
  Analgesics: ["Paracetamol 500mg", "Ibuprofen 400mg", "Tramadol 50mg", "Aspirin 325mg"],
  Antibiotics: ["Amoxicillin 500mg", "Azithromycin 250mg", "Ciprofloxacin 500mg", "Doxycycline 100mg"],
  Antivirals: ["Oseltamivir 75mg", "Acyclovir 400mg"],
  Cardiovascular: ["Atorvastatin 20mg", "Metoprolol 50mg", "Amlodipine 5mg", "Lisinopril 10mg"],
  Gastrointestinal: ["Omeprazole 20mg", "Ranitidine 150mg", "Metoclopramide 10mg"]
};

// --- Web Audio API Queue Call Synthesizer ---
function playQueueChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    
    // Synthesize double ding-dong chime (Electronic Bell)
    // 1st Ding
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(554.37, now); // C#5
    osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.7);

    // 2nd Dong (delayed by 0.32s)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(440.00, now + 0.32); // A4
    osc2.frequency.exponentialRampToValueAtTime(554.37, now + 0.44); // C#5
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(0.25, now + 0.32);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.32);
    osc2.stop(now + 1.2);
  } catch (e) {
    console.error("Audio Context playback blocked/failed:", e);
  }
}

// --- Local Storage Accessors ---
function loadState() {
  if (!localStorage.getItem('ai_queue_users')) {
    localStorage.setItem('ai_queue_users', JSON.stringify(DEFAULT_USERS));
  }
  if (!localStorage.getItem('ai_queue_branches')) {
    localStorage.setItem('ai_queue_branches', JSON.stringify(DEFAULT_BRANCHES));
  }
  if (!localStorage.getItem('ai_queue_tokens')) {
    localStorage.setItem('ai_queue_tokens', JSON.stringify(DEFAULT_TOKENS));
  }
  if (!localStorage.getItem('ai_queue_logs')) {
    localStorage.setItem('ai_queue_logs', JSON.stringify([]));
  }

  state.branches = JSON.parse(localStorage.getItem('ai_queue_branches'));
  state.tokens = JSON.parse(localStorage.getItem('ai_queue_tokens'));
  state.logs = JSON.parse(localStorage.getItem('ai_queue_logs'));
  
  const activeUser = sessionStorage.getItem('ai_queue_active_user');
  if (activeUser) {
    state.currentUser = JSON.parse(activeUser);
    applyTheme(state.currentUser.theme);
  } else {
    applyTheme(state.theme);
  }

  if (!state.activeBranchId && state.branches.length > 0) {
    state.activeBranchId = state.branches[0].id;
  }
}

function saveState() {
  localStorage.setItem('ai_queue_branches', JSON.stringify(state.branches));
  localStorage.setItem('ai_queue_tokens', JSON.stringify(state.tokens));
  localStorage.setItem('ai_queue_logs', JSON.stringify(state.logs));
  if (state.currentUser) {
    sessionStorage.setItem('ai_queue_active_user', JSON.stringify(state.currentUser));
    
    // Update theme config in localStorage user array as well
    const users = JSON.parse(localStorage.getItem('ai_queue_users')) || [];
    const idx = users.findIndex(u => u.email === state.currentUser.email);
    if (idx !== -1) {
      users[idx].theme = state.currentUser.theme;
      localStorage.setItem('ai_queue_users', JSON.stringify(users));
    }
  }
}

function addLog(message) {
  const logItem = {
    timestamp: new Date().toLocaleTimeString(),
    message: message
  };
  state.logs.unshift(logItem);
  if (state.logs.length > 100) state.logs.pop();
  saveState();
}

function applyTheme(themeConfig) {
  if (!themeConfig) return;
  const root = document.documentElement;
  state.themeMode = themeConfig.mode || 'dark';
  root.setAttribute('data-theme-mode', state.themeMode);
  
  if (themeConfig.theme_1) root.style.setProperty('--theme-primary', themeConfig.theme_1);
  if (themeConfig.theme_2) root.style.setProperty('--theme-secondary', themeConfig.theme_2);
  if (themeConfig.font_color_1) root.style.setProperty('--font-color-primary', themeConfig.font_color_1);
  if (themeConfig.font_color_2) root.style.setProperty('--font-color-secondary', themeConfig.font_color_2);
}

// --- Sync State between tabs on BroadcastChannel ---
syncChannel.onmessage = (event) => {
  if (event.data === 'sync_required') {
    loadState();
    renderActiveView();
    if (state.activeView === 'tv-display') {
      triggerTokenCallFlashAnimation();
    }
  }
};

function notifySync() {
  syncChannel.postMessage('sync_required');
}

function triggerTokenCallFlashAnimation() {
  const currentStageCard = document.querySelector('.tv-current-stage');
  if (currentStageCard) {
    currentStageCard.classList.remove('token-change');
    // Trigger reflow
    void currentStageCard.offsetWidth;
    currentStageCard.classList.add('token-change');
    playQueueChime();
  }
}

// --- Router and View Manager ---
function handleNavigation() {
  const hash = window.location.hash;
  const urlParams = new URLSearchParams(window.location.search);
  
  // Check TV display query parameters: ?view=tv-display&branchId=X&counterId=Y
  if (urlParams.get('view') === 'tv-display') {
    state.activeView = 'tv-display';
    state.activeBranchId = urlParams.get('branchId') || "1";
    state.activeCounterId = urlParams.get('counterId') || "03";
    renderActiveView();
    return;
  }

  // Regular Router via Hash
  if (hash === '#/login') {
    state.activeView = 'login';
  } else if (hash === '#/register') {
    state.activeView = 'register';
  } else if (hash === '#/reset-password') {
    state.activeView = 'reset-password';
  } else if (hash === '#/profile' && state.currentUser) {
    state.activeView = 'profile';
  } else if (hash === '#/dashboard' && state.currentUser) {
    state.activeView = 'dashboard';
  } else {
    // Default: Check session or go to landing page
    if (state.currentUser) {
      state.activeView = 'dashboard';
      window.location.hash = '#/dashboard';
    } else {
      state.activeView = 'landing';
      window.location.hash = '#/';
    }
  }
  renderActiveView();
}

// Listen for hash changes
window.addEventListener('hashchange', handleNavigation);

// --- Dialog / Consent Overlays ---
function showTermsModal() {
  const overlay = document.createElement('div');
  overlay.className = 'terms-modal-overlay';
  overlay.innerHTML = `
    <div class="terms-modal">
      <button class="terms-modal-close" onclick="this.closest('.terms-modal-overlay').remove()">&times;</button>
      <h3>Terms of Service & Privacy Statement</h3>
      <div class="terms-modal-body">
1. Acceptance of Terms
By accessing or using the AI Queue management platform, you agree to comply with and be bound by these Terms of Service. If you do not agree, please do not use the application.

2. Description of Service
AI Queue is a demo queue-routing and token visualization tool. It utilizes simulated data, local storage cache systems, and real-time page synchronization methods to provide visual workflows for service administrators, queue operators, and public customer displays.

3. Privacy & Clinical Safety
When using doctor notes, diagnostic tools, and AI recommendation features:
- All generated advice, summaries, and medication recommendations are simulated.
- No clinical or financial transactions represent real legal accounts.
- Data remains exclusively inside your browser's LocalStorage database. No customer details are uploaded to remote centralized databases.
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

// --- Diagnosis Suggestion (Mock AI engine) ---
function generateAIDiagnosis(symptomsText) {
  if (!symptomsText) return "No symptoms provided. Please write some symptoms in the input field to generate AI suggestions.";
  
  const text = symptomsText.toLowerCase();
  let diagnosis = "General Fatigue/Exhaustion";
  let description = "Patient presents symptoms that suggest general tiredness. Recommend balanced rest, hydration, and regular temperature checks.";
  let medicines = ["Paracetamol 500mg"];
  
  if (text.includes("cough") || text.includes("fever") || text.includes("throat")) {
    diagnosis = "Acute Upper Respiratory Infection";
    description = "Mild lung and throat inflammation. Recommend throat lozenges, warm steam inhalation, and monitoring temperature.";
    medicines = ["Paracetamol 500mg", "Amoxicillin 500mg"];
  } else if (text.includes("pressure") || text.includes("hypertension") || text.includes("dizzy")) {
    diagnosis = "Essential Hypertension Signalling";
    description = "Elevated arterial blood pressure. Advise sodium intake reduction, mild cardiovascular exercises, and regular daily blood pressure charts.";
    medicines = ["Amlodipine 5mg", "Metoprolol 50mg"];
  } else if (text.includes("back") || text.includes("joint") || text.includes("pain")) {
    diagnosis = "Lumbar Muscle Strain";
    description = "Tension or spasm in the lower back muscle group. Suggest heat therapy packs, light stretches, and avoiding lifting heavy loads.";
    medicines = ["Ibuprofen 400mg"];
  } else if (text.includes("allergy") || text.includes("sneeze") || text.includes("eyes")) {
    diagnosis = "Seasonal Allergic Rhinitis";
    description = "Histamine reaction to environmental allergens. Recommend avoiding active dust, pollen areas and drinking plenty of warm fluids.";
    medicines = ["Aspirin 325mg"];
  }
  
  return {
    diagnosis,
    description,
    medicines
  };
}

// --- Render active layout ---
function renderActiveView() {
  const root = document.getElementById('root');
  if (!root) return;
  
  // Cleanup any running landing page animation
  if (liveQueueAnimInterval) {
    clearInterval(liveQueueAnimInterval);
    liveQueueAnimInterval = null;
  }
  
  root.innerHTML = '';
  
  // Renders the TV Cast screen directly without app header and navigation
  if (state.activeView === 'tv-display') {
    renderTVDisplayPage(root);
    return;
  }
  
  // Render general layout wrapper
  const container = document.createElement('div');
  container.className = 'App';
  
  // Render App Navigation header
  const header = renderAppHeader();
  container.appendChild(header);
  
  // Main view content wrapper
  const main = document.createElement('main');
  main.className = 'app-main';
  
  // Render active route screen
  switch (state.activeView) {
    case 'landing':
      renderLandingPage(main);
      break;
    case 'login':
      renderLoginPage(main);
      break;
    case 'register':
      renderRegisterPage(main);
      break;
    case 'reset-password':
      renderResetPasswordPage(main);
      break;
    case 'dashboard':
      renderDashboardPage(main);
      break;
    case 'profile':
      renderProfilePage(main);
      break;
  }
  
  container.appendChild(main);
  
  // Render bottom floating navigation if logged in
  if (state.currentUser) {
    const bottomNav = renderBottomNav();
    container.appendChild(bottomNav);
  }
  
  root.appendChild(container);
  
  // Add micro-animations trigger
  document.querySelectorAll('.glass-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });
}

// --- Render Header ---
function renderAppHeader() {
  const header = document.createElement('header');
  header.className = 'navbar';
  
  // Brand Logo and Title
  const brand = document.createElement('div');
  brand.className = 'nav-brand';
  brand.style.cursor = 'pointer';
  brand.onclick = () => {
    if (state.currentUser) {
      window.location.hash = '#/dashboard';
    } else {
      window.location.hash = '#/';
    }
  };
  
  brand.innerHTML = `
    <div class="brand-icon">
      <img src="image/logo.png" class="brand-image" alt="AI Queue Logo">
    </div>
    <span class="brand-name">AI Queue</span>
  `;
  header.appendChild(brand);
  
  // Navigation Menus
  if (state.currentUser) {
    const menu = document.createElement('div');
    menu.className = 'nav-menu';
    
    const dashBtn = document.createElement('button');
    dashBtn.textContent = 'Dashboard';
    dashBtn.className = state.activeView === 'dashboard' ? 'active' : '';
    dashBtn.onclick = () => window.location.hash = '#/dashboard';
    menu.appendChild(dashBtn);
    
    const profBtn = document.createElement('button');
    profBtn.textContent = 'Settings & Profile';
    profBtn.className = state.activeView === 'profile' ? 'active' : '';
    profBtn.onclick = () => window.location.hash = '#/profile';
    menu.appendChild(profBtn);
    
    header.appendChild(menu);
    
    // User profile avatar chip
    const userChip = document.createElement('div');
    userChip.className = 'profile-chip';
    userChip.onclick = () => window.location.hash = '#/profile';
    
    const initial = state.currentUser.fullname ? state.currentUser.fullname.charAt(0).toUpperCase() : 'U';
    userChip.innerHTML = `
      <div class="profile-avatar">${initial}</div>
      <div style="text-align: left;">
        <div class="user-name">${state.currentUser.fullname}</div>
        <div class="user-role">${state.currentUser.role.replace('_', ' ')}</div>
      </div>
    `;
    header.appendChild(userChip);
  } else {
    // Actions for guests
    const actionDiv = document.createElement('div');
    actionDiv.className = 'nav-user';
    
    if (state.activeView !== 'landing') {
      const homeBtn = document.createElement('button');
      homeBtn.textContent = 'Home';
      homeBtn.className = 'secondary-btn';
      homeBtn.onclick = () => window.location.hash = '#/';
      actionDiv.appendChild(homeBtn);
    }
    
    const loginBtn = document.createElement('button');
    loginBtn.textContent = 'Get Started';
    loginBtn.onclick = () => window.location.hash = '#/login';
    actionDiv.appendChild(loginBtn);
    
    header.appendChild(actionDiv);
  }
  
  return header;
}

// --- Render Bottom Float Navigation ---
function renderBottomNav() {
  const nav = document.createElement('nav');
  nav.className = 'app-bottom-nav';
  
  const items = [
    { label: 'Home', icon: 'home', hash: '#/dashboard' },
    { label: 'TV Cast', icon: 'tv', action: openTVCastWindow },
    { label: 'Profile', icon: 'person', hash: '#/profile' },
    { label: 'Logout', icon: 'logout', action: handleLogout }
  ];
  
  items.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'bottom-nav-item';
    if (item.hash && window.location.hash === item.hash) {
      btn.classList.add('active');
    }
    
    // Using simple Unicode characters or text since material icons aren't standard local assets
    let iconChar = '•';
    if (item.icon === 'home') iconChar = '🏠';
    if (item.icon === 'tv') iconChar = '📺';
    if (item.icon === 'person') iconChar = '👤';
    if (item.icon === 'logout') iconChar = '🚪';

    btn.innerHTML = `
      <span style="font-size: 1.3rem;">${iconChar}</span>
      <span>${item.label}</span>
    `;
    
    btn.onclick = () => {
      if (item.hash) {
        window.location.hash = item.hash;
      } else if (item.action) {
        item.action();
      }
    };
    nav.appendChild(btn);
  });
  
  return nav;
}

function openTVCastWindow() {
  const url = `index.html?view=tv-display&branchId=${state.activeBranchId}&counterId=${state.activeCounterId}`;
  window.open(url, '_blank', 'width=1200,height=720');
  addLog(`Opened public TV Display Cast in new window`);
}

function handleLogout() {
  sessionStorage.removeItem('ai_queue_active_user');
  state.currentUser = null;
  addLog("User logged out");
  window.location.hash = '#/login';
}

// --- Render View: Landing Page ---
function renderLandingPage(parent) {
  const container = document.createElement('div');
  container.className = 'welcome-page landing-page';
  
  // Hero section
  container.innerHTML = `
    <div class="landing-glow landing-glow-one"></div>
    <div class="landing-glow landing-glow-two"></div>
    
    <section class="landing-hero">
      <div class="hero-grid">
        <div class="hero-copy">
          <span class="hero-kicker">Intelligent queue automation</span>
          <h1>AI Queue Management System</h1>
          <p class="hero-subtitle">Reduce waiting times, manage service tokens, and synchronize client flows in real-time.</p>
          <p class="hero-description">An enterprise-level AI-powered SaaS queuing platform designed for hospitals, banks, universities, clinics, salons, and public government desks.</p>
          
          <div class="hero-actions">
            <button type="button" class="primary" onclick="window.location.hash='#/login'">Get Started Now</button>
            <button type="button" class="secondary-btn" onclick="document.getElementById('tv-preview-anchor').scrollIntoView({behavior: 'smooth'})">View Live Demo</button>
          </div>
        </div>
        
        <div class="hero-visual">
          <div class="ai-orbit">
            <span></span>
            <span></span>
            <span></span>
          </div>
          
          <div class="queue-stage">
            <div class="queue-header">
              <span>Live Queue Monitoring</span>
              <span class="queue-live-badge"><i class="live-pulse-dot"></i> LIVE</span>
            </div>
            <div id="live-queue-anim-box" class="queue-animation-container">
              <!-- Animated tokens will be injected here by JS -->
            </div>
            <div class="queue-conveyor-track">
              <div class="conveyor-belt-line"></div>
              <i></i><i></i><i></i><i></i><i></i>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Product Introduction Section -->
    <section class="landing-section">
      <div class="section-heading">
        <span>Overview</span>
        <h2>What is AI Queue?</h2>
        <p>A comprehensive token routing and analytics ecosystem that replaces outdated physical paper slips with smart displays and diagnostic panels.</p>
      </div>
      
      <div class="intro-cards">
        <article class="glass-card intro-card">
          <div class="card-icon">TG</div>
          <h3>Automate Tokens</h3>
          <p>Instantly issue digital and print-ready tokens based on service categorization.</p>
        </article>
        
        <article class="glass-card intro-card">
          <div class="card-icon">MC</div>
          <h3>Monitor Counters</h3>
          <p>Staff operators and providers manage patient cards and workflows synchronously.</p>
        </article>
        
        <article class="glass-card intro-card">
          <div class="card-icon">AI</div>
          <h3>AI-Powered Analytics</h3>
          <p>Generate clinical summaries, track customer wait metrics, and optimize personnel.</p>
        </article>
      </div>
    </section>

    <!-- TV Display Preview Section -->
    <section class="landing-section" id="tv-preview-anchor">
      <div class="section-heading">
        <span>Queue Cast display</span>
        <h2>External Public Screen Mode</h2>
        <p>Broadcast real-time token announcements on local monitors or smart TV displays.</p>
      </div>
      
      <div class="tv-layout">
        <div class="tv-preview">
          <div class="tv-screen">
            <div class="tv-topbar">
              <span>📺 Live Clinic Queue</span>
              <span>10:45 AM</span>
            </div>
            <div class="tv-token-row">
              <div>
                <small>Now Serving</small>
                <strong style="color: #10b981;">A102</strong>
              </div>
              <div>
                <small>Next Token</small>
                <strong style="color: #c084fc;">A103</strong>
              </div>
            </div>
            <div class="tv-person">
              <span class="person-head">A102</span>
              <span class="person-body"></span>
            </div>
            <div class="tv-counter-card">
              <span>Doctor Assignment: Dr. Kumar</span>
              <strong>Counter 03</strong>
            </div>
          </div>
        </div>
        
        <div class="tv-methods">
          <article class="glass-card method-card">
            <h3>Full-Screen Cast Link</h3>
            <p>Runs on any smart TV or HDMI monitor browser connected directly or via local network.</p>
          </article>
          <article class="glass-card method-card">
            <h3>Instant Synchronization</h3>
            <p>Updates, glows, and synthesizes audio chimes automatically when operators call next.</p>
          </article>
        </div>
      </div>
    </section>

    <!-- Feature Grid Section -->
    <section class="landing-section">
      <div class="section-heading">
        <span>SaaS Features</span>
        <h2>Platform Operations Capabilities</h2>
      </div>
      
      <div class="feature-grid">
        <article class="glass-card feature-card">
          <div class="card-icon">ST</div>
          <h3>Smart Token Routing</h3>
          <p>Route visitors based on service request type, optimizing queue speed.</p>
        </article>
        
        <article class="glass-card feature-card">
          <div class="card-icon">AD</div>
          <h3>Analytics Dashboard</h3>
          <p>Track branch capacity, wait duration, counter performance, and client history.</p>
        </article>
        
        <article class="glass-card feature-card">
          <div class="card-icon">RB</div>
          <h3>Role-Based Access</h3>
          <p>Separate views for System Admins, Counter Operators, and Doctors / Service Providers.</p>
        </article>

        <article class="glass-card feature-card">
          <div class="card-icon">GC</div>
          <h3>GDPR & HIPAA Ready</h3>
          <p>Full support for client privacy, data control settings, consent forms, and audit logs.</p>
        </article>

        <article class="glass-card feature-card">
          <div class="card-icon">AC</div>
          <h3>Audio Chime Alerts</h3>
          <p>Plays a notification alert tone inside waiting rooms when new tokens are called.</p>
        </article>

        <article class="glass-card feature-card">
          <div class="card-icon">QR</div>
          <h3>QR Code Scanning</h3>
          <p>Customers scan print slips to track queue counters live from their mobile devices.</p>
        </article>
      </div>
    </section>

    <!-- Analytics Dashboard Mockup Section -->
    <section class="landing-section">
      <div class="section-heading">
        <span>Analytics</span>
        <h2>Queue Operations Insights</h2>
      </div>
      
      <div class="dashboard-preview">
        <div class="chart-card">
          <h3>Token Volume Trend</h3>
          <div class="bar-chart">
            <span style="height: 52%;"></span>
            <span style="height: 78%;"></span>
            <span style="height: 42%;"></span>
            <span style="height: 90%;"></span>
            <span style="height: 65%;"></span>
          </div>
        </div>
        
        <div class="chart-card">
          <h3>Wait Duration Index</h3>
          <div class="line-chart"></div>
        </div>
        
        <div class="monitor-list">
          <div class="skeleton-row">
            <span>Counter 01 Load</span>
            <i></i>
          </div>
          <div class="skeleton-row">
            <span>Counter 02 Load</span>
            <i></i>
          </div>
          <div class="skeleton-row">
            <span>Counter 03 Load</span>
            <i></i>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="landing-section">
      <div class="section-heading">
        <span>Support</span>
        <h2>Frequently Asked Questions</h2>
      </div>
      
      <div class="faq-list">
        <div class="faq-item glass-card">
          <button onclick="toggleFAQ(this)">
            <span>How does the local multi-tab sync work?</span>
            <b>+</b>
          </button>
          <p>The system utilizes the BroadcastChannel API. When any operator dashboard triggers state modifications, an alert is broadcasted, forcing open TV displays or stats displays to reload the state from LocalStorage and update immediately.</p>
        </div>
        
        <div class="faq-item glass-card">
          <button onclick="toggleFAQ(this)">
            <span>Can we customize patient check-in input fields?</span>
            <b>+</b>
          </button>
          <p>Yes. The System Admin dashboard includes a custom user schema builder. Admins can add fields (e.g. Symptoms, Account Type, Age, Department) and mark them as optional or required, changing patient forms dynamically.</p>
        </div>

        <div class="faq-item glass-card">
          <button onclick="toggleFAQ(this)">
            <span>What hardware do we need for the TV Cast?</span>
            <b>+</b>
          </button>
          <p>Any basic display with a modern browser works. Simply open the TV Cast URL on a Smart TV, Raspberry Pi, or local PC connected to a television monitor to broadcast live queue updates.</p>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
      <div>
        <span>Get Started</span>
        <h2>Optimize client reception flows today</h2>
      </div>
      <div class="hero-actions">
        <button class="primary" onclick="window.location.hash='#/login'">Launch App</button>
        <button class="secondary-btn" onclick="showTermsModal()">Terms & Agreement</button>
      </div>
    </section>

    <!-- Footer -->
    <footer class="landing-footer">
      <div class="landing-footer-links">
        <button onclick="showTermsModal()">Terms of Service</button>
        <button onclick="showTermsModal()">Privacy Policy</button>
        <button onclick="window.location.hash='#/login'">Administrator Login</button>
      </div>
      <span>&copy; Produced by Callback. All rights reserved.</span>
    </footer>
  `;
  
  parent.appendChild(container);

  // Start the live queue conveyor-belt animation after DOM paint
  requestAnimationFrame(() => {
    setTimeout(() => {
      initLiveQueueAnimation();
    }, 100);
  });
}

// --- Live Queue Conveyor-Belt Animation Engine ---
let liveQueueAnimInterval = null;
const QUEUE_ANIM_TOKENS = [
  { number: 'A101', name: 'David C.' },
  { number: 'A102', name: 'Alice J.' },
  { number: 'A103', name: 'Robert M.' },
  { number: 'A104', name: 'Sophia M.' },
  { number: 'A105', name: 'Marcus T.' },
  { number: 'A106', name: 'Emily W.' },
  { number: 'A107', name: 'James A.' },
  { number: 'A108', name: 'Victoria S.' },
  { number: 'A109', name: 'Noah P.' },
  { number: 'A110', name: 'Olivia R.' },
];
let queueAnimCursor = 0;

function initLiveQueueAnimation() {
  const container = document.getElementById('live-queue-anim-box');
  if (!container) return;

  // Clear any existing interval
  if (liveQueueAnimInterval) clearInterval(liveQueueAnimInterval);

  container.innerHTML = '';
  queueAnimCursor = 0;

  // Create initial 5 node slots: outgoing(hidden), serving, wait-1, wait-2, wait-3(incoming)
  for (let i = 0; i < 5; i++) {
    const token = QUEUE_ANIM_TOKENS[queueAnimCursor % QUEUE_ANIM_TOKENS.length];
    const node = createAnimTokenNode(token, i);
    container.appendChild(node);
    queueAnimCursor++;
  }

  // Assign initial positions after a brief paint delay
  requestAnimationFrame(() => {
    const nodes = container.querySelectorAll('.anim-token-node');
    if (nodes[0]) nodes[0].classList.add('state-served');
    if (nodes[1]) nodes[1].classList.add('state-serving');
    if (nodes[2]) nodes[2].classList.add('state-wait-1');
    if (nodes[3]) nodes[3].classList.add('state-wait-2');
    if (nodes[4]) nodes[4].classList.add('state-wait-3');
  });

  // Start the advance loop every 3 seconds
  liveQueueAnimInterval = setInterval(() => advanceLiveQueue(), 3000);
}

function createAnimTokenNode(token, index) {
  const node = document.createElement('div');
  node.className = 'anim-token-node';
  node.dataset.idx = index;
  node.innerHTML = `
    <div class="person-figure">
      <div class="person-head"></div>
      <div class="person-body">
        <div class="person-arm left"></div>
        <div class="person-arm right"></div>
      </div>
      <div class="person-legs">
        <div class="person-leg left"></div>
        <div class="person-leg right"></div>
      </div>
    </div>
    <span class="anim-token-number">${token.number}</span>
    <span class="anim-token-name">${token.name}</span>
  `;
  return node;
}

function advanceLiveQueue() {
  const container = document.getElementById('live-queue-anim-box');
  if (!container) {
    if (liveQueueAnimInterval) clearInterval(liveQueueAnimInterval);
    return;
  }

  const nodes = container.querySelectorAll('.anim-token-node');

  // Move each node one stage forward
  nodes.forEach(node => {
    if (node.classList.contains('state-served')) {
      // Already done – mark for removal with exit animation
      node.classList.remove('state-served');
      node.classList.add('state-exiting');
      setTimeout(() => node.remove(), 800);
    } else if (node.classList.contains('state-serving')) {
      node.classList.remove('state-serving');
      node.classList.add('state-served');
    } else if (node.classList.contains('state-wait-1')) {
      node.classList.remove('state-wait-1');
      node.classList.add('state-serving');
    } else if (node.classList.contains('state-wait-2')) {
      node.classList.remove('state-wait-2');
      node.classList.add('state-wait-1');
    } else if (node.classList.contains('state-wait-3')) {
      node.classList.remove('state-wait-3');
      node.classList.add('state-wait-2');
    }
  });

  // Spawn a new node at wait-3 position
  const newToken = QUEUE_ANIM_TOKENS[queueAnimCursor % QUEUE_ANIM_TOKENS.length];
  const newNode = createAnimTokenNode(newToken, queueAnimCursor);
  newNode.classList.add('state-incoming');
  container.appendChild(newNode);
  queueAnimCursor++;

  // Transition incoming to wait-3 after paint
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      newNode.classList.remove('state-incoming');
      newNode.classList.add('state-wait-3');
    });
  });
}

// Toggle FAQ Accordion
window.toggleFAQ = (button) => {
  const faqItem = button.closest('.faq-item');
  const isOpen = faqItem.classList.contains('open');
  
  document.querySelectorAll('.faq-item').forEach(item => {
    item.classList.remove('open');
    item.querySelector('b').textContent = '+';
  });
  
  if (!isOpen) {
    faqItem.classList.add('open');
    button.querySelector('b').textContent = '-';
  }
};

// --- Render View: Login Page ---
function renderLoginPage(parent) {
  const wrapper = document.createElement('div');
  wrapper.className = 'auth-container';
  
  wrapper.innerHTML = `
    <div class="glass-card auth-card">
      <h2 style="text-align: center;">Account Sign In</h2>
      <p class="auth-subtitle">AI Queue Management Portal</p>
      
      <div class="segmented">
        <button id="seg-login" class="active">Login</button>
        <button id="seg-register" onclick="window.location.hash='#/register'">Register</button>
      </div>
      
      <div id="login-error-container"></div>
      
      <form onsubmit="handleLoginSubmit(event)">
        <div class="form-group">
          <label>Email Address</label>
          <input type="email" id="login-email" placeholder="admin@aiqueue.com" required>
        </div>
        
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="login-password" placeholder="••••••••" required>
        </div>
        
        <button type="submit" style="width: 100%; margin-top: 12px;">Sign In</button>
      </form>
      
      <div style="text-align: center; margin-top: 8px;">
        <a href="#/reset-password" style="font-size: 0.88rem;">Forgot password?</a>
      </div>
      
      <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); border-radius: 12px; padding: 12px; font-size: 0.8rem; color: var(--font-color-secondary);">
        <strong>Demo Accounts (password: password):</strong><br>
        • Admin: admin@aiqueue.com<br>
        • Operator: operator@aiqueue.com<br>
        • Doctor: doctor@aiqueue.com
      </div>
    </div>
  `;
  parent.appendChild(wrapper);
}

window.handleLoginSubmit = (event) => {
  event.preventDefault();
  const email = document.getElementById('login-email').value;
  const pass = document.getElementById('login-password').value;
  const errorContainer = document.getElementById('login-error-container');
  
  errorContainer.innerHTML = '';
  
  const users = JSON.parse(localStorage.getItem('ai_queue_users')) || [];
  const matchedUser = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === pass);
  
  if (matchedUser) {
    sessionStorage.setItem('ai_queue_active_user', JSON.stringify(matchedUser));
    state.currentUser = matchedUser;
    applyTheme(matchedUser.theme);
    addLog(`User ${matchedUser.fullname} logged in`);
    window.location.hash = '#/dashboard';
  } else {
    errorContainer.innerHTML = `<div class="error-message">Invalid email or password credentials.</div>`;
  }
};

// --- Render View: Register Page ---
function renderRegisterPage(parent) {
  const wrapper = document.createElement('div');
  wrapper.className = 'auth-container';
  
  wrapper.innerHTML = `
    <div class="glass-card auth-card">
      <h2 style="text-align: center;">Register Account</h2>
      <p class="auth-subtitle">AI Queue Management Portal</p>
      
      <div class="segmented">
        <button id="seg-login" onclick="window.location.hash='#/login'">Login</button>
        <button id="seg-register" class="active">Register</button>
      </div>
      
      <div id="register-error-container"></div>
      
      <form onsubmit="handleRegisterSubmit(event)">
        <div class="form-group">
          <label>Full Name</label>
          <input type="text" id="reg-name" placeholder="John Doe" required>
        </div>

        <div class="form-group">
          <label>Email Address</label>
          <input type="email" id="reg-email" placeholder="john@example.com" required>
        </div>
        
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="reg-password" placeholder="••••••••" minlength="6" required>
        </div>

        <div class="form-group">
          <label>Role</label>
          <select id="reg-role">
            <option value="queue_operator">Queue Operator</option>
            <option value="doctor">Doctor / Service Provider</option>
            <option value="main_admin">System Admin</option>
          </select>
        </div>
        
        <button type="submit" style="width: 100%; margin-top: 12px;">Create Account</button>
      </form>
    </div>
  `;
  parent.appendChild(wrapper);
}

window.handleRegisterSubmit = (event) => {
  event.preventDefault();
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const pass = document.getElementById('reg-password').value;
  const role = document.getElementById('reg-role').value;
  const errorContainer = document.getElementById('register-error-container');
  
  errorContainer.innerHTML = '';
  
  const users = JSON.parse(localStorage.getItem('ai_queue_users')) || [];
  const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (exists) {
    errorContainer.innerHTML = `<div class="error-message">Email address is already registered.</div>`;
    return;
  }
  
  const newUser = {
    email: email,
    password: pass,
    fullname: name,
    role: role,
    theme: {
      mode: 'dark',
      theme_1: '#00e5ff',
      theme_2: '#e025ff'
    }
  };
  
  users.push(newUser);
  localStorage.setItem('ai_queue_users', JSON.stringify(users));
  
  sessionStorage.setItem('ai_queue_active_user', JSON.stringify(newUser));
  state.currentUser = newUser;
  applyTheme(newUser.theme);
  addLog(`User ${newUser.fullname} registered with role ${newUser.role}`);
  
  window.location.hash = '#/dashboard';
};

// --- Render View: Reset Password Page ---
function renderResetPasswordPage(parent) {
  const wrapper = document.createElement('div');
  wrapper.className = 'auth-container';
  
  wrapper.innerHTML = `
    <div class="glass-card auth-card">
      <h2 style="text-align: center;">Reset Password</h2>
      <p class="auth-subtitle">AI Queue Management Portal</p>
      
      <div id="reset-msg-container"></div>
      
      <form onsubmit="handleResetSubmit(event)">
        <div class="form-group">
          <label>Registered Email Address</label>
          <input type="email" id="reset-email" placeholder="john@example.com" required>
        </div>
        
        <button type="submit" style="width: 100%; margin-top: 12px;">Send Password Reset Link</button>
      </form>
      
      <div style="text-align: center; margin-top: 8px;">
        <a href="#/login" style="font-size: 0.88rem;">Back to Login</a>
      </div>
    </div>
  `;
  parent.appendChild(wrapper);
}

window.handleResetSubmit = (event) => {
  event.preventDefault();
  const email = document.getElementById('reset-email').value;
  const container = document.getElementById('reset-msg-container');
  
  container.innerHTML = `<div class="success-message">A password reset verification email has been simulated and sent to <strong>${email}</strong>.</div>`;
  addLog(`Simulated password reset request for ${email}`);
};

// --- Render View: Dashboard router based on user role ---
function renderDashboardPage(parent) {
  const container = document.createElement('div');
  container.className = 'dashboard';
  
  // Dashboard Header
  const activeBranch = state.branches.find(b => b.id === state.activeBranchId);
  const branchName = activeBranch ? activeBranch.name : 'All Branches';
  
  container.innerHTML = `
    <div class="dashboard-header">
      <div class="title-with-home">
        <div class="title-home-logo">
          <img src="image/logo.png" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;" alt="Logo">
        </div>
        <div>
          <h2>${branchName}</h2>
          <p style="color: var(--font-color-secondary); font-size: 0.9rem;">Connected as ${state.currentUser.fullname} (${state.currentUser.role.replace('_', ' ')})</p>
        </div>
      </div>
      
      <div class="stats-summary">
        <div class="stat">Branch: 
          <select id="dash-branch-selector" onchange="switchDashBranch(this.value)" style="background: transparent; border: none; color: var(--theme-primary); font-weight: 700; font-family: inherit; font-size: 0.85rem; outline: none; margin-left: 4px; cursor: pointer;">
            ${state.branches.map(b => `<option value="${b.id}" ${b.id === state.activeBranchId ? 'selected' : ''} style="background: var(--bg-secondary); color: var(--font-color-primary);">${b.name}</option>`).join('')}
          </select>
        </div>
        <div class="stat">Desk:
          <select id="dash-counter-selector" onchange="switchDashCounter(this.value)" style="background: transparent; border: none; color: var(--theme-primary); font-weight: 700; font-family: inherit; font-size: 0.85rem; outline: none; margin-left: 4px; cursor: pointer;">
            ${["01", "02", "03", "04", "05"].map(c => `<option value="${c}" ${c === state.activeCounterId ? 'selected' : ''} style="background: var(--bg-secondary); color: var(--font-color-primary);">Counter ${c}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>
  `;
  
  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'dashboard-content';
  
  // Render dashboards according to roles
  if (state.currentUser.role === 'main_admin') {
    renderAdminDashboard(contentWrapper);
  } else if (state.currentUser.role === 'doctor') {
    renderDoctorDashboard(contentWrapper);
  } else {
    // Default or queue_operator
    renderOperatorDashboard(contentWrapper);
  }
  
  container.appendChild(contentWrapper);
  parent.appendChild(container);
}

window.switchDashBranch = (branchId) => {
  state.activeBranchId = branchId;
  saveState();
  renderActiveView();
  addLog(`Switched dashboard view to branch ${branchId}`);
};

window.switchDashCounter = (counterId) => {
  state.activeCounterId = counterId;
  saveState();
  renderActiveView();
  addLog(`Switched active desk counter to ${counterId}`);
};

// --- View Component: Operator Dashboard ---
function renderOperatorDashboard(parent) {
  const branchTokens = state.tokens.filter(t => t.branchId === state.activeBranchId);
  const currentServing = branchTokens.find(t => t.status === 'serving' && t.counter === state.activeCounterId);
  const nextToken = branchTokens.find(t => t.status === 'waiting');
  
  const waitingList = branchTokens.filter(t => t.status === 'waiting');
  const servedList = branchTokens.filter(t => t.status === 'served');
  
  const split = document.createElement('div');
  split.className = 'split-layout';
  
  split.innerHTML = `
    <!-- Left panel: Control panel -->
    <div style="display: flex; flex-direction: column; gap: 24px;">
      <div class="glass-card current-token-large">
        <h3>Serving Now</h3>
        <div class="token-number">${currentServing ? currentServing.number : '--'}</div>
        <div class="current-user">${currentServing ? currentServing.name : 'No patient active'}</div>
        
        <div style="display: flex; gap: 12px; margin-top: 24px;">
          <button class="primary" onclick="callNextToken()" style="flex: 1;">Call Next</button>
          ${currentServing ? `<button class="danger-btn" onclick="completeToken('${currentServing.id}')">Complete</button>` : ''}
        </div>
      </div>
      
      <div class="glass-card" style="padding: 20px;">
        <h4 style="margin-bottom: 12px;">Create Queue Token</h4>
        <form onsubmit="generateQueueToken(event)">
          <div id="operator-token-fields"></div>
          <button type="submit" style="width: 100%; margin-top: 8px;">Add Token to Queue</button>
        </form>
      </div>
    </div>
    
    <!-- Right panel: Live queues -->
    <div class="glass-card" style="padding: 24px; display: flex; flex-direction: column; gap: 20px;">
      <div class="dashboard-tabs">
        <button id="tab-waiting" class="active" onclick="switchQueueTab('waiting')">Waiting Queue (${waitingList.length})</button>
        <button id="tab-served" onclick="switchQueueTab('served')">Served History (${servedList.length})</button>
      </div>
      
      <div id="queue-tab-waiting" class="queue-display-tab">
        <div class="token-list">
          ${waitingList.length === 0 ? '<p style="text-align: center; color: var(--font-color-muted); padding: 32px 0;">No clients waiting in queue.</p>' : ''}
          ${waitingList.map((t, idx) => `
            <div class="glass-card token-item">
              <div>
                <span class="token-position">${t.number}</span>
                <strong style="margin-left: 12px;">${t.name}</strong>
              </div>
              <div style="display: flex; align-items: center; gap: 16px;">
                <span style="font-size: 0.85rem; color: var(--font-color-muted);">${t.time}</span>
                <button class="secondary-btn" onclick="callSpecificToken('${t.id}')" style="padding: 6px 12px; font-size: 0.8rem; border-radius: 8px;">Call</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div id="queue-tab-served" class="queue-display-tab" style="display: none;">
        <div class="token-list">
          ${servedList.length === 0 ? '<p style="text-align: center; color: var(--font-color-muted); padding: 32px 0;">No clients served yet today.</p>' : ''}
          ${servedList.map(t => `
            <div class="glass-card token-item" style="border-left: 4px solid var(--border-color);">
              <div>
                <span style="font-family: var(--heading-font-family); font-weight: 700; color: var(--font-color-muted);">${t.number}</span>
                <strong style="margin-left: 12px;">${t.name}</strong>
              </div>
              <div style="font-size: 0.85rem; color: var(--font-color-secondary);">
                <span>Desk: Counter ${t.counter}</span> | <span>Served: ${t.time}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  
  parent.appendChild(split);
  
  // Render user schema forms inside left queue generation block
  renderDynamicSchemaFields('operator-token-fields');
}

window.switchQueueTab = (tab) => {
  const waitingTab = document.getElementById('queue-tab-waiting');
  const servedTab = document.getElementById('queue-tab-served');
  const waitingBtn = document.getElementById('tab-waiting');
  const servedBtn = document.getElementById('tab-served');
  
  if (tab === 'waiting') {
    waitingTab.style.display = 'block';
    servedTab.style.display = 'none';
    waitingBtn.classList.add('active');
    servedBtn.classList.remove('active');
  } else {
    waitingTab.style.display = 'none';
    servedTab.style.display = 'block';
    waitingBtn.classList.remove('active');
    servedBtn.classList.add('active');
  }
};

window.renderDynamicSchemaFields = (containerId) => {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const branch = state.branches.find(b => b.id === state.activeBranchId);
  if (!branch) return;
  
  container.innerHTML = '';
  branch.user_schema.forEach(field => {
    const group = document.createElement('div');
    group.className = 'form-group';
    
    const label = `<label>${field.key.replace('_', ' ').toUpperCase()} ${field.required ? '*' : ''}</label>`;
    let input = '';
    
    if (field.type === 'textarea') {
      input = `<textarea id="field-${field.key}" ${field.required ? 'required' : ''} placeholder="Provide details..."></textarea>`;
    } else if (field.type === 'select' && branch.branch_type === 'bank') {
      input = `
        <select id="field-${field.key}" ${field.required ? 'required' : ''}>
          <option value="Cash Deposit">Cash Deposit</option>
          <option value="Cash Withdrawal">Cash Withdrawal</option>
          <option value="Loan Inquiry">Loan Inquiry</option>
          <option value="New Account opening">New Account opening</option>
        </select>
      `;
    } else {
      input = `<input type="${field.type}" id="field-${field.key}" ${field.required ? 'required' : ''} placeholder="Enter value...">`;
    }
    
    group.innerHTML = label + input;
    container.appendChild(group);
  });
};

window.generateQueueToken = (event) => {
  event.preventDefault();
  const branch = state.branches.find(b => b.id === state.activeBranchId);
  if (!branch) return;
  
  const details = {};
  branch.user_schema.forEach(field => {
    const el = document.getElementById(`field-${field.key}`);
    if (el) {
      details[field.key] = el.value;
    }
  });
  
  const branchTokens = state.tokens.filter(t => t.branchId === state.activeBranchId);
  const prefix = branch.branch_type === 'hospital' ? 'A' : 'B';
  const numSuffix = branchTokens.length + 101;
  const tokenNumber = `${prefix}${numSuffix}`;
  
  const nameVal = details.fullname || "Anonymous Client";
  
  const newToken = {
    id: `token-${Date.now()}`,
    branchId: state.activeBranchId,
    number: tokenNumber,
    name: nameVal,
    details: details,
    status: "waiting",
    counter: "",
    provider: "",
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    waitingTime: 0,
    medicines: [],
    note: ""
  };
  
  state.tokens.push(newToken);
  saveState();
  addLog(`Generated new token ${tokenNumber} for ${nameVal}`);
  notifySync();
  renderActiveView();
};

window.callNextToken = () => {
  const branchTokens = state.tokens.filter(t => t.branchId === state.activeBranchId);
  
  // Set currently serving token on this counter to served
  const currentServing = branchTokens.find(t => t.status === 'serving' && t.counter === state.activeCounterId);
  if (currentServing) {
    currentServing.status = 'served';
    currentServing.time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // Find next waiting token and assign to this counter
  const nextToken = branchTokens.find(t => t.status === 'waiting');
  if (nextToken) {
    nextToken.status = 'serving';
    nextToken.counter = state.activeCounterId;
    nextToken.provider = state.currentUser.fullname || 'Desk Operator';
    addLog(`Counter ${state.activeCounterId} called next token ${nextToken.number}`);
  } else {
    addLog(`Counter ${state.activeCounterId} clicked call next, but waiting queue is empty.`);
  }
  
  saveState();
  playQueueChime();
  notifySync();
  renderActiveView();
};

window.callSpecificToken = (tokenId) => {
  const branchTokens = state.tokens.filter(t => t.branchId === state.activeBranchId);
  
  // Set currently serving token on this counter to served
  const currentServing = branchTokens.find(t => t.status === 'serving' && t.counter === state.activeCounterId);
  if (currentServing) {
    currentServing.status = 'served';
    currentServing.time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  const token = state.tokens.find(t => t.id === tokenId);
  if (token) {
    token.status = 'serving';
    token.counter = state.activeCounterId;
    token.provider = state.currentUser.fullname || 'Desk Operator';
    addLog(`Counter ${state.activeCounterId} called specific token ${token.number}`);
  }
  
  saveState();
  playQueueChime();
  notifySync();
  renderActiveView();
};

window.completeToken = (tokenId) => {
  const token = state.tokens.find(t => t.id === tokenId);
  if (token) {
    token.status = 'served';
    token.time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    addLog(`Completed token ${token.number}`);
  }
  saveState();
  notifySync();
  renderActiveView();
};

// --- View Component: Doctor / Service Provider Dashboard ---
let activePrescriptions = [];
let aiDiagnosticSuggestion = null;

function renderDoctorDashboard(parent) {
  const branchTokens = state.tokens.filter(t => t.branchId === state.activeBranchId);
  const currentServing = branchTokens.find(t => t.status === 'serving' && t.counter === state.activeCounterId);
  const waitingList = branchTokens.filter(t => t.status === 'waiting');
  
  const split = document.createElement('div');
  split.className = 'split-layout';
  
  let leftPaneHTML = '';
  
  if (currentServing) {
    // Current Active patient details
    const patientDetails = currentServing.details || {};
    const detailList = Object.keys(patientDetails).map(key => {
      if (key === 'fullname') return '';
      return `
        <div style="margin-bottom: 8px;">
          <small style="color: var(--font-color-muted); text-transform: uppercase; font-size: 0.75rem; font-weight: 700;">${key.replace('_', ' ')}</small>
          <div style="font-size: 0.95rem;">${patientDetails[key]}</div>
        </div>
      `;
    }).join('');

    leftPaneHTML = `
      <div class="glass-card patient-card current" style="border-left-width: 4px; padding: 24px;">
        <div class="patient-header">
          <span class="token-badge">${currentServing.number}</span>
          <span class="waiting-time">In Service</span>
        </div>
        <h3 style="font-size: 1.4rem; margin: 8px 0;">${currentServing.name}</h3>
        
        <div style="background: rgba(0,0,0,0.15); padding: 16px; border-radius: 12px; border: 1px solid var(--border-color); margin: 12px 0;">
          ${detailList}
        </div>
        
        <form class="suggestion-form" onsubmit="handleClinicalComplete(event, '${currentServing.id}')">
          <div class="provider-note-panel">
            <label>Clinical Symptoms / History notes</label>
            <textarea id="doctor-symptoms-text" rows="3" placeholder="Add clinical review details or click AI Suggestion...">${patientDetails.symptoms || ''}</textarea>
            
            <button type="button" class="secondary-btn" onclick="triggerAIDiagnosisSuggestion()" style="align-self: flex-start; padding: 6px 14px; font-size: 0.8rem; border-radius: 8px;">🪄 Get AI Suggestion</button>
          </div>
          
          <div id="ai-suggestion-box" style="display: ${aiDiagnosticSuggestion ? 'block' : 'none'};">
            <div class="ai-suggestion-output">
              <strong>🤖 AI Suggested Review:</strong>
              <p style="font-weight: 600; color: var(--theme-secondary);">${aiDiagnosticSuggestion ? aiDiagnosticSuggestion.diagnosis : ''}</p>
              <p style="margin: 4px 0 10px 0;">${aiDiagnosticSuggestion ? aiDiagnosticSuggestion.description : ''}</p>
              <button type="button" class="secondary-btn" onclick="applyAIDiagnosis()" style="padding: 4px 10px; font-size: 0.75rem; border-radius: 6px;">Apply Diagnosis & Prescriptions</button>
            </div>
          </div>

          <div class="medicine-selection">
            <label>Add Prescription Medicines</label>
            <div class="selected-medicines" id="selected-medicines-tags">
              ${activePrescriptions.map((med, idx) => `
                <span class="medicine-tag">${med} <span class="remove-medicine" onclick="removePrescriptionItem(${idx})">&times;</span></span>
              `).join('')}
              ${activePrescriptions.length === 0 ? '<span style="color: var(--font-color-muted); font-size: 0.85rem;">No medicines added.</span>' : ''}
            </div>
            
            <div class="medicine-search-container">
              <input type="text" id="medicine-search" placeholder="Type to search medicines..." oninput="filterMedicinesDropdown(this.value)">
              <div class="medicine-dropdown" id="medicines-search-dropdown" style="display: none;"></div>
            </div>
          </div>
          
          <button type="submit" class="complete-btn" style="width: 100%; height: 48px; border-radius: 14px; font-size: 1rem;">Complete Treatment & Call Next</button>
        </form>
      </div>
    `;
  } else {
    leftPaneHTML = `
      <div class="glass-card" style="text-align: center; padding: 48px 24px;">
        <span style="font-size: 3rem;">🩺</span>
        <h3 style="margin-top: 16px;">Ready to serve</h3>
        <p style="color: var(--font-color-secondary); margin: 8px 0 24px 0;">No active patient is currently assigned to Counter ${state.activeCounterId}.</p>
        <button class="primary" onclick="callNextToken()" style="width: 100%; max-width: 220px; margin: 0 auto;">Call Next Patient</button>
      </div>
    `;
  }
  
  split.innerHTML = `
    <!-- Left panel: Current Patient treatment -->
    <div>${leftPaneHTML}</div>
    
    <!-- Right panel: Patient queue list -->
    <div class="glass-card" style="padding: 24px; display: flex; flex-direction: column; gap: 20px;">
      <h3 style="font-size: 1.25rem;">Waiting Patients List (${waitingList.length})</h3>
      
      <div class="token-list">
        ${waitingList.length === 0 ? '<p style="text-align: center; color: var(--font-color-muted); padding: 32px 0;">All patient cards have been served.</p>' : ''}
        ${waitingList.map(t => `
          <div class="glass-card token-item">
            <div>
              <span class="token-position">${t.number}</span>
              <strong style="margin-left: 12px;">${t.name}</strong>
              <div style="font-size: 0.8rem; color: var(--font-color-secondary); margin-left: 48px;">
                Symptoms: ${t.details.symptoms || 'None recorded'}
              </div>
            </div>
            <button class="secondary-btn" onclick="callSpecificToken('${t.id}')" style="padding: 6px 14px; font-size: 0.8rem; border-radius: 8px;">Serve</button>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  parent.appendChild(split);
}

window.triggerAIDiagnosisSuggestion = () => {
  const symText = document.getElementById('doctor-symptoms-text').value;
  const result = generateAIDiagnosis(symText);
  aiDiagnosticSuggestion = result;
  
  const box = document.getElementById('ai-suggestion-box');
  if (box) {
    box.style.display = 'block';
    box.querySelector('p:nth-child(2)').textContent = result.diagnosis;
    box.querySelector('p:nth-child(3)').textContent = result.description;
  }
};

window.applyAIDiagnosis = () => {
  if (aiDiagnosticSuggestion) {
    const symText = document.getElementById('doctor-symptoms-text');
    if (symText) {
      symText.value = `${symText.value}\n[AI DIAGNOSIS]: ${aiDiagnosticSuggestion.diagnosis} - ${aiDiagnosticSuggestion.description}`;
    }
    
    aiDiagnosticSuggestion.medicines.forEach(m => {
      if (!activePrescriptions.includes(m)) {
        activePrescriptions.push(m);
      }
    });
    
    aiDiagnosticSuggestion = null;
    document.getElementById('ai-suggestion-box').style.display = 'none';
    renderDoctorDashboard(document.querySelector('.dashboard-content'));
  }
};

window.filterMedicinesDropdown = (query) => {
  const dropdown = document.getElementById('medicines-search-dropdown');
  if (!dropdown) return;
  
  if (!query) {
    // Show quick suggestions list
    dropdown.style.display = 'block';
    let html = '<div class="quick-medicines"><strong>Quick Add List</strong><div class="quick-medicine-list">';
    Object.keys(QUICK_MEDICINES).forEach(cat => {
      QUICK_MEDICINES[cat].forEach(med => {
        html += `<button type="button" class="quick-medicine-btn" onclick="addPrescriptionItem('${med}')">${med}</button>`;
      });
    });
    html += '</div></div>';
    dropdown.innerHTML = html;
    return;
  }
  
  dropdown.style.display = 'block';
  let matched = [];
  Object.keys(QUICK_MEDICINES).forEach(cat => {
    QUICK_MEDICINES[cat].forEach(med => {
      if (med.toLowerCase().includes(query.toLowerCase())) {
        matched.push({ cat, med });
      }
    });
  });
  
  if (matched.length === 0) {
    dropdown.innerHTML = `<p style="padding: 12px; font-size: 0.85rem; color: var(--font-color-muted);">No medication match found. <button type="button" class="secondary-btn" onclick="addPrescriptionItem('${query}')" style="padding: 2px 8px; font-size: 0.75rem; border-radius: 4px; margin-left: 6px;">Add "${query}"</button></p>`;
    return;
  }
  
  let html = '';
  const grouped = {};
  matched.forEach(item => {
    if (!grouped[item.cat]) grouped[item.cat] = [];
    grouped[item.cat].push(item.med);
  });
  
  Object.keys(grouped).forEach(cat => {
    html += `<div class="medicine-category"><strong>${cat}</strong>`;
    grouped[cat].forEach(med => {
      html += `<div class="medicine-item" onclick="addPrescriptionItem('${med}')">${med}</div>`;
    });
    html += '</div>';
  });
  
  dropdown.innerHTML = html;
};

// Open empty dropdown on focus
document.addEventListener('focusin', e => {
  if (e.target.id === 'medicine-search') {
    window.filterMedicinesDropdown('');
  }
});

// Close dropdown on click outside
document.addEventListener('click', e => {
  const dropdown = document.getElementById('medicines-search-dropdown');
  if (dropdown && !e.target.closest('.medicine-search-container')) {
    dropdown.style.display = 'none';
  }
});

window.addPrescriptionItem = (medName) => {
  if (medName && !activePrescriptions.includes(medName)) {
    activePrescriptions.push(medName);
    addLog(`Added medicine ${medName} to prescription card`);
  }
  
  const searchInput = document.getElementById('medicine-search');
  if (searchInput) searchInput.value = '';
  
  const dropdown = document.getElementById('medicines-search-dropdown');
  if (dropdown) dropdown.style.display = 'none';
  
  renderDoctorDashboard(document.querySelector('.dashboard-content'));
};

window.removePrescriptionItem = (index) => {
  activePrescriptions.splice(index, 1);
  renderDoctorDashboard(document.querySelector('.dashboard-content'));
};

window.handleClinicalComplete = (event, tokenId) => {
  event.preventDefault();
  const symptomsNotes = document.getElementById('doctor-symptoms-text').value;
  
  const token = state.tokens.find(t => t.id === tokenId);
  if (token) {
    token.status = 'served';
    token.medicines = [...activePrescriptions];
    token.note = symptomsNotes;
    token.time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    addLog(`Prescribed and completed ticket ${token.number} for ${token.name}`);
  }
  
  // Reset diagnostic panel fields
  activePrescriptions = [];
  aiDiagnosticSuggestion = null;
  
  saveState();
  notifySync();
  
  // Call next automatically for smooth flow
  callNextToken();
};

// --- View Component: Admin Dashboard ---
function renderAdminDashboard(parent) {
  const branch = state.branches.find(b => b.id === state.activeBranchId);
  if (!branch) return;
  
  const servedCount = state.tokens.filter(t => t.branchId === branch.id && t.status === 'served').length;
  const waitingCount = state.tokens.filter(t => t.branchId === branch.id && t.status === 'waiting').length;
  const activeServing = state.tokens.filter(t => t.branchId === branch.id && t.status === 'serving').length;
  
  const split = document.createElement('div');
  split.className = 'split-layout';
  
  split.innerHTML = `
    <!-- Left panel: Settings builder -->
    <div class="glass-card control-panel">
      <h3>Branch Configuration</h3>
      <form onsubmit="handleBranchSave(event)">
        <div class="form-group">
          <label>Branch Name</label>
          <input type="text" id="admin-branch-name" value="${branch.name}" required>
        </div>
        
        <div class="form-group">
          <label>Branch details</label>
          <textarea id="admin-branch-details" rows="2">${branch.details}</textarea>
        </div>
        
        <div class="form-grid two">
          <div class="form-group">
            <label>City</label>
            <input type="text" id="admin-branch-city" value="${branch.city}">
          </div>
          <div class="form-group">
            <label>Pincode</label>
            <input type="text" id="admin-branch-pincode" value="${branch.pincode}">
          </div>
        </div>

        <div class="checkbox-section">
          <h4>Counter Operator Dashboard Controls</h4>
          <label class="inline-check">
            <input type="checkbox" id="ctrl-op-details" ${branch.dashboard_config.queue_operator.display_user_details ? 'checked' : ''}>
            Display user details
          </label>
          <label class="inline-check">
            <input type="checkbox" id="ctrl-op-allocate" ${branch.dashboard_config.queue_operator.can_allocate_provider ? 'checked' : ''}>
            Can allocate service provider
          </label>
        </div>

        <div class="mini-builder" style="margin-top: 16px;">
          <h4>User Schema Input Fields</h4>
          <div id="admin-schema-list" style="display: flex; flex-direction: column; gap: 8px;"></div>
          <button type="button" class="secondary-btn" onclick="addSchemaFieldToBranch()" style="margin-top: 8px; font-size: 0.8rem; padding: 6px 12px; border-radius: 8px;">+ Add Field</button>
        </div>
        
        <button type="submit" style="width: 100%; margin-top: 20px;">Save Branch Settings</button>
      </form>
    </div>
    
    <!-- Right panel: Activity Log & Queue Metrics -->
    <div style="display: flex; flex-direction: column; gap: 24px;">
      <!-- Stats summary -->
      <div class="glass-card" style="padding: 24px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; text-align: center;">
        <div>
          <small style="color: var(--font-color-muted); text-transform: uppercase; font-size: 0.75rem; font-weight: 700;">Served</small>
          <div style="font-size: 2.2rem; font-weight: 800; color: var(--theme-success);">${servedCount}</div>
        </div>
        <div>
          <small style="color: var(--font-color-muted); text-transform: uppercase; font-size: 0.75rem; font-weight: 700;">Waiting</small>
          <div style="font-size: 2.2rem; font-weight: 800; color: var(--theme-warning);">${waitingCount}</div>
        </div>
        <div>
          <small style="color: var(--font-color-muted); text-transform: uppercase; font-size: 0.75rem; font-weight: 700;">Active</small>
          <div style="font-size: 2.2rem; font-weight: 800; color: var(--theme-primary);">${activeServing}</div>
        </div>
      </div>
      
      <!-- Activity Log -->
      <div class="glass-card" style="padding: 24px; flex: 1; display: flex; flex-direction: column; gap: 16px;">
        <h3>Live Activity Logs</h3>
        <div style="max-height: 400px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; font-size: 0.88rem;">
          ${state.logs.length === 0 ? '<p style="color: var(--font-color-muted); text-align: center; padding: 24px;">No system events logged.</p>' : ''}
          ${state.logs.map(log => `
            <div style="border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
              <span style="color: var(--theme-secondary); font-family: var(--heading-font-family); font-weight: 600; margin-right: 8px;">[${log.timestamp}]</span>
              <span>${log.message}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  
  parent.appendChild(split);
  
  // Render current branch schema builder
  renderSchemaBuilderList();
}

window.renderSchemaBuilderList = () => {
  const list = document.getElementById('admin-schema-list');
  if (!list) return;
  
  const branch = state.branches.find(b => b.id === state.activeBranchId);
  if (!branch) return;
  
  list.innerHTML = '';
  branch.user_schema.forEach((field, index) => {
    const row = document.createElement('div');
    row.className = 'inline-row field-row';
    row.innerHTML = `
      <input type="text" value="${field.key}" onchange="updateSchemaFieldKey(${index}, this.value)" placeholder="Field name" style="flex: 2; padding: 8px;">
      <select onchange="updateSchemaFieldType(${index}, this.value)" style="flex: 1.5; padding: 8px;">
        <option value="text" ${field.type === 'text' ? 'selected' : ''}>Text</option>
        <option value="number" ${field.type === 'number' ? 'selected' : ''}>Number</option>
        <option value="textarea" ${field.type === 'textarea' ? 'selected' : ''}>Textarea</option>
        <option value="select" ${field.type === 'select' ? 'selected' : ''}>Select</option>
      </select>
      <label class="inline-check" style="font-size: 0.8rem; margin: 0 4px;">
        <input type="checkbox" ${field.required ? 'checked' : ''} onchange="updateSchemaFieldRequired(${index}, this.checked)"> Req
      </label>
      <button type="button" class="danger-btn" onclick="removeSchemaFieldFromBranch(${index})" style="padding: 8px; border-radius: 8px; min-width: 38px;">&times;</button>
    `;
    list.appendChild(row);
  });
};

window.updateSchemaFieldKey = (index, value) => {
  const branch = state.branches.find(b => b.id === state.activeBranchId);
  if (branch) {
    branch.user_schema[index].key = value.trim().toLowerCase().replace(' ', '_');
    saveState();
  }
};

window.updateSchemaFieldType = (index, value) => {
  const branch = state.branches.find(b => b.id === state.activeBranchId);
  if (branch) {
    branch.user_schema[index].type = value;
    saveState();
  }
};

window.updateSchemaFieldRequired = (index, value) => {
  const branch = state.branches.find(b => b.id === state.activeBranchId);
  if (branch) {
    branch.user_schema[index].required = value;
    saveState();
  }
};

window.addSchemaFieldToBranch = () => {
  const branch = state.branches.find(b => b.id === state.activeBranchId);
  if (branch) {
    branch.user_schema.push({ key: 'new_field', type: 'text', required: false });
    saveState();
    renderSchemaBuilderList();
  }
};

window.removeSchemaFieldFromBranch = (index) => {
  const branch = state.branches.find(b => b.id === state.activeBranchId);
  if (branch) {
    branch.user_schema.splice(index, 1);
    saveState();
    renderSchemaBuilderList();
  }
};

window.handleBranchSave = (event) => {
  event.preventDefault();
  const name = document.getElementById('admin-branch-name').value;
  const details = document.getElementById('admin-branch-details').value;
  const city = document.getElementById('admin-branch-city').value;
  const pincode = document.getElementById('admin-branch-pincode').value;
  
  const branch = state.branches.find(b => b.id === state.activeBranchId);
  if (branch) {
    branch.name = name;
    branch.details = details;
    branch.city = city;
    branch.pincode = pincode;
    
    branch.dashboard_config.queue_operator.display_user_details = document.getElementById('ctrl-op-details').checked;
    branch.dashboard_config.queue_operator.can_allocate_provider = document.getElementById('ctrl-op-allocate').checked;
    
    saveState();
    addLog(`Updated config details for branch ${branch.name}`);
    notifySync();
    renderActiveView();
  }
};

// --- View Component: Profile & Settings Page ---
function renderProfilePage(parent) {
  const wrapper = document.createElement('div');
  wrapper.className = 'auth-container';
  
  wrapper.innerHTML = `
    <div class="glass-card auth-card wide-card">
      <h2>Profile & Theme Settings</h2>
      <p class="auth-subtitle">Configure theme modes, accents, and password controls</p>
      
      <div id="profile-msg-container"></div>
      
      <div class="form-grid two">
        <!-- Theme Form -->
        <div class="control-panel" style="padding: 0;">
          <h3>Aesthetic Personalization</h3>
          <form onsubmit="handleProfileThemeSave(event)">
            <div class="form-group">
              <label>Futuristic Preset Themes</label>
              <select id="theme-preset-select" onchange="applyColorPreset(this.value)">
                <option value="custom">-- Custom Color Palette --</option>
                <option value="cosmic-cyberpunk">Cosmic Cyberpunk (Cyan & Magenta)</option>
                <option value="obsidian-tech">Obsidian Tech (Indigo & Purple)</option>
                <option value="emerald-aurora">Emerald Aurora (Teal & Lime)</option>
                <option value="neon-sunburn">Neon Sunburn (Orange & Hot Pink)</option>
                <option value="hyper-light">Hyper Light (Light Theme Blue & Violet)</option>
              </select>
            </div>

            <div class="form-group">
              <label>Interface Theme Accent 1 (Primary)</label>
              <input type="color" id="theme-color-1" value="${state.currentUser.theme ? state.currentUser.theme.theme_1 : '#00e5ff'}" style="height: 44px; padding: 2px; cursor: pointer;">
            </div>

            <div class="form-group">
              <label>Interface Theme Accent 2 (Secondary)</label>
              <input type="color" id="theme-color-2" value="${state.currentUser.theme ? state.currentUser.theme.theme_2 : '#e025ff'}" style="height: 44px; padding: 2px; cursor: pointer;">
            </div>

            <div class="form-group">
              <label>Color Theme Mode</label>
              <select id="theme-mode">
                <option value="dark" ${state.currentUser.theme && state.currentUser.theme.mode === 'dark' ? 'selected' : ''}>Dark Obsidian (Recommended)</option>
                <option value="light" ${state.currentUser.theme && state.currentUser.theme.mode === 'light' ? 'selected' : ''}>Light Frost</option>
              </select>
            </div>
            
            <button type="submit" style="width: 100%; margin-top: 12px;">Apply Theme Presets</button>
          </form>
        </div>
        
        <!-- Password Reset form -->
        <div class="control-panel" style="padding: 0; border-left: 1px solid var(--border-color); padding-left: 24px;">
          <h3>Change Security Password</h3>
          <form onsubmit="handleProfilePasswordSave(event)">
            <div class="form-group">
              <label>Current Password</label>
              <input type="password" id="profile-old-pass" placeholder="••••••••" required>
            </div>
            <div class="form-group">
              <label>New Password</label>
              <input type="password" id="profile-new-pass" placeholder="••••••••" minlength="6" required>
            </div>
            <button type="submit" style="width: 100%; margin-top: 12px;">Update Password</button>
          </form>
        </div>
      </div>
    </div>
  `;
  
  parent.appendChild(wrapper);
}

window.applyColorPreset = (presetKey) => {
  const c1 = document.getElementById('theme-color-1');
  const c2 = document.getElementById('theme-color-2');
  const mode = document.getElementById('theme-mode');
  if (!c1 || !c2 || !mode) return;
  
  switch (presetKey) {
    case 'cosmic-cyberpunk':
      c1.value = '#00e5ff';
      c2.value = '#e025ff';
      mode.value = 'dark';
      break;
    case 'obsidian-tech':
      c1.value = '#818cf8';
      c2.value = '#c084fc';
      mode.value = 'dark';
      break;
    case 'emerald-aurora':
      c1.value = '#0dd39e';
      c2.value = '#a3e635';
      mode.value = 'dark';
      break;
    case 'neon-sunburn':
      c1.value = '#ff6b2b';
      c2.value = '#ff2a85';
      mode.value = 'dark';
      break;
    case 'hyper-light':
      c1.value = '#2563eb';
      c2.value = '#8b5cf6';
      mode.value = 'light';
      break;
  }
};

window.handleProfileThemeSave = (event) => {
  event.preventDefault();
  const c1 = document.getElementById('theme-color-1').value;
  const c2 = document.getElementById('theme-color-2').value;
  const mode = document.getElementById('theme-mode').value;
  const container = document.getElementById('profile-msg-container');
  
  state.currentUser.theme = {
    mode: mode,
    theme_1: c1,
    theme_2: c2,
    font_color_1: mode === 'dark' ? '#f3f4f6' : '#0f172a',
    font_color_2: mode === 'dark' ? '#9ca3af' : '#475569'
  };
  
  applyTheme(state.currentUser.theme);
  saveState();
  addLog(`Updated theme aesthetics preference`);
  notifySync();
  
  container.innerHTML = `<div class="success-message">Aesthetics theme loaded successfully.</div>`;
};

window.handleProfilePasswordSave = (event) => {
  event.preventDefault();
  const oldPass = document.getElementById('profile-old-pass').value;
  const newPass = document.getElementById('profile-new-pass').value;
  const container = document.getElementById('profile-msg-container');
  
  container.innerHTML = '';
  if (oldPass !== state.currentUser.password) {
    container.innerHTML = `<div class="error-message">Current password entered is incorrect.</div>`;
    return;
  }
  
  state.currentUser.password = newPass;
  saveState();
  addLog(`Updated security password`);
  
  document.getElementById('profile-old-pass').value = '';
  document.getElementById('profile-new-pass').value = '';
  container.innerHTML = `<div class="success-message">Password updated successfully.</div>`;
};

// --- View Component: TV Display Screen (Public visualization page) ---
let tvClockTimer = null;

function renderTVDisplayPage(parent) {
  const branch = state.branches.find(b => b.id === state.activeBranchId);
  const branchTokens = state.tokens.filter(t => t.branchId === state.activeBranchId);
  
  const currentServing = branchTokens.find(t => t.status === 'serving' && t.counter === state.activeCounterId);
  const nextToken = branchTokens.find(t => t.status === 'waiting');
  const lastServed = branchTokens.filter(t => t.status === 'served');
  const recentServed = lastServed.length > 0 ? lastServed[0].number : '--';
  
  const announcementText = "Please wait for your token number. • Proceed to the assigned counter when called. • Keep documents ready. • Thank you for your patience.";
  
  const tvScreen = document.createElement('div');
  tvScreen.className = 'tv-display-page';
  
  tvScreen.innerHTML = `
    <header class="tv-topbar" style="border-radius: 18px; backdrop-filter: blur(16px); background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-color);">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span class="tv-live-dot connected"></span>
        <strong style="font-size: 1.25rem;">${branch ? branch.name : 'AI Queue Display'}</strong>
        <span style="color: var(--theme-secondary); font-weight: 700; margin-left: 8px; font-size: 0.88rem; text-transform: uppercase;">Counter ${state.activeCounterId} Display</span>
      </div>
      
      <div class="tv-clock">
        <strong id="tv-live-clock">10:45:00 AM</strong>
        <small id="tv-live-date">Thursday, Jun 4</small>
      </div>
      
      <div class="tv-display-actions">
        <button onclick="toggleFullScreenMode()">Full Screen</button>
        <button onclick="window.close()">Close Cast</button>
      </div>
    </header>
    
    <section class="tv-token-grid">
      <!-- Recently Served -->
      <article class="tv-token-card recent">
        <span>Recently Served</span>
        <strong>${recentServed}</strong>
      </article>
      
      <!-- Current Serving -->
      <article class="tv-current-stage">
        <div class="tv-person">
          <span class="person-head" style="font-size: 1.4rem; height: 90px; width: 90px; box-shadow: 0 0 35px var(--theme-success);">${currentServing ? currentServing.number : '--'}</span>
          <span class="person-body" style="width: 72px; height: 50px; border-radius: 20px 20px 0 0;"></span>
        </div>
        
        <div class="tv-serving-copy">
          <span>Serving Client</span>
          <strong>${currentServing ? currentServing.name : 'No active token'}</strong>
          <span>Assigned desk</span>
          <strong>Counter ${state.activeCounterId}</strong>
        </div>
      </article>
      
      <!-- Next Token -->
      <article class="tv-token-card next">
        <span>Next Token</span>
        <strong>${nextToken ? nextToken.number : '--'}</strong>
      </article>
    </section>
    
    <section class="tv-status-strip">
      <div>
        <span>Queue Status</span>
        <strong style="color: var(--theme-success);">Live Processing</strong>
      </div>
      <div>
        <span>Waiting Clients</span>
        <strong style="color: var(--theme-warning);">${branchTokens.filter(t => t.status === 'waiting').length}</strong>
      </div>
      <div>
        <span>Sync Status</span>
        <strong style="color: var(--theme-primary);">CONNECTED</strong>
      </div>
    </section>
    
    <footer class="tv-announcement" style="border-radius: 14px; border: 1px solid var(--border-color);">
      <span>${announcementText} &nbsp;&nbsp;&nbsp;&bull;&nbsp;&nbsp;&nbsp; ${announcementText}</span>
    </footer>
  `;
  
  parent.appendChild(tvScreen);
  
  // Start TV clock updates
  if (tvClockTimer) clearInterval(tvClockTimer);
  tvClockTimer = setInterval(updateTVClock, 1000);
  updateTVClock();
}

function updateTVClock() {
  const clockEl = document.getElementById('tv-live-clock');
  const dateEl = document.getElementById('tv-live-date');
  if (!clockEl || !dateEl) return;
  
  const now = new Date();
  clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  dateEl.textContent = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

window.toggleFullScreenMode = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.error(`Error attempting to enable full-screen mode: ${err.message}`);
    });
  } else {
    document.exitFullscreen();
  }
};

// --- Initial Setup ---
window.addEventListener('DOMContentLoaded', () => {
  loadState();
  handleNavigation();
});
