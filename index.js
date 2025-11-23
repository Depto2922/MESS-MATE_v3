// index.js
// index.html page-e dashboard-specific features initialize kora

document.addEventListener('DOMContentLoaded', function() {
  // Authenticated na thakle ba mess select na thakle login page-e redirect kora
  try {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const mess = JSON.parse(localStorage.getItem('currentMess'));
    if (!user || !mess) {
      window.location.href = 'login.html';
      return;
    }
  } catch (e) {
    window.location.href = 'login.html';
    return;
  }

  // Helper — mess-related shob local data clear kora
  function clearMessData() {
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

  // Get Started button click hole dashboard-e scroll kora
  const getStartedBtn = document.getElementById('get-started-btn');
  if (getStartedBtn) {
    getStartedBtn.addEventListener('click', function() {
      const dashboardSection = document.getElementById('dashboard');
      if (dashboardSection) {
        dashboardSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // Current user-er nam kono jaygay dekhano jodi proyojon hoy
  const heroContent = document.querySelector('.hero-content');
  const user = JSON.parse(localStorage.getItem('currentUser'));
  const mess = JSON.parse(localStorage.getItem('currentMess'));
  if (heroContent && user && mess) {
    const info = document.createElement('p');
    info.style.marginTop = '0.5rem';
    info.style.color = 'var(--text-muted)';
    info.textContent = `Logged in as ${user.name} (${mess.role}) — Mess: ${mess.messId}`;
    heroContent.appendChild(info);
  }

  // Navbar-e dynamically logout ebong clear data links add kora
  const navbar = document.querySelector('.navbar nav');
  if (navbar) {
    const logoutBtn = document.createElement('a');
    logoutBtn.href = '#logout';
    logoutBtn.textContent = 'Logout';
    logoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      localStorage.removeItem('currentUser');
      localStorage.removeItem('currentMess');
      window.location.href = 'login.html';
    });
    navbar.appendChild(logoutBtn);


  }

  // Profile info populate kora
  const cu = JSON.parse(localStorage.getItem('currentUser'));
  const cm = JSON.parse(localStorage.getItem('currentMess'));
  const nameEl = document.getElementById('current-user-name');
  const emailEl = document.getElementById('current-user-email');
  const roleEl = document.getElementById('current-user-role');
  const messEl = document.getElementById('current-mess-id');
  if (cu && cm) {
    if (nameEl) nameEl.textContent = cu.name;
    if (emailEl) emailEl.textContent = cu.email;
    if (roleEl) roleEl.textContent = cm.role;
    if (messEl) messEl.textContent = cm.messId;
  }

  // Members overview populate kora
  const listEl = document.getElementById('members-overview-list');
  if (listEl && cm) {
    const key = `members:${cm.messId}`;
    const members = JSON.parse(localStorage.getItem(key) || '[]');
    listEl.innerHTML = '';
    if (members.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No members added yet.';
      listEl.appendChild(li);
    } else {
      // Calculate meal rate and shared cost
      const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
      const mealCounts = JSON.parse(localStorage.getItem('mealCounts') || '[]');
      const totalMealExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const totalMeals = mealCounts.reduce((sum, m) => sum + (Number(m.total) || 0), 0);
      const mealRate = totalMeals > 0 ? (totalMealExpenses / totalMeals) : 0;
      const allShared = JSON.parse(localStorage.getItem('sharedExpenses') || '[]');
      const totalSharedCost = allShared.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const membersCount = members.length > 0 ? members.length : 1;
      const perMemberShared = membersCount > 0 ? (totalSharedCost / membersCount) : 0;
      const depositsKey = typeof storageKey === 'function' ? storageKey('deposits') : `deposits:${cm.messId}`;
      const allDeposits = JSON.parse(localStorage.getItem(depositsKey) || '[]');

      members.forEach(m => {
        const memberMealCounts = mealCounts.filter(mealCount => mealCount.memberId == m.id);
        const memberTotalMeals = memberMealCounts.reduce((sum, mealCount) => sum + (Number(mealCount.total) || 0), 0);
        const mealCost = memberTotalMeals * mealRate;
        const depositSum = allDeposits
          .filter(d => d.memberId == m.id || d.memberEmail === m.email)
          .reduce((s, d) => s + (Number(d.amount) || 0), 0);
        const totalIndCost = mealCost + perMemberShared;
        const remaining = depositSum - totalIndCost;

        const li = document.createElement('li');
        li.className = 'members-overview-row';
        const nameSpan = document.createElement('span');
        nameSpan.className = 'member-name';
        nameSpan.textContent = m.name;
        const balanceSpan = document.createElement('span');
        balanceSpan.className = 'member-balance';
        balanceSpan.textContent = `${remaining.toFixed(2)} BDT`;
        if (remaining < 0) balanceSpan.classList.add('negative');
        li.appendChild(nameSpan);
        li.appendChild(balanceSpan);
        listEl.appendChild(li);
      });
    }
  }

  // index.html-e ja modules ache segula initialize kora
  initDebtTracker();
  initDeposits();
  initNoticeBoard();
  initNoticeTicker();
  initReviews();
});