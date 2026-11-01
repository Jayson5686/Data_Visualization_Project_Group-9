/**
 * CrashMetrics Australia — Global Main Controller
 * Handles Data Preloading, Preloader Framed Choreography, Global Tooltip Engine, and Module Coordination
 */

window.AppState = {
  datasets: {},
  activeMeasureS1: 'Hospitalisations',
  activeMeasureS2: 'Hospitalisations',
  activeYearS2: 2021,
  activeMeasureS3: 'Hospitalisations',
  activeStateS3: 'NSW',
  activeYearS4: 2021
};

const tooltipEl = document.getElementById('global-tooltip');

window.showTooltip = function(event, htmlContent) {
  if (!tooltipEl) return;
  tooltipEl.innerHTML = htmlContent;
  tooltipEl.classList.add('visible');
  tooltipEl.setAttribute('aria-hidden', 'false');

  const padding = 16;
  const tooltipRect = tooltipEl.getBoundingClientRect();
  
  let left = event.clientX;
  let top = event.clientY - 14;

  if (left - tooltipRect.width / 2 < padding) {
    left = tooltipRect.width / 2 + padding;
  } else if (left + tooltipRect.width / 2 > window.innerWidth - padding) {
    left = window.innerWidth - tooltipRect.width / 2 - padding;
  }

  if (top - tooltipRect.height < padding) {
    top = event.clientY + 26;
  }

  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top = `${top}px`;
};

window.hideTooltip = function() {
  if (!tooltipEl) return;
  tooltipEl.classList.remove('visible');
  tooltipEl.setAttribute('aria-hidden', 'true');
  const activeElement = document.activeElement;
  if (activeElement && activeElement.getAttribute('aria-describedby') === 'global-tooltip') {
    activeElement.removeAttribute('aria-describedby');
  }
};

function renderDataTable(panel, title, columns, rows) {
  const section = document.createElement('section');
  section.className = 'data-table-section';
  const heading = document.createElement('h3');
  heading.textContent = title;
  section.appendChild(heading);

  const wrapper = document.createElement('div');
  wrapper.className = 'table-scroll';
  const table = document.createElement('table');
  const caption = document.createElement('caption');
  caption.textContent = `Data values for ${title}`;
  table.appendChild(caption);

  const thead = table.createTHead();
  const headRow = thead.insertRow();
  columns.forEach(column => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = column.label;
    headRow.appendChild(th);
  });

  const tbody = table.createTBody();
  rows.forEach(row => {
    const tr = tbody.insertRow();
    columns.forEach(column => {
      const cell = tr.insertCell();
      cell.textContent = String(row[column.key] ?? '');
    });
  });
  wrapper.appendChild(table);
  section.appendChild(wrapper);
  panel.appendChild(section);
}

function downloadSectionCsv(sectionId) {
  const datasets = window.AppState.datasets;
  let columns;
  let rows;
  let filename;

  if (sectionId === 'storyline1') {
    columns = ['Year', 'Admissions', 'Bed Days'];
    rows = datasets.nationalAnnual.map(d => [d.Year, d.Hospitalisations, d.BedDays]);
    filename = 'crashmetrics-national-trends.csv';
  } else if (sectionId === 'storyline2') {
    columns = ['Chart', 'Year', 'Category', 'Admissions', 'Bed Days'];
    rows = [
      ...datasets.nationalRoadUser.map(d => [
        'Road-user categories', d.Year, d.RoadUser, d.Hospitalisations, d.BedDays
      ]),
      ...datasets.nationalAge.map(d => [
        'Age groups', d.Year, d.AgeGroup, d.Hospitalisations, d.BedDays
      ])
    ];
    filename = 'crashmetrics-road-users-and-age-groups.csv';
  } else if (sectionId === 'storyline3') {
    columns = ['Year', 'State/Territory', 'Admissions', 'Bed Days'];
    rows = datasets.stateAnnual.map(d => [
      d.Year, d.State, d.Hospitalisations, d.BedDays
    ]);
    filename = 'crashmetrics-state-and-territory-trends.csv';
  } else if (sectionId === 'storyline4') {
    columns = ['Chart', 'Year', 'Category', 'Admissions', 'Bed Days'];
    rows = [
      ...datasets.fnAnnual.map(d => [
        'Annual trend', d.Year, '', d.Hospitalisations, ''
      ]),
      ...datasets.fnRoadUser.map(d => [
        'Road-user categories', d.Year, d.RoadUser, d.Hospitalisations, d.BedDays
      ]),
      ...datasets.fnAge.map(d => [
        'Age groups', d.Year, d.AgeGroup, d.Hospitalisations, d.BedDays
      ])
    ];
    filename = 'crashmetrics-first-nations.csv';
  } else {
    throw new Error(`Unknown storyline for CSV download: ${sectionId}`);
  }

  const escapeCsvValue = value => {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = [columns, ...rows]
    .map(row => row.map(escapeCsvValue).join(','))
    .join('\r\n');
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function selectedMeasureName(measure) {
  return measure === 'Hospitalisations' ? 'Admissions' : 'Bed Days';
}

function openSectionData(sectionId, shouldScroll = true) {
  const datasets = window.AppState.datasets;
  const panel = document.getElementById(`data-table-${sectionId}`);
  if (!panel) return;
  panel.replaceChildren();

  if (sectionId === 'storyline1') {
    const measure = window.AppState.activeMeasureS1;
    const rows = datasets.nationalAnnual.map(d => ({
      Year: d.Year,
      Admissions: window.formatNumber(d.Hospitalisations),
      'Bed Days': window.formatNumber(d.BedDays)
    }));
    renderDataTable(panel, `National data · ${selectedMeasureName(measure)}`, [
      { key: 'Year', label: 'Year' },
      { key: 'Admissions', label: 'Admissions' }, { key: 'Bed Days', label: 'Bed Days' }
    ], rows);
  } else if (sectionId === 'storyline2') {
    const year = window.AppState.activeYearS2;
    const measure = window.AppState.activeMeasureS2;
    const users = datasets.nationalRoadUser.filter(d => d.Year === year)
      .sort((a, b) => b[measure] - a[measure])
      .map(d => ({ Category: d.RoadUser, Admissions: window.formatNumber(d.Hospitalisations), 'Bed Days': window.formatNumber(d.BedDays) }));
    const ages = datasets.nationalAge.filter(d => d.Year === year)
      .map(d => ({ Category: d.AgeGroup, Admissions: window.formatNumber(d.Hospitalisations), 'Bed Days': window.formatNumber(d.BedDays) }));
    const columns = [
      { key: 'Category', label: 'Category' },
      { key: 'Admissions', label: 'Admissions' }, { key: 'Bed Days', label: 'Bed Days' }
    ];
    renderDataTable(panel, `Road-user categories · ${year}`, columns, users);
    renderDataTable(panel, `Age groups · ${year}`, columns, ages);
  } else if (sectionId === 'storyline3') {
    const state = window.AppState.activeStateS3;
    const measure = window.AppState.activeMeasureS3;
    const stateRows = datasets.stateAnnual.filter(d => d.State === state)
      .sort((a, b) => a.Year - b.Year)
      .map(d => ({ Year: d.Year, Admissions: window.formatNumber(d.Hospitalisations), 'Bed Days': window.formatNumber(d.BedDays) }));
    const rows = statesForTable(datasets.stateAnnual).map(stateCode => {
      const byYear = new Map(datasets.stateAnnual.filter(d => d.State === stateCode).map(d => [d.Year, d]));
      const row = { State: stateCode };
      for (let year = 2011; year <= 2021; year++) {
        const datum = byYear.get(year);
        row[year] = datum ? window.formatNumber(datum[measure]) : '';
      }
      return row;
    });
    const matrixColumns = [{ key: 'State', label: 'State / Territory' }];
    for (let year = 2011; year <= 2021; year++) matrixColumns.push({ key: year, label: String(year) });
    renderDataTable(panel, `State heatmap · ${selectedMeasureName(measure)} (selected: ${state})`, matrixColumns, rows);
    renderDataTable(panel, `${state} trajectory · ${selectedMeasureName(measure)}`, [
      { key: 'Year', label: 'Year' },
      { key: 'Admissions', label: 'Admissions' }, { key: 'Bed Days', label: 'Bed Days' }
    ], stateRows);
  } else if (sectionId === 'storyline4') {
    const year = window.AppState.activeYearS4;
    const annual = datasets.fnAnnual.slice().sort((a, b) => a.Year - b.Year)
      .map(d => ({ Year: d.Year, Admissions: window.formatNumber(d.Hospitalisations) }));
    const users = datasets.fnRoadUser.filter(d => d.Year === year)
      .map(d => ({ Category: d.RoadUser, Admissions: d.Hospitalisations === 'n.p.' ? 'n.p.' : window.formatNumber(d.Hospitalisations), 'Bed Days': d.BedDays === 'n.p.' ? 'n.p.' : window.formatNumber(d.BedDays) }));
    const ages = datasets.fnAge.filter(d => d.Year === year)
      .map(d => ({ Category: d.AgeGroup, Admissions: d.Hospitalisations === 'n.p.' ? 'n.p.' : window.formatNumber(d.Hospitalisations), 'Bed Days': d.BedDays === 'n.p.' ? 'n.p.' : window.formatNumber(d.BedDays) }));
    renderDataTable(panel, 'Annual First Nations admissions', [
      { key: 'Year', label: 'Year' }, { key: 'Admissions', label: 'Admissions' }
    ], annual);
    const breakdownColumns = [
      { key: 'Category', label: 'Category' }, { key: 'Admissions', label: 'Admissions' }, { key: 'Bed Days', label: 'Bed Days' }
    ];
    renderDataTable(panel, `Road-user categories · ${year}`, breakdownColumns, users);
    renderDataTable(panel, `Age groups · ${year}`, breakdownColumns, ages);
    const note = document.createElement('p');
    note.className = 'np-explanation';
    note.textContent = "n.p. means the value was not published to protect confidentiality; it does not mean zero.";
    panel.appendChild(note);
  }

  panel.hidden = false;
  if (shouldScroll) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

window.refreshDataTable = sectionId => {
  const panel = document.getElementById(`data-table-${sectionId}`);
  if (panel && !panel.hidden) openSectionData(sectionId, false);
};

function statesForTable(stateData) {
  return [...new Set(stateData.map(d => d.State))];
}

let pointerChartMark = null;

window.refreshChartTooltip = chartRoot => {
  const selector = '.data-point, .chart-bar, .heatmap-cell, .annotation-group, .user-bar-item, .age-bar-item';
  const resolveMark = target => {
    let mark = target.closest(selector);
    if (mark?.matches('.chart-bar') && mark.parentElement.matches('.user-bar-item, .age-bar-item')) {
      mark = mark.parentElement;
    }
    return mark;
  };
  const focusedMark = chartRoot.contains(document.activeElement)
    ? resolveMark(document.activeElement)
    : null;
  const pointerMark = pointerChartMark && chartRoot.contains(pointerChartMark)
    ? pointerChartMark
    : null;
  const mark = focusedMark || pointerMark;
  if (!mark) return;

  const datum = d3.select(mark).datum();
  if (datum) {
    const category = datum.RoadUser || datum.AgeGroup || datum.State || '';
    const metric = datum.Hospitalisations === 'n.p.' ? 'n.p.' :
      datum.Hospitalisations !== undefined ? `${window.formatNumber(datum.Hospitalisations)} admissions` : '';
    const label = [category, datum.Year, metric].filter(value => value !== '').join(', ');
    if (label) mark.setAttribute('aria-label', `Chart data: ${label}`);
  }

  const rect = mark.getBoundingClientRect();
  mark.dispatchEvent(new MouseEvent('mouseenter', {
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2
  }));
};

function initializeAccessibleChartMarks() {
  const chartMarkSelector = '.data-point, .chart-bar, .heatmap-cell, .annotation-group, .user-bar-item, .age-bar-item';
  const resolveChartMark = target => {
    let mark = target.closest && target.closest(chartMarkSelector);
    if (mark && mark.matches('.chart-bar') && mark.parentElement.matches('.user-bar-item, .age-bar-item')) {
      mark = mark.parentElement;
    }
    return mark;
  };
  const prepareMark = mark => {
    if (mark.matches('.chart-bar') && mark.parentElement.matches('.user-bar-item, .age-bar-item')) return;
    mark.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight');
    if (mark.hasAttribute('tabindex')) return;
    mark.setAttribute('tabindex', '0');
    mark.setAttribute('role', 'button');
    if (!mark.hasAttribute('aria-label')) {
      const datum = d3.select(mark).datum();
      if (datum) {
        const category = datum.RoadUser || datum.AgeGroup || datum.State || '';
        const metric = datum.Hospitalisations === 'n.p.' ? 'n.p.' :
          datum.Hospitalisations !== undefined ? `${window.formatNumber(datum.Hospitalisations)} admissions` : '';
        const label = [category, datum.Year, metric].filter(value => value !== '').join(', ');
        if (label) mark.setAttribute('aria-label', `Chart data: ${label}`);
      }
    }
  };

  document.querySelectorAll(chartMarkSelector).forEach(prepareMark);
  new MutationObserver(records => records.forEach(record => {
    record.addedNodes.forEach(node => {
      if (!(node instanceof Element)) return;
      if (node.matches(chartMarkSelector)) prepareMark(node);
      node.querySelectorAll(chartMarkSelector).forEach(prepareMark);
    });
  })).observe(document.body, { childList: true, subtree: true });

  document.addEventListener('focusin', event => {
    const mark = resolveChartMark(event.target);
    if (!mark) return;
    prepareMark(mark);
    const rect = mark.getBoundingClientRect();
    mark.setAttribute('aria-describedby', 'global-tooltip');
    mark.dispatchEvent(new MouseEvent('mouseenter', {
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2
    }));
  });
  document.addEventListener('focusout', event => {
    if (event.target.matches && event.target.matches(chartMarkSelector)) {
      event.target.removeAttribute('aria-describedby');
      window.hideTooltip();
    }
  });
  document.addEventListener('touchstart', event => {
    const mark = resolveChartMark(event.target);
    if (!mark) return;
    const touch = event.changedTouches[0];
    mark.dispatchEvent(new MouseEvent('mouseenter', {
      clientX: touch.clientX,
      clientY: touch.clientY
    }));
  }, { passive: true });
  document.addEventListener('pointermove', event => {
    pointerChartMark = resolveChartMark(event.target);
  });
  const getChartMarksInReadingOrder = mark => {
    const svg = mark.closest('svg');
    if (!svg) return [];

    const markType = mark.matches('.data-point') ? '.data-point' :
      mark.matches('.heatmap-cell') ? '.heatmap-cell' :
      mark.matches('.annotation-group') ? '.annotation-group' :
      mark.matches('.user-bar-item') ? '.user-bar-item' :
      mark.matches('.age-bar-item') ? '.age-bar-item' : '.chart-bar';
    const marks = [...svg.querySelectorAll(markType)]
      .map(resolveChartMark)
      .filter((candidate, index, candidates) => candidate && candidates.indexOf(candidate) === index);
    const getDatum = candidate => d3.select(candidate).datum();
    const getPosition = candidate => {
      const bounds = candidate.getBBox();
      return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    };
    const data = marks.map(candidate => ({ candidate, datum: getDatum(candidate), position: getPosition(candidate) }));
    const hasYearData = data.length > 0 && data.every(item => Number.isFinite(item.datum?.Year));

    if (hasYearData && markType === '.heatmap-cell') {
      return data.sort((a, b) => a.position.y - b.position.y || a.datum.Year - b.datum.Year)
        .map(item => item.candidate);
    }
    if (hasYearData) {
      return data.sort((a, b) => a.datum.Year - b.datum.Year).map(item => item.candidate);
    }
    if (data.every(item => item.datum?.RoadUser)) {
      return data.sort((a, b) => a.position.y - b.position.y).map(item => item.candidate);
    }
    if (data.every(item => item.datum?.AgeGroup)) {
      return data.sort((a, b) => a.position.x - b.position.x).map(item => item.candidate);
    }
    return data.sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)
      .map(item => item.candidate);
  };
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') window.hideTooltip();
    if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') &&
        !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
      const mark = resolveChartMark(event.target);
      if (mark) {
        const marks = getChartMarksInReadingOrder(mark);
        const currentIndex = marks.indexOf(mark);
        const nextIndex = currentIndex + (event.key === 'ArrowRight' ? 1 : -1);
        if (currentIndex !== -1 && nextIndex >= 0 && nextIndex < marks.length) {
          event.preventDefault();
          marks[nextIndex].focus();
        }
      }
    }
    if ((event.key === 'Enter' || event.key === ' ') &&
        event.target.matches && event.target.matches(chartMarkSelector)) {
      event.preventDefault();
      event.target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  });
}

function initializeGlobalControls() {
  const helpDialog = document.getElementById('help-dialog');
  const helpButton = document.getElementById('help-button');
  const helpClose = document.getElementById('help-close');
  if (helpDialog && helpButton && helpClose) {
    helpButton.addEventListener('click', () => helpDialog.showModal());
    helpClose.addEventListener('click', () => helpDialog.close());
    helpDialog.addEventListener('click', event => {
      if (event.target === helpDialog) helpDialog.close();
    });

    const tourStart = document.getElementById('help-tour-start');
    const tourPanel = document.getElementById('help-tour');
    const tourProgress = document.getElementById('help-tour-progress');
    const tourTitle = document.getElementById('help-tour-title');
    const tourCopy = document.getElementById('help-tour-copy');
    const tourLink = document.getElementById('help-tour-link');
    const tourBack = document.getElementById('help-tour-back');
    const tourNext = document.getElementById('help-tour-next');
    const tourReturn = document.getElementById('help-tour-return');
    const quickTips = helpDialog.querySelector(':scope > ul');
    const tourSteps = [
      {
        title: '1. Choose a story',
        copy: 'The dashboard is divided into four sections: national trends, road-user and age-group patterns, state and territory patterns, and First Nations patterns. Each section answers a different question about the 2011–2021 data.',
        link: 'Go to National Trends',
        href: '#storyline1'
      },
      {
        title: '2. Change the year',
        copy: 'In the demographic and First Nations sections, use the year slider to move to a particular year. Use the play button to preview the years in sequence; select it again to pause.',
        link: 'Go to Users & Age',
        href: '#storyline2'
      },
      {
        title: '3. Explore chart details',
        copy: 'Hover over or focus a chart mark to see its details. On a focused mark, Left/Right Arrow moves through the chart; press Enter to select a mark when it offers an interaction.',
        link: 'Go to First Nations charts',
        href: '#storyline4'
      },
      {
        title: '4. Compare places and measures',
        copy: 'In State Patterns, choose a state or territory, or select a heatmap row to inspect its trajectory. Switch between Admissions and Bed Days to compare the measures.',
        link: 'Go to State Patterns',
        href: '#storyline3'
      },
      {
        title: '5. View or download the data',
        copy: 'Use View Data to open the tables for a section. Download CSV saves the complete data behind that section’s charts so you can open it in a spreadsheet.',
        link: 'Go to National Trends',
        href: '#storyline1'
      },
      {
        title: '6. Remember privacy markers',
        copy: 'A hatched n.p. value means a small count was not published to protect confidentiality. It is not zero; the same marker is retained in the First Nations data table and CSV.',
        link: 'Go to First Nations charts',
        href: '#storyline4'
      }
    ];
    let activeTourStep = 0;

    const renderTourStep = () => {
      const step = tourSteps[activeTourStep];
      tourProgress.textContent = `Step ${activeTourStep + 1} of ${tourSteps.length}`;
      tourTitle.textContent = step.title;
      tourCopy.textContent = step.copy;
      tourLink.textContent = step.link;
      tourLink.href = step.href;
      tourBack.disabled = activeTourStep === 0;
      tourNext.textContent = activeTourStep === tourSteps.length - 1 ? 'Finish tour' : 'Next';
    };

    const showQuickTips = () => {
      tourPanel.hidden = true;
      tourStart.hidden = false;
      quickTips.hidden = false;
      tourStart.focus();
    };

    if (tourStart && tourPanel && tourProgress && tourTitle && tourCopy &&
        tourLink && tourBack && tourNext && tourReturn && quickTips) {
      tourStart.addEventListener('click', () => {
        activeTourStep = 0;
        quickTips.hidden = true;
        tourStart.hidden = true;
        tourPanel.hidden = false;
        renderTourStep();
        tourTitle.focus();
      });
      tourBack.addEventListener('click', () => {
        if (activeTourStep === 0) return;
        activeTourStep--;
        renderTourStep();
        tourBack.focus();
      });
      tourNext.addEventListener('click', () => {
        if (activeTourStep === tourSteps.length - 1) {
          showQuickTips();
          return;
        }
        activeTourStep++;
        renderTourStep();
        tourNext.focus();
      });
      tourReturn.addEventListener('click', showQuickTips);
      tourLink.addEventListener('click', () => helpDialog.close());
    }
  }

  document.querySelectorAll('[data-view-data]').forEach(button => {
    button.addEventListener('click', () => {
      const sectionId = button.dataset.viewData;
      const panel = document.getElementById(`data-table-${sectionId}`);
      if (!panel) return;
      if (panel.hidden) {
        openSectionData(sectionId);
        button.setAttribute('aria-expanded', 'true');
      } else {
        panel.hidden = true;
        button.setAttribute('aria-expanded', 'false');
      }
    });
  });
  document.querySelectorAll('[data-download-csv]').forEach(button => {
    button.addEventListener('click', () => {
      downloadSectionCsv(button.dataset.downloadCsv);
    });
  });
  document.querySelectorAll('[data-reset-view]').forEach(button => {
    button.addEventListener('click', () => {
      const sectionId = button.dataset.resetView;
      const reset = window[`reset${sectionId.slice(-1)}`];
      if (typeof reset === 'function') reset();
    });
  });

  document.querySelectorAll('.inset-stat-card').forEach(card => {
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        card.click();
      }
    });
  });
  initializeAccessibleChartMarks();
}

window.formatNumber = d3.format(",");
window.formatDecimal = d3.format(".2f");

async function initApp() {
  const preloaderBar = document.getElementById('preloader-bar');
  const preloaderCounter = document.getElementById('preloader-counter');
  const preloader = document.getElementById('preloader');

  let loadProgress = 3;
  const progressTimer = setInterval(() => {
    if (loadProgress < 88) {
      loadProgress += Math.floor(Math.random() * 9) + 4;
      if (loadProgress > 88) loadProgress = 88;
      if (preloaderBar) preloaderBar.style.width = `${loadProgress}%`;
      if (preloaderCounter) preloaderCounter.textContent = `${loadProgress}%`;
    }
  }, 35);

  try {
    const [
      nationalAnnual,
      nationalRoadUser,
      nationalAge,
      stateAnnual,
      fnAnnual,
      fnRoadUser,
      fnAge
    ] = await Promise.all([
      d3.csv('data/National_annual.csv', d => ({
        Year: +d.Year,
        Hospitalisations: +d.Hospitalisations,
        BedDays: +d.BedDays
      })),
      d3.csv('data/National_roaduser_annual.csv', d => ({
        Year: +d.Year,
        RoadUser: d.RoadUser.trim(),
        Hospitalisations: +d.Hospitalisations,
        BedDays: +d.BedDays
      })),
      d3.csv('data/National_Age_annual.csv', d => ({
        Year: +d.Year,
        AgeGroup: d.AgeGroup.trim(),
        Hospitalisations: +d.Hospitalisations,
        BedDays: +d.BedDays
      })),
      d3.csv('data/State_territory_annual.csv', d => ({
        Year: +d.Year,
        State: d.State.trim(),
        Hospitalisations: +d.Hospitalisations,
        BedDays: +d.BedDays
      })),
      d3.csv('data/FirstNations_annual.csv', d => ({
        Year: +d.Year,
        Hospitalisations: +d.Hospitalisations
      })),
      d3.csv('data/FirstNation_RoadUser_annual.csv', d => ({
        Year: +d.Year,
        RoadUser: d.RoadUser.trim(),
        Hospitalisations: d.Hospitalisations === 'n.p.' ? 'n.p.' : +d.Hospitalisations,
        BedDays: d.BedDays === 'n.p.' ? 'n.p.' : +d.BedDays
      })),
      d3.csv('data/FirstNations_age_annual.csv', d => ({
        Year: +d.Year,
        AgeGroup: d.AgeGroup.trim(),
        Hospitalisations: d.Hospitalisations === 'n.p.' ? 'n.p.' : +d.Hospitalisations,
        BedDays: d.BedDays === 'n.p.' ? 'n.p.' : +d.BedDays
      }))
    ]);

    window.AppState.datasets = {
      nationalAnnual,
      nationalRoadUser,
      nationalAge,
      stateAnnual,
      fnAnnual,
      fnRoadUser,
      fnAge
    };

    clearInterval(progressTimer);
    if (preloaderBar) preloaderBar.style.width = '100%';
    if (preloaderCounter) preloaderCounter.textContent = '100%';

    setTimeout(() => {
      if (preloader) preloader.classList.add('loaded');
    }, 380);

    updateHeroKPIs(nationalAnnual);

    if (typeof initStoryline1 === 'function') initStoryline1(nationalAnnual);
    if (typeof initStoryline2 === 'function') initStoryline2(nationalRoadUser, nationalAge);
    if (typeof initStoryline3 === 'function') initStoryline3(stateAnnual);
    if (typeof initStoryline4 === 'function') initStoryline4(fnAnnual, fnRoadUser, fnAge);
    initializeGlobalControls();
    restoreStorylineHashPosition();

  } catch (err) {
    console.error('Error loading AIHW crash datasets:', err);
    clearInterval(progressTimer);
    if (preloaderCounter) preloaderCounter.textContent = 'ERR';
  }
}

function updateHeroKPIs(nationalData) {
  const totalHosp = d3.sum(nationalData, d => d.Hospitalisations);
  const totalBeds = d3.sum(nationalData, d => d.BedDays);
  const avgStay = totalBeds / totalHosp;
  
  const peakYearObj = nationalData.reduce((prev, curr) => 
    (curr.Hospitalisations > prev.Hospitalisations) ? curr : prev, nationalData[0]);

  const elTotalHosp = document.getElementById('kpi-total-hosp');
  const elTotalBeds = document.getElementById('kpi-total-beds');
  const elAvgStay = document.getElementById('kpi-avg-stay');
  const elPeakYear = document.getElementById('kpi-peak-year');

  if (elTotalHosp) elTotalHosp.textContent = window.formatNumber(totalHosp);
  if (elTotalBeds) elTotalBeds.textContent = window.formatNumber(totalBeds);
  if (elAvgStay) elAvgStay.textContent = window.formatDecimal(avgStay);
  if (elPeakYear) elPeakYear.textContent = peakYearObj.Year;
}

function restoreStorylineHashPosition() {
  const target = document.getElementById(window.location.hash.slice(1));
  if (!target || !target.classList.contains('storyline-block')) return;

  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.addEventListener('DOMContentLoaded', initApp);
