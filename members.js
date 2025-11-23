// members.js
// members.html page-e member management features initialize kora

document.addEventListener('DOMContentLoaded', () => {
  // Access gate — page access control kora
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
  initMemberManagement();
});