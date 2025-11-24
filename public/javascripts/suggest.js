// Autocomplete for the search input on index.hbs
(function(){
  const input = document.getElementById('q');
  if (!input) return;

  // Create suggestions container
  const container = document.createElement('div');
  container.className = 'search-suggestions';
  input.parentNode && input.parentNode.insertBefore(container, input.nextSibling);

  let timer = null;

  function clearSuggestions() {
    container.innerHTML = '';
    container.style.display = 'none';
  }

  function renderSuggestions(items) {
    container.innerHTML = '';
    if (!items || items.length === 0) return clearSuggestions();
    items.forEach(s => {
      const el = document.createElement('div');
      el.className = 'suggestion-item';
      el.tabIndex = 0;
      el.innerHTML = `${s.thumb ? '<img src="'+s.thumb+'" alt=""/>' : ''}<span class="s-title">${s.title}</span>`;
      el.addEventListener('click', () => {
        input.value = s.title;
        clearSuggestions();
        input.form && input.form.submit();
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          input.value = s.title;
          clearSuggestions();
          input.form && input.form.submit();
        }
      });
      container.appendChild(el);
    });
    container.style.display = 'block';
  }

  async function fetchSuggestions(q) {
    if (!q) return renderSuggestions([]);
    try {
      const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`);
      if (!res.ok) return renderSuggestions([]);
      const data = await res.json();
      renderSuggestions(data.suggestions || []);
    } catch (e) {
      console.error('Suggest fetch error', e);
      renderSuggestions([]);
    }
  }

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    timer = setTimeout(() => fetchSuggestions(q), 250);
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target) && e.target !== input) clearSuggestions();
  });
})();
