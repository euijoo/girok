(function () {
  'use strict';

  const menuData = Array.isArray(window.menuData) ? window.menuData : [];
  const beanInfo = Array.isArray(window.beanInfo) ? window.beanInfo : [];

  const elements = {
    board: document.getElementById('menu-content'),
    beanList: document.getElementById('beanList'),
    searchInput: document.getElementById('searchInput'),
    chips: Array.from(document.querySelectorAll('.chip')),
    recipeSheet: document.getElementById('recipeSheet'),
    sheetTitle: document.getElementById('sheetTitle'),
    sheetSubtitle: document.getElementById('sheetSubtitle'),
    sheetContent: document.getElementById('sheetContent'),
    totalCount: document.getElementById('totalCount'),
    themeToggle: document.querySelector('[data-theme-toggle]'),
    closeSheetButtons: Array.from(document.querySelectorAll('[data-close-sheet]'))
  };

  const state = {
    activeFilter: 'ALL',
    activeTheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  };

  function init() {
    applyTheme(state.activeTheme);
    updateSummary();
    renderBeans();
    bindEvents();
    renderMenus();
  }

  function bindEvents() {
    if (elements.themeToggle) {
      elements.themeToggle.addEventListener('click', handleThemeToggle);
    }

    if (elements.searchInput) {
      elements.searchInput.addEventListener('input', renderMenus);
    }

    elements.chips.forEach(chip => {
      chip.addEventListener('click', () => {
        elements.chips.forEach(button => button.classList.remove('active'));
        chip.classList.add('active');
        state.activeFilter = chip.dataset.filter || 'ALL';
        renderMenus();
      });
    });

    elements.closeSheetButtons.forEach(button => {
      button.addEventListener('click', closeSheet);
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closeSheet();
      }
    });
  }

  function applyTheme(theme) {
    state.activeTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeButton();
  }

  function updateThemeButton() {
    if (!elements.themeToggle) return;

    elements.themeToggle.innerHTML =
      state.activeTheme === 'dark'
        ? '<span aria-hidden="true">☀</span>'
        : '<span aria-hidden="true">◐</span>';

    elements.themeToggle.setAttribute(
      'aria-label',
      state.activeTheme === 'dark' ? '라이트 모드 전환' : '다크 모드 전환'
    );
  }

  function handleThemeToggle() {
    applyTheme(state.activeTheme === 'dark' ? 'light' : 'dark');
  }

  function updateSummary() {
    if (elements.totalCount) {
      elements.totalCount.textContent = `${menuData.length}개 메뉴`;
    }
  }

  function renderBeans() {
    if (!elements.beanList) return;

    elements.beanList.innerHTML = beanInfo.map(bean => `
      <article class="bean-card">
        <h3>${escapeHtml(bean.name)}</h3>
        <p>${escapeHtml(bean.description)}</p>
      </article>
    `).join('');
  }

  function normalizeText(value) {
    return String(value || '').trim().toLowerCase();
  }

  function getFilteredMenus() {
    const keyword = normalizeText(elements.searchInput ? elements.searchInput.value : '');

    return menuData.filter(item => {
      const matchesFilter = state.activeFilter === 'ALL' || item.category === state.activeFilter;
      const matchesSearch =
        !keyword ||
        normalizeText(item.titleKo).includes(keyword) ||
        normalizeText(item.titleEn).includes(keyword);

      return matchesFilter && matchesSearch;
    });
  }

  function groupMenusByCategory(items) {
    return ['COFFEE', 'TEA', 'DRINK']
      .map(category => ({
        category,
        items: items.filter(item => item.category === category)
      }))
      .filter(group => group.items.length > 0);
  }

  function getPanelDescription(category) {
    const descriptions = {
      COFFEE: '에스프레소와 원두 기반 커피 메뉴',
      TEA: '청과 티백 중심의 티 메뉴',
      DRINK: '논커피, 에이드, 스무디 메뉴'
    };

    return descriptions[category] || '';
  }

  function createMenuItemMarkup(item) {
    const sectionBadges = (item.recipe?.sections || [])
      .map(section => `<span class="badge">${escapeHtml(section.label)}</span>`)
      .join('');

    return `
      <button class="menu-item" type="button" data-menu="${escapeHtml(item.titleKo)}">
        <div class="item-top">
          <div class="name-block">
            <span class="name-ko">${escapeHtml(item.titleKo)}</span>
            <span class="name-en">${escapeHtml(item.titleEn)}</span>
          </div>
        </div>
        <div class="section-badges">${sectionBadges}</div>
      </button>
    `;
  }

  function createPanelMarkup(group) {
    return `
      <section class="panel" data-panel="${escapeHtml(group.category)}">
        <div class="panel-head">
          <h2>${escapeHtml(group.category)}</h2>
          <p>${escapeHtml(getPanelDescription(group.category))}</p>
        </div>
        <div class="menu-list">
          ${group.items.map(createMenuItemMarkup).join('')}
        </div>
      </section>
    `;
  }

  function renderMenus() {
    if (!elements.board) return;

    const filteredMenus = getFilteredMenus();
    const groupedMenus = groupMenusByCategory(filteredMenus);

    if (!groupedMenus.length) {
      elements.board.innerHTML = `
        <div class="panel" style="background: var(--color-surface);">
          <div class="empty-note">검색 결과가 없습니다.</div>
        </div>
      `;
      return;
    }

    elements.board.innerHTML = groupedMenus.map(createPanelMarkup).join('');
    bindMenuEvents();
  }

  function bindMenuEvents() {
    const buttons = Array.from(document.querySelectorAll('.menu-item'));

    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const menu = menuData.find(item => item.titleKo === button.dataset.menu);
        if (menu) {
          openSheet(menu);
        }
      });
    });
  }

  function openSheet(menu) {
    if (!elements.recipeSheet || !elements.sheetTitle || !elements.sheetSubtitle || !elements.sheetContent) {
      return;
    }

    elements.sheetTitle.textContent = menu.titleKo;
    elements.sheetSubtitle.textContent = menu.titleEn;

    const sections = Array.isArray(menu.recipe?.sections) ? menu.recipe.sections : [];

    elements.sheetContent.innerHTML = sections.map(section => `
      <article class="recipe-card">
        <h4>${escapeHtml(section.label)}</h4>
        <ol>
          ${(section.steps || []).map(step => `<li>${escapeHtml(step)}</li>`).join('')}
        </ol>
      </article>
    `).join('');

    elements.recipeSheet.classList.add('open');
    elements.recipeSheet.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeSheet() {
    if (!elements.recipeSheet) return;

    elements.recipeSheet.classList.remove('open');
    elements.recipeSheet.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  init();
})();
