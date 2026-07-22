(function () {
  'use strict';

  const menuData = Array.isArray(window.menuData) ? window.menuData : [];

  const elements = {
    board: document.getElementById('menu-content'),
    searchInput: document.getElementById('searchInput'),
    chips: Array.from(document.querySelectorAll('.chip')),
    recipeSheet: document.getElementById('recipeSheet'),
    sheetTitle: document.getElementById('sheetTitle'),
    sheetSubtitle: document.getElementById('sheetSubtitle'),
    sheetContent: document.getElementById('sheetContent'),
    totalCount: document.getElementById('totalCount'),
    recipeCount: document.getElementById('recipeCount'),
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
    bindEvents();
    render();
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

  function updateSummary() {
    if (elements.totalCount) {
      elements.totalCount.textContent = `${menuData.length}개 메뉴`;
    }

    if (elements.recipeCount) {
      const recipeLinkedCount = menuData.filter(item => item.recipe).length;
      elements.recipeCount.textContent = `${recipeLinkedCount}개 레시피`;
    }
  }

  function bindEvents() {
    if (elements.themeToggle) {
      elements.themeToggle.addEventListener('click', handleThemeToggle);
    }

    if (elements.searchInput) {
      elements.searchInput.addEventListener('input', render);
    }

    elements.chips.forEach(chip => {
      chip.addEventListener('click', () => {
        elements.chips.forEach(button => button.classList.remove('active'));
        chip.classList.add('active');
        state.activeFilter = chip.dataset.filter || 'ALL';
        render();
      });
    });

    elements.closeSheetButtons.forEach(button => {
      button.addEventListener('click', closeSheet);
    });

    document.addEventListener('keydown', handleKeydown);
  }

  function handleThemeToggle() {
    const nextTheme = state.activeTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      closeSheet();
    }
  }

  function normalizeText(value) {
    return String(value || '').trim().toLowerCase();
  }

  function getFilteredMenus() {
    const keyword = normalizeText(elements.searchInput ? elements.searchInput.value : '');

    return menuData.filter(item => {
      const matchesFilter =
        state.activeFilter === 'ALL' || item.category === state.activeFilter;

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
      COFFEE: '에스프레소, 라떼, 브루잉 기반 메뉴',
      TEA: '허브티와 홍차 중심의 티 메뉴',
      DRINK: '논커피와 에이드, 시즌 음료 메뉴'
    };

    return descriptions[category] || '';
  }

  function getBadgeClassName(tag) {
    if (tag.includes('미등록')) return 'badge pending';
    if (tag.includes('완료')) return 'badge highlight';
    return 'badge';
  }

  function createMenuItemMarkup(item) {
    const badges = (item.tags || [])
      .map(tag => `<span class="${getBadgeClassName(tag)}">${escapeHtml(tag)}</span>`)
      .join('');

    return `
      <button class="menu-item" type="button" data-menu="${escapeHtml(item.titleKo)}">
        <div class="item-top">
          <div class="name-block">
            <span class="name-ko">${escapeHtml(item.titleKo)}</span>
            <span class="name-en">${escapeHtml(item.titleEn)}</span>
          </div>
          <span class="price">${escapeHtml(item.price)}원</span>
        </div>
        <div class="item-bottom">${badges}</div>
      </button>
    `;
  }

  function createPanelMarkup(group) {
    return `
      <section class="panel" data-panel="${escapeHtml(group.category)}" id="section-${escapeHtml(group.category)}">
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

  function render() {
    if (!elements.board) return;

    const filteredMenus = getFilteredMenus();
    const groupedMenus = groupMenusByCategory(filteredMenus);

    if (!groupedMenus.length) {
      elements.board.innerHTML = `
        <div class="panel" style="background:var(--color-surface);">
          <div class="empty-note">검색 결과가 없습니다.</div>
        </div>
      `;
      return;
    }

    elements.board.innerHTML = groupedMenus.map(createPanelMarkup).join('');
    bindMenuItemEvents();
  }

  function bindMenuItemEvents() {
    const menuButtons = Array.from(document.querySelectorAll('.menu-item'));

    menuButtons.forEach(button => {
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
    elements.sheetSubtitle.textContent = `${menu.category} · ${menu.price}원 · ${menu.titleEn}`;

    if (!menu.recipe) {
      elements.sheetContent.innerHTML = `
        <div class="recipe-card">
          <h4>레시피 상태</h4>
          <p>아직 레시피가 등록되지 않았습니다. 나중에 재료와 제조 순서를 추가하면 됩니다.</p>
        </div>
      `;
    } else {
      elements.sheetContent.innerHTML = `
        <div class="recipe-card">
          <h4>메뉴 설명</h4>
          <p>${escapeHtml(menu.description)}</p>
        </div>
        <div class="recipe-card">
          <h4>레시피 요약</h4>
          <p>${escapeHtml(menu.recipe.summary)}</p>
        </div>
        <div class="recipe-card">
          <h4>재료</h4>
          <ul>${(menu.recipe.ingredients || []).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </div>
        <div class="recipe-card">
          <h4>제조 순서</h4>
          <ul>${(menu.recipe.steps || []).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </div>
      `;
    }

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
