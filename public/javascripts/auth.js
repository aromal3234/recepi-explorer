document.addEventListener('DOMContentLoaded', () => {
  // Show / hide password buttons
  document.querySelectorAll('.show-pass').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.querySelector(btn.getAttribute('data-target'));
      if (!target) return;
      if (target.type === 'password') {
        target.type = 'text';
        btn.textContent = 'Hide';
      } else {
        target.type = 'password';
        btn.textContent = 'Show';
      }
    });
  });

  // Basic signup validation: check password match
  const signup = document.getElementById('signupForm');
  if (signup) {
    signup.addEventListener('submit', (e) => {
      const p1 = document.getElementById('password');
      const p2 = document.getElementById('password2');
      if (p1 && p2 && p1.value !== p2.value) {
        e.preventDefault();
        alert('Passwords do not match');
        p2.focus();
      }
    });
  }
});
