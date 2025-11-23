// meals.js
// meals.html page-e meal planner ebong budget calculator features initialize kora

document.addEventListener('DOMContentLoaded', () => {
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
  initMealPlanner();
  initMealBudgetCalculator();
});