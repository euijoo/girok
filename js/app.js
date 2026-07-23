(function () {
  'use strict';

  const beanInfo = [
    {
      name: '짙은',
      description: '브라질·콜롬비아 기반의 미디엄 다크 블렌드로, 아몬드·브라운 슈거·초콜릿 느낌에 묵직한 바디감이 특징입니다.'
    },
    {
      name: '산들',
      description: '에티오피아 기반의 미디엄 라이트 블렌드로, 딸기·블루베리·홍차 같은 산뜻한 풍미와 깔끔한 피니시가 특징입니다.'
    },
    {
      name: '고요',
      description: '디카페인 블렌드로, 다크초콜릿·호박엿·군고구마 같은 고소한 맛에 쥬시한 마무리가 어우러집니다.'
    }
  ];

  const labels = ['종류', 'HOT', 'ICE', '기본'];

  const elements = {
    board: document.getElementById('menu-content'),
    beanList: document.getElementById('beanList'),
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
    activeTheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    menuData: []
  };

  init();

  async function init() {
    applyTheme(state.activeTheme);
    renderBeans();
    bindEvents();
    await loadMenuData();
    updateSummary();
    renderMenus();
  }

  async function loadMenuData() {
    try {
      const response = await fetch('./menu-data.json');
      if (!response.ok) throw new Error('menu-data.json load failed');
      const rawItems = await response.json();
      state.menuData = rawItems.map(transformMenuItem);
    } catch (error) {
      console.error(error);
      state.menuData = [];
      if (elements.board) {
        elements.board.innerHTML =
          '<div class="panel" style="background: var(--color-surface);">' +
          '<div class="empty-note">menu-data.json을 불러오지 못했습니다.</div>' +
          '</div>';
      }
    }
  }

  function transformMenuItem(item) {
    return {
      category: item.category,
      titleKo: item.name_ko,
      titleEn: toTitleCase(item.name_en || ''),
      recipe: {
        sections: parseRecipe(item.recipe || '')
      },
      meta: {
        price: item.price,
        options: Array.isArray(item.options) ? item.options : [],
        description: item.description || '',
        notes: item.notes || '',
        image: item.image || null
      }
    };
  }

  function parseRecipe(recipeText) {
    const text = String(recipeText || '')
      .replace(/
/g, '
')
      .replace(/
/g, '
')
      .trim();
    if (!text) {
      return [];
    }

    const sections = [];
    const pattern = /(종류|HOT|ICE|기본):/g;
    const matches = [...text.matchAll(pattern)];

    if (matches.length) {
      matches.forEach((match, index) => {
        const label = match[1];
        const start = match.index + match[0].length;
        const end = index + 1 < matches.length ? matches[index + 1].index : text.length;
        const content = text.slice(start, end).trim().replace(/
/g, ' / ');
        sections.push({
          label,
          steps: splitSteps(content)
        });
      });
      return sections;
    }

    return [
      {
        label: '기본',
        steps: text
          .split('
')
          .map((line) => line.trim())
          .filter(Boolean)
      }
    ];
  }

  function splitSteps(text) {
    return String(text)
      .split('/')
      .map((part) => part.trim())
      .filter(Boolean);
  }

  function toTitleCase(text) {
    return String(text)
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  function bindEvents() {
    if (elements.themeToggle) {
      elements.themeToggle.addEventListener('click', handleThemeToggle);
    }

    elements.chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        elements.chips.forEach((button) => button.classList.remove('active'));
        chip.classList.add('active');
        state.activeFilter = chip.dataset.filter || 'ALL';
        renderMenus();
      });
    });

    elements.closeSheetButtons.forEach((button) => {
      button.addEventListener('click', closeSheet);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeSheet();
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
      elements.totalCount.textContent = `${state.menuData.length}개 메뉴`;
    }
  }

  function renderBeans() {
    if (!elements.beanList) return;
    elements.beanList.innerHTML = beanInfo
      .map(
        (bean) => `
      <article class="bean-card">
        <h3>${escapeHtml(bean.name)}</h3>
        <p>${escapeHtml(bean.description)}</p>
      </article>
    `
      )
      .join('');
  }

  function getFilteredMenus() {
    return state.menuData.filter(
      (item) => state.activeFilter === 'ALL' || item.category === state.activeFilter
    );
  }

  function groupMenusByCategory(items) {
    return ['COFFEE', 'TEA', 'DRINK']
      .map((category) => ({
        category,
        items: items.filter((item) => item.category === category)
      }))
      .filter((group) => group.items.length > 0);
  }

  function getPanelDescription(category) {
    const descriptions = {
      COFFEE: '에스프레소와 원두 기반 커피 메뉴',
      TEA: '청과 티백 중심의 티 메뉴',
      DRINK: '라떼, 에이드, 블렌디드 음료 메뉴'
    };
    return descriptions[category] || '';
  }

  function createMenuItemMarkup(item) {
    const sectionBadges = (item.recipe?.sections || [])
      .map((section) => `<span class="badge">${escapeHtml(section.label)}</span>`)
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
      elements.board.innerHTML =
        '<div class="panel" style="background: var(--color-surface);">' +
        '<div class="empty-note">표시할 메뉴가 없습니다.</div>' +
        '</div>';
      return;
    }

    elements.board.innerHTML = groupedMenus.map(createPanelMarkup).join('');
    bindMenuEvents();
  }

  function bindMenuEvents() {
    const buttons = Array.from(document.querySelectorAll('.menu-item'));
    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        const menu = state.menuData.find((item) => item.titleKo === button.dataset.menu);
        if (menu) openSheet(menu);
      });
    });
  }

  function openSheet(menu) {
    if (
      !elements.recipeSheet ||
      !elements.sheetTitle ||
      !elements.sheetSubtitle ||
      !elements.sheetContent
    )
      return;

    elements.sheetTitle.textContent = menu.titleKo;
    elements.sheetSubtitle.textContent = menu.titleEn;

    const sections = Array.isArray(menu.recipe?.sections) ? menu.recipe.sections : [];
    const meta = menu.meta || {};

    const hasImage = !!meta.image;

    const imageBlock = hasImage
      ? `<img src="${escapeHtml(meta.image)}" alt="${escapeHtml(menu.titleKo)}" />`
      : '<div class="sheet-image-placeholder">이미지 영역</div>';

    const descriptionBlock = meta.description
      ? `<p class="sheet-desc">${escapeHtml(meta.description)}</p>`
      : '';

    const optionsBlock =
      meta.options && meta.options.length
        ? `<section class="sheet-section sheet-section--options">
             <h4 class="sheet-section-title">옵션</h4>
             <ul class="sheet-options">
               ${meta.options.map((option) => `<li>${escapeHtml(option)}</li>`).join('')}
             </ul>
           </section>`
        : '';

    const notesBlock = meta.notes
      ? `<section class="sheet-section sheet-section--notes">
           <h4 class="sheet-section-title">노트</h4>
           <p class="sheet-notes-text">${escapeHtml(meta.notes)}</p>
         </section>`
      : '';

    const recipeBlock = sections
      .map(
        (section) => `
      <section class="sheet-section">
        <h4 class="sheet-section-title">${escapeHtml(section.label)}</h4>
        <ol class="sheet-steps">
          ${(section.steps || []).map((step) => `<li>${escapeHtml(step)}</li>`).join('')}
        </ol>
      </section>
    `
      )
      .join('');

    elements.sheetContent.innerHTML = `
      <div class="sheet-image-frame">
        ${imageBlock}
      </div>
      <div class="sheet-body">
        ${descriptionBlock}
        ${optionsBlock}
        ${notesBlock}
        ${recipeBlock}
      </div>
    `;

    elements.recipeSheet.classList.add('open');
    elements.recipeSheet.classList.add('sheet--full');
    elements.recipeSheet.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeSheet() {
    if (!elements.recipeSheet) return;
    elements.recipeSheet.classList.remove('open');
    elements.recipeSheet.classList.remove('sheet--full');
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
})();
