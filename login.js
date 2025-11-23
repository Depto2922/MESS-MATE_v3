// login.js — ei file
// Signup/Login and mess create/join flow handle kore

document.addEventListener('DOMContentLoaded', () => {
  // Elements — DOM element gula
  const showSignupBtn = document.getElementById('show-signup');
  const showLoginBtn = document.getElementById('show-login');
  const signupForm = document.getElementById('signup-form');
  const loginForm = document.getElementById('login-form');
  const signupError = document.getElementById('signup-error');
  const loginError = document.getElementById('login-error');

  const postAuthSection = document.getElementById('post-auth-section');
  const chooseCreateBtn = document.getElementById('choose-create');
  const chooseJoinBtn = document.getElementById('choose-join');
  const proceedDashboardBtn = document.getElementById('proceed-dashboard');

  const createMessForm = document.getElementById('create-mess-form');
  const joinMessForm = document.getElementById('join-mess-form');
  const createMessError = document.getElementById('create-mess-error');
  const joinMessError = document.getElementById('join-mess-error');

  // Reset password UI elements — forgot password er jonno
  const showResetLink = document.getElementById('show-reset');
  const resetForm = document.getElementById('reset-form');
  const resetError = document.getElementById('reset-error');
  const sendResetOtpBtn = document.getElementById('send-reset-otp');
  const resetOtpInput = document.getElementById('reset-otp');
  const resetOtpStatus = document.getElementById('reset-otp-status');
  const resetNewPasswordInput = document.getElementById('reset-new-password');

  // Storage helpers — (localStorage helper )
  const getUsers = () => { try { return JSON.parse(localStorage.getItem('users') || '[]'); } catch { return []; } };
  const setUsers = (users) => localStorage.setItem('users', JSON.stringify(users));
  const getMesses = () => { try { return JSON.parse(localStorage.getItem('messes') || '{}'); } catch { return {}; } };
  const setMesses = (m) => localStorage.setItem('messes', JSON.stringify(m));
  const storageKey = (base, messId) => messId ? `${base}:${messId}` : base;

  function addSelfToMembers(messId) {
    try {
      const cu = JSON.parse(localStorage.getItem('currentUser'));
      if (!cu) return;
      const key = storageKey('members', messId);
      const members = JSON.parse(localStorage.getItem(key) || '[]');
      if (!members.some(m => m.email === cu.email)) {
        members.push({ id: Date.now(), name: cu.name, email: cu.email, joinDate: new Date().toISOString().split('T')[0] });
        localStorage.setItem(key, JSON.stringify(members));
      }
    } catch {}
  }

  function show(el) { if (el) el.style.display = ''; }
  function hide(el) { if (el) el.style.display = 'none'; }

  function resetErrors() {
    if (signupError) signupError.textContent = '';
    if (loginError) loginError.textContent = '';
    if (createMessError) createMessError.textContent = '';
    if (joinMessError) joinMessError.textContent = '';
  }

  // Initial state — app shuru te kon view dekhabo ta set kora
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('currentUser')); } catch { return null; } })();
  const currentMess = (() => { try { return JSON.parse(localStorage.getItem('currentMess')); } catch { return null; } })();

  if (currentUser && currentMess) {
    // if already in some mess, proceed to dashboard
    window.location.href = 'index.html';
    return;
  }

  if (currentUser && !currentMess) {
    // Loginned but didn't join any mess
    const authSection = document.getElementById('auth-section');
    hide(authSection);
    show(postAuthSection);
    hide(createMessForm);
    hide(joinMessForm);
    show(chooseCreateBtn);
    show(chooseJoinBtn);
    hide(proceedDashboardBtn);
  } else {
    // didn't sign up, default login view
    const authSection = document.getElementById('auth-section');
    show(authSection);
    hide(postAuthSection);
    showLogin();
  }

  // Toggle helpers — signup/login toggle korar function gula
  function showSignup() {
    resetErrors();
    show(signupForm);
    hide(loginForm);
  }
  function showLogin() {
    resetErrors();
    hide(signupForm);
    show(loginForm);
  }

  if (showSignupBtn) showSignupBtn.addEventListener('click', showSignup);
  if (showLoginBtn) showLoginBtn.addEventListener('click', showLogin);

  // OTP elements & setup 
  const sendOtpBtn = document.getElementById('send-otp');
  const signupOtpInput = document.getElementById('signup-otp');
  const otpStatus = document.getElementById('otp-status');
  let otpCooldownUntil = 0;
  initEmailJS();

  function setOtpStatus(msg, ok = false) {
    if (otpStatus) {
      otpStatus.textContent = msg;
      otpStatus.style.color = ok ? '#b7f7b7' : '#ffb3b3';
    }
  }
  function remainingCooldown() {
    const now = Date.now();
    return Math.max(0, otpCooldownUntil - now);
  }
  function startCooldown(ms) {
    otpCooldownUntil = Date.now() + ms;
  }

  if (sendOtpBtn) {
    sendOtpBtn.addEventListener('click', async () => {
      const emailEl = document.getElementById('signup-email');
      const email = emailEl ? emailEl.value.trim() : '';
      if (!email) {
        setOtpStatus('Please enter your email first.');
        return;
      }
      const rem = remainingCooldown();
      if (rem > 0) {
        setOtpStatus(`Please wait ${Math.ceil(rem/1000)}s before requesting another OTP.`);
        return;
      }
      const otp = genOTP();
      try {
        await sendOtpEmail(email, otp);
        storeOTP(email, otp);
        setOtpStatus('OTP sent! Please check your email.', true);
        startCooldown(90 * 1000); 
      } catch (err) {
        console.error('OTP send failed', err);
        const detail = (err && (err.text || err.message)) ? (err.text || err.message) : 'Please try again later.';
        setOtpStatus(`Failed to send OTP: ${detail}`);
      }
    });
  }

  // Signup — form submit handle 
  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      resetErrors();
      const name = document.getElementById('signup-name').value.trim();
      const id = document.getElementById('signup-id').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value;
      const enteredOtp = signupOtpInput ? signupOtpInput.value.trim() : '';

      if (!name || !id || !email || !password || password.length < 6) {
        if (signupError) signupError.textContent = 'Please fill all fields. Password must be at least 6 characters.';
        return;
      }

      // OTP verification 
      const rec = getStoredOTP();
      if (!rec || rec.email !== email || rec.expiry < Date.now() || hashOTP(enteredOtp) !== rec.h) {
        setOtpStatus('Invalid or expired OTP.');
        return;
      }
      clearStoredOTP();

      const users = getUsers();
      if (users.some(u => u.id === id)) {
        if (signupError) signupError.textContent = 'This Unique ID is already taken.';
        return;
      }
      if (users.some(u => u.email === email)) {
        if (signupError) signupError.textContent = 'This email is already registered.';
        return;
      }
      users.push({ id, name, email, password });
      setUsers(users);
      localStorage.setItem('currentUser', JSON.stringify({ id, name, email }));

      // Mess selection show
      const authSection = document.getElementById('auth-section');
      hide(authSection);
      show(postAuthSection);
      hide(createMessForm);
      hide(joinMessForm);
      show(chooseCreateBtn);
      show(chooseJoinBtn);
      hide(proceedDashboardBtn);
    });
  }

  // Login section
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      resetErrors();
      const loginIdOrEmail = document.getElementById('login-id').value.trim();
      const password = document.getElementById('login-password').value;
      const users = getUsers();
      const user = users.find(u => u.id === loginIdOrEmail || u.email === loginIdOrEmail);
      if (!user || user.password !== password) {
        if (loginError) loginError.textContent = 'Invalid credentials.';
        return;
      }
      localStorage.setItem('currentUser', JSON.stringify({ id: user.id, name: user.name, email: user.email }));

      const cm = (() => { try { return JSON.parse(localStorage.getItem('currentMess')); } catch { return null; } })();
      if (cm && cm.messId) {
        window.location.href = 'index.html';
        return;
      }

      // New logic: wheather User is already member of some mess (by members:<messId> )
      try {
        const cu2 = (() => { try { return JSON.parse(localStorage.getItem('currentUser')); } catch { return null; } })();
        let foundMessId = null;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('members:')) {
            const messIdCandidate = key.split(':')[1];
            const members = (() => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } })();
            if (cu2 && members.some(m => m.email === cu2.email)) {
              foundMessId = messIdCandidate;
              break;
            }
          }
        }
        if (foundMessId) {
          const messesObj = getMesses();
          const role = messesObj[foundMessId] && messesObj[foundMessId].createdBy === (cu2 ? cu2.id : null) ? 'manager' : 'member';
          localStorage.setItem('currentMess', JSON.stringify({ messId: foundMessId, role }));
          window.location.href = 'index.html';
          return;
        }
      } catch {}

      // Mess not existed
      const authSection = document.getElementById('auth-section');
      hide(authSection);
      show(postAuthSection);
      hide(createMessForm);
      hide(joinMessForm);
      show(chooseCreateBtn);
      show(chooseJoinBtn);
      hide(proceedDashboardBtn);
    });
  }

  // Create/Join choose korar options
  if (chooseCreateBtn) chooseCreateBtn.addEventListener('click', () => {
    resetErrors();
    show(createMessForm);
    hide(joinMessForm);
  });
  if (chooseJoinBtn) chooseJoinBtn.addEventListener('click', () => {
    resetErrors();
    show(joinMessForm);
    hide(createMessForm);
  });

  // Mess create (manager) — manager hisebe mess create kora
  if (createMessForm) {
    createMessForm.addEventListener('submit', (e) => {
      e.preventDefault();
      resetErrors();
      const messId = document.getElementById('create-mess-id').value.trim();
      const messPassword = document.getElementById('create-mess-password').value;
      if (!messId || !messPassword) {
        if (createMessError) createMessError.textContent = 'Please provide Mess ID and password.';
        return;
      }
      const messes = getMesses();
      if (messes[messId]) {
        if (createMessError) createMessError.textContent = 'Mess ID already exists.';
        return;
      }
      // Mess create
      const cu = (() => { try { return JSON.parse(localStorage.getItem('currentUser')); } catch { return null; } })();
      messes[messId] = { password: messPassword, createdBy: cu ? cu.id : null, createdAt: Date.now() };
      setMesses(messes);
      localStorage.setItem('currentMess', JSON.stringify({ messId, role: 'manager' }));
      addSelfToMembers(messId);
      window.location.href = 'index.html';
    });
  }

  // Mess join (member) — join mess as a member
  if (joinMessForm) {
    joinMessForm.addEventListener('submit', (e) => {
      e.preventDefault();
      resetErrors();
      const messId = document.getElementById('join-mess-id').value.trim();
      const messPassword = document.getElementById('join-mess-password').value;
      const messes = getMesses();
      const mess = messes[messId];
      if (!mess) {
        if (joinMessError) joinMessError.textContent = 'Mess not found.';
        return;
      }
      if (mess.password !== messPassword) {
        if (joinMessError) joinMessError.textContent = 'Incorrect mess password.';
        return;
      }
      // setting member his role
      localStorage.setItem('currentMess', JSON.stringify({ messId, role: 'member' }));
      const cuJoin = JSON.parse(localStorage.getItem('currentUser'));
      const membersKey = `members:${messId}`;
      const members = JSON.parse(localStorage.getItem(membersKey) || '[]');
      if (cuJoin && !members.some(m => m.email === cuJoin.email)) {
        members.push({ id: Date.now(), name: cuJoin.name, email: cuJoin.email, joinDate: new Date().toISOString().split('T')[0] });
        localStorage.setItem(membersKey, JSON.stringify(members));
      }
      window.location.href = 'index.html';
    });
  }

  if (proceedDashboardBtn) {
    proceedDashboardBtn.addEventListener('click', () => {
      const cm = (() => { try { return JSON.parse(localStorage.getItem('currentMess')); } catch { return null; } })();
      if (cm && cm.messId) {
        window.location.href = 'index.html';
      }
    });
  }
  // Login page navbar e Local Data clear korar link
  const clearLink = document.getElementById('clear-local-data');
  if (clearLink) {
    clearLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('This will delete all mess info stored locally on this device. Continue?')) {
        try {
          const keysToRemove = [
            'users',
            'messes',
            'currentUser',
            'currentMess',
            'tasks',
            'debts',
            'notices',
            'expenses',
            'mealCounts',
            'mealBudget',
            'reviews'
          ];
          const prefixRemovals = ['members:'];
          const allKeys = [];
          for (let i = 0; i < localStorage.length; i++) {
            allKeys.push(localStorage.key(i));
          }
          allKeys.forEach((key) => {
            if (keysToRemove.includes(key) || prefixRemovals.some(p => key.startsWith(p))) {
              localStorage.removeItem(key);
            }
          });
          alert('All local mess data has been cleared.');
        } catch (err) {
          console.error('Failed clearing local data', err);
        } finally {
          window.location.href = 'login.html';
        }
      }
    });
  }

  // Reset password — Forgot password OTP flow (DOM loaded scope)
  let resetOtpCooldownUntil = 0;
  function setResetOtpStatus(msg, ok = false) {
    if (resetOtpStatus) {
      resetOtpStatus.textContent = msg;
      resetOtpStatus.style.color = ok ? '#b7f7b7' : '#ffb3b3';
    }
  }
  function remainingResetCooldown() {
    const now = Date.now();
    return Math.max(0, resetOtpCooldownUntil - now);
  }
  function startResetCooldown(ms) {
    resetOtpCooldownUntil = Date.now() + ms;
  }

  // Reset UI toggle — reset form dekhano ba login e ferot jawa
  if (showResetLink) {
    showResetLink.addEventListener('click', (e) => {
      e.preventDefault();
      resetErrors();
      hide(signupForm);
      hide(loginForm);
      show(resetForm);
    });
  }
  const resetBackLoginBtn = document.getElementById('reset-back-login');
  if (resetBackLoginBtn) {
    resetBackLoginBtn.addEventListener('click', () => {
      resetErrors();
      hide(resetForm);
      showLogin();
    });
  }

  // Reset OTP pathano — user-er email e reset OTP pathano
  if (sendResetOtpBtn) {
    sendResetOtpBtn.addEventListener('click', async () => {
      const idOrEmailEl = document.getElementById('reset-id-or-email');
      const idOrEmail = idOrEmailEl ? idOrEmailEl.value.trim() : '';
      if (!idOrEmail) {
        setResetOtpStatus('Please enter your Unique ID or email first.');
        return;
      }
      const users = getUsers();
      const user = users.find(u => u.id === idOrEmail || u.email === idOrEmail);
      if (!user) {
        setResetOtpStatus('User not found.');
        return;
      }
      const rem = remainingResetCooldown();
      if (rem > 0) {
        setResetOtpStatus(`Please wait ${Math.ceil(rem/1000)}s before requesting another OTP.`);
        return;
      }
      const otp = genOTP();
      try {
        // Password reset er jonno message
        await sendOtpEmail(user.email, otp);
        storeResetOTP(user.email, otp);
        setResetOtpStatus('OTP sent! Please check your email.', true);
        startResetCooldown(90 * 1000); // 90s cooldown
      } catch (err) {
        console.error('Reset OTP send failed', err);
        const detail = (err && (err.text || err.message)) ? (err.text || err.message) : 'Please try again later.';
        setResetOtpStatus(`Failed to send OTP: ${detail}`);
      }
    });
  }

  // Reset form submit — OTP verify kore new password set kora
  if (resetForm) {
    resetForm.addEventListener('submit', (e) => {
      e.preventDefault();
      resetErrors();
      const idOrEmailEl = document.getElementById('reset-id-or-email');
      const idOrEmail = idOrEmailEl ? idOrEmailEl.value.trim() : '';
      const newPassword = resetNewPasswordInput ? resetNewPasswordInput.value : '';
      const enteredOtp = resetOtpInput ? resetOtpInput.value.trim() : '';

      if (!idOrEmail || !newPassword || newPassword.length < 6 || !enteredOtp) {
        if (resetError) resetError.textContent = 'Please fill all fields. Password must be at least 6 characters.';
        return;
      }

      const users = getUsers();
      const userIndex = users.findIndex(u => u.id === idOrEmail || u.email === idOrEmail);
      if (userIndex === -1) {
        if (resetError) resetError.textContent = 'User not found.';
        return;
      }
      const user = users[userIndex];

      const rec = getStoredResetOTP();
      if (!rec || rec.email !== user.email || rec.expiry < Date.now() || hashOTP(enteredOtp) !== rec.h) {
        setResetOtpStatus('Invalid or expired OTP.');
        return;
      }

      // Password update
      users[userIndex] = { ...user, password: newPassword };
      setUsers(users);
      clearStoredResetOTP();

      setResetOtpStatus('Password reset successful. Please log in.', true);
      hide(resetForm);
      showLogin();
    });
  }
});

// Duplicate DOMContentLoaded block remove kora hoyeche, jate logic conflict na hoy


// EmailJS OTP Setup — OTP pathanor setup
const EMAILJS_PUBLIC_KEY = '8dyObXNkH9b_b0pxk'; // Shudhu public key rakha (secret na)
const EMAILJS_SERVICE_ID = 'service_64jyzq6';
const EMAILJS_TEMPLATE_ID = 'template_clgx4oc';

function initEmailJS() {
  try {
    if (window.emailjs) {
      window.emailjs.init(EMAILJS_PUBLIC_KEY);
    }
  } catch (e) { console.warn('EmailJS init failed', e); }
}

function genOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOTP(otp) {
  // Simple hash obfuscation er jonno, security na
  let h = 0;
  for (let i = 0; i < otp.length; i++) h = ((h << 5) - h) + otp.charCodeAt(i);
  return String(h);
}

function storeOTP(email, otp, ttlMs = 15 * 60 * 1000) {
  const expiry = Date.now() + ttlMs;
  const record = { email, h: hashOTP(otp), expiry };
  localStorage.setItem('signupOTP', JSON.stringify(record));
}

function getStoredOTP() {
  try { return JSON.parse(localStorage.getItem('signupOTP')); } catch { return null; }
}

function clearStoredOTP() {
  localStorage.removeItem('signupOTP');
}

function sendOtpEmail(email, otp) {
  const expiry_time = new Date(Date.now() + 15 * 60 * 1000).toLocaleString();
  const params = {
    to_email: email,
    otp_code: otp,
    passcode: otp,
    app_name: 'MESS-MATE',
    expiry_time,
    time: expiry_time,
    message: `Your verification code is ${otp} for MESS-MATE. It expires at ${expiry_time}. Do not share this code.`
  };
  if (!window.emailjs) {
    throw new Error('EmailJS SDK not loaded');
  }
  return window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params, EMAILJS_PUBLIC_KEY);
}

// Duplicate reset password block removed; logic is handled inside the DOMContentLoaded closure above

// Reset OTP storage helpers — signup OTP theke alada
function storeResetOTP(email, otp, ttlMs = 15 * 60 * 1000) {
  const expiry = Date.now() + ttlMs;
  const record = { email, h: hashOTP(otp), expiry };
  localStorage.setItem('resetOTP', JSON.stringify(record));
}
function getStoredResetOTP() {
  try { return JSON.parse(localStorage.getItem('resetOTP')); } catch { return null; }
}
function clearStoredResetOTP() {
  localStorage.removeItem('resetOTP');
}