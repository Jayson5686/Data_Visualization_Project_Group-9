function initializeThemeControl() {
  const themeSelector = document.getElementById('theme-selector');
  if (!themeSelector) return;

  const themes = ['system', 'light', 'dark', 'high-contrast', 'color-blind'];
  let preference = themes[0];
  try {
    const savedPreference = localStorage.getItem('crashmetrics-theme');
    if (themes.includes(savedPreference)) preference = savedPreference;
  } catch (error) {
    console.warn('Unable to read saved theme preference:', error);
  }

  const applyTheme = value => {
    preference = value;
    document.documentElement.dataset.theme = preference;
  };

  const saveTheme = () => {
    try {
      localStorage.setItem('crashmetrics-theme', preference);
    } catch (error) {
      console.warn('Unable to save theme preference:', error);
    }
  };

  themeSelector.value = preference;
  applyTheme(preference);
  themeSelector.addEventListener('change', () => {
    applyTheme(themeSelector.value);
    saveTheme();
  });
}

function initializePageMagnification() {
  const magnificationSelector = document.getElementById('page-magnification');
  if (!magnificationSelector) return;

  const magnifications = ['fit', '75', '90', '100', '110'];
  let magnification = magnifications[0];
  try {
    const savedMagnification = localStorage.getItem('crashmetrics-magnification');
    if (magnifications.includes(savedMagnification)) magnification = savedMagnification;
  } catch (error) {
    console.warn('Unable to read saved page magnification:', error);
  }

  const applyMagnification = value => {
    magnification = value;
    if (value === 'fit') {
      document.documentElement.style.removeProperty('font-size');
    } else {
      document.documentElement.style.fontSize = `${value}%`;
    }
  };

  const saveMagnification = () => {
    try {
      localStorage.setItem('crashmetrics-magnification', magnification);
    } catch (error) {
      console.warn('Unable to save page magnification:', error);
    }
  };

  magnificationSelector.value = magnification;
  applyMagnification(magnification);
  magnificationSelector.addEventListener('change', () => {
    applyMagnification(magnificationSelector.value);
    saveMagnification();
  });
}

function initializePrimaryNavigationKeyboard() {
  document.querySelectorAll('.hero-nav-links, .info-page-links, .footer-nav-col').forEach(navigation => {
    navigation.addEventListener('keydown', event => {
      if ((event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') ||
          event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

      const items = [...navigation.querySelectorAll('a[href]')]
        .filter(item => item.getClientRects().length > 0);
      const currentIndex = items.indexOf(event.target);
      if (currentIndex === -1 || items.length < 2) return;

      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = (currentIndex + direction + items.length) % items.length;
      event.preventDefault();
      items[nextIndex].focus();
    });
  });
}

initializeThemeControl();
initializePageMagnification();
initializePrimaryNavigationKeyboard();
