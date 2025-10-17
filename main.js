document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('start-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const players = Number(document.getElementById('players').value || 5);
      window.location.href = `/trainer?players=${Math.max(2, Math.min(9, players))}`;
    });
  }
});



