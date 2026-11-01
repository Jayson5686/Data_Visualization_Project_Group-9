/**
 * Storyline 3: State and Territory Patterns
 * Dual-Pane Architecture (bikerental.webp style):
 * Left Dark Matrix Pane (Heatmap) + Right Alabaster Trajectory & Journey Cards Pane
 */

function initStoryline3(stateData) {
  const containerHeatmap = document.getElementById('chart-storyline3-heatmap');
  const containerLine = document.getElementById('chart-storyline3-stateline');
  if (!containerHeatmap || !containerLine) return;

  containerHeatmap.innerHTML = '';
  containerLine.innerHTML = '';

  let activeMeasure = window.AppState.activeMeasureS3 || 'Hospitalisations';
  let activeState = window.AppState.activeStateS3 || 'NSW';

  const states = ['NSW', 'Vic', 'Qld', 'WA', 'SA', 'Tas', 'ACT', 'NT'];
  const years = [2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021];

  // 1. Setup Heatmap Matrix (Dark Left Pane)
  const marginHm = { top: 20, right: 16, bottom: 34, left: 50 };
  const widthHm = 620 - marginHm.left - marginHm.right;
  const heightHm = 380 - marginHm.top - marginHm.bottom;

  const svgHm = d3.select(containerHeatmap)
    .append('svg')
    .attr('class', 'chart-svg')
    .attr('viewBox', `0 0 ${widthHm + marginHm.left + marginHm.right} ${heightHm + marginHm.top + marginHm.bottom}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const gHm = svgHm.append('g')
    .attr('transform', `translate(${marginHm.left},${marginHm.top})`);

  const xHmScale = d3.scaleBand()
    .domain(years)
    .range([0, widthHm])
    .padding(0.08);

  const yHmScale = d3.scaleBand()
    .domain(states)
    .range([0, heightHm])
    .padding(0.12);

  gHm.append('g')
    .attr('class', 'axis axis-x')
    .attr('transform', `translate(0,${heightHm})`)
    .call(d3.axisBottom(xHmScale).tickFormat(d3.format('d')));

  gHm.append('g')
    .attr('class', 'axis axis-y')
    .call(d3.axisLeft(yHmScale));

  const colorScale = d3.scaleSequential()
    .interpolator(getHeatmapInterpolator());

  function getHeatmapInterpolator() {
    return document.documentElement.dataset.theme === 'high-contrast'
      ? d3.interpolateRgb('#000000', '#FFFF00')
      : d3.interpolateYlGnBu;
  }

  const rowHighlight = gHm.append('rect')
    .attr('class', 'state-row-highlight')
    .attr('x', -6)
    .attr('width', widthHm + 12)
    .attr('height', yHmScale.bandwidth() + 6)
    .style('display', 'none');

  // 2. Setup Coordinated State Trajectory Line Chart (Light Right Pane)
  const marginLine = { top: 18, right: 24, bottom: 34, left: 54 };
  const widthLine = 440 - marginLine.left - marginLine.right;
  const heightLine = 225 - marginLine.top - marginLine.bottom;

  const svgLine = d3.select(containerLine)
    .append('svg')
    .attr('class', 'chart-svg')
    .attr('viewBox', `0 0 ${widthLine + marginLine.left + marginLine.right} ${heightLine + marginLine.top + marginLine.bottom}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const gLine = svgLine.append('g')
    .attr('transform', `translate(${marginLine.left},${marginLine.top})`);

  const xLineScale = d3.scaleLinear()
    .domain([2011, 2021])
    .range([0, widthLine]);

  const yLineScale = d3.scaleLinear()
    .range([heightLine, 0]);

  const lineGridGroup = gLine.append('g').attr('class', 'grid');
  const xLineAxisGroup = gLine.append('g')
    .attr('class', 'axis axis-x')
    .attr('transform', `translate(0,${heightLine})`);
  const yLineAxisGroup = gLine.append('g').attr('class', 'axis axis-y');

  const stateAreaPath = gLine.append('path').attr('class', 'area-path');
  const stateLinePath = gLine.append('path')
    .attr('class', 'line-path')
    .attr('stroke', 'var(--chart-line)');

  const statePointsGroup = gLine.append('g');

  function updateHeatmap() {
    const t = d3.transition().duration(500).ease(d3.easeCubicOut);

    colorScale.interpolator(getHeatmapInterpolator());
    const maxVal = d3.max(stateData, d => d[activeMeasure]) || 1;
    colorScale.domain([0, maxVal]);

    const cells = gHm.selectAll('.heatmap-cell')
      .data(stateData, d => `${d.State}-${d.Year}`);

    cells.join(
      enter => enter.append('rect')
        .attr('class', 'heatmap-cell')
        .attr('x', d => xHmScale(d.Year))
        .attr('y', d => yHmScale(d.State))
        .attr('width', xHmScale.bandwidth())
        .attr('height', yHmScale.bandwidth())
        .attr('fill', d => colorScale(d[activeMeasure]))
        .classed('active', d => d.State === activeState)
        .style('opacity', 0)
        .call(enter => enter.transition(t).style('opacity', 1)),
      update => {
        update.classed('active', d => d.State === activeState);
        return update.transition(t).attr('fill', d => colorScale(d[activeMeasure]));
      },
      exit => exit.remove()
    );

    if (activeState) {
      rowHighlight
        .style('display', 'block')
        .transition(t)
        .attr('y', yHmScale(activeState) - 3);
    }

    gHm.selectAll('.heatmap-cell')
      .on('mouseenter', function(event, d) {
        window.showTooltip(event, `
          <div class="tooltip-header">
            <span class="tooltip-tag">Jurisdiction Cell</span>
            <span class="tooltip-badge">${d.Year}</span>
          </div>
          <div class="tooltip-title">${getStateFullName(d.State)} (${d.State})</div>
          <div class="tooltip-metric-row">
            <span class="tooltip-value">${window.formatNumber(d[activeMeasure])}</span>
            <span class="tooltip-subvalue">${activeMeasure === 'Hospitalisations' ? 'Admissions' : 'Bed Days'}</span>
          </div>
          <div class="tooltip-extra">
            Admissions: <strong>${window.formatNumber(d.Hospitalisations)}</strong><br>
            Bed Days: <strong>${window.formatNumber(d.BedDays)}</strong><br>
            Avg Stay: <strong>${(d.BedDays / d.Hospitalisations).toFixed(1)} days</strong>
          </div>
        `);
      })
      .on('mouseleave', () => {
        window.hideTooltip();
      })
      .on('click', function(event, d) {
        selectState(d.State);
      });

    updateLegendCanvas(maxVal);
    updateStateLineChart();
    if (window.refreshDataTable) window.refreshDataTable('storyline3');
  }

  function selectState(stateCode) {
    activeState = stateCode;
    window.AppState.activeStateS3 = activeState;

    const dropdown = document.getElementById('s3-state-dropdown');
    if (dropdown) dropdown.value = activeState;

    const badge = document.getElementById('s3-focus-state-badge');
    if (badge) badge.textContent = `${activeState} Trajectory`;

    gHm.selectAll('.heatmap-cell')
      .classed('active', d => d.State === activeState);

    rowHighlight
      .style('display', 'block')
      .transition().duration(280)
      .attr('y', yHmScale(activeState) - 3);

    updateStateLineChart();
    if (window.refreshDataTable) window.refreshDataTable('storyline3');
  }

  function updateStateLineChart() {
    const t = d3.transition().duration(550).ease(d3.easeCubicOut);

    const filtered = stateData.filter(d => d.State === activeState);
    filtered.sort((a, b) => a.Year - b.Year);

    const totalStateHosp = d3.sum(filtered, d => d.Hospitalisations);
    const totalStateBeds = d3.sum(filtered, d => d.BedDays);
    const metaSummary = document.getElementById('s3-state-meta-summary');
    if (metaSummary) {
      metaSummary.innerHTML = `11-Year Total: <strong>${window.formatNumber(totalStateHosp)}</strong> Admissions · <strong>${window.formatNumber(totalStateBeds)}</strong> Bed Days`;
    }

    // Update Dark Journey Milestone Cards (bikerental.webp "Latest journeys" cards)
    const d2011 = filtered.find(d => d.Year === 2011);
    const d2019 = filtered.find(d => d.Year === 2019);
    const d2020 = filtered.find(d => d.Year === 2020);
    const d2021 = filtered.find(d => d.Year === 2021);

    if (d2011 && d2019) {
      const pct1 = (((d2019[activeMeasure] - d2011[activeMeasure]) / d2011[activeMeasure]) * 100).toFixed(1);
      const j1Start = document.getElementById('s3-j1-start');
      const j1Delta = document.getElementById('s3-j1-delta');
      const j1End = document.getElementById('s3-j1-end');
      if (j1Start) j1Start.textContent = `2011: ${window.formatNumber(d2011[activeMeasure])}`;
      if (j1Delta) j1Delta.textContent = `${pct1 >= 0 ? '+' : ''}${pct1}%`;
      if (j1End) j1End.textContent = `2019: ${window.formatNumber(d2019[activeMeasure])}`;
    }

    if (d2020 && d2021) {
      const pct2 = (((d2021[activeMeasure] - d2020[activeMeasure]) / d2020[activeMeasure]) * 100).toFixed(1);
      const j2Start = document.getElementById('s3-j2-start');
      const j2Delta = document.getElementById('s3-j2-delta');
      const j2End = document.getElementById('s3-j2-end');
      if (j2Start) j2Start.textContent = `2020: ${window.formatNumber(d2020[activeMeasure])}`;
      if (j2Delta) j2Delta.textContent = `${pct2 >= 0 ? '+' : ''}${pct2}%`;
      if (j2End) j2End.textContent = `2021: ${window.formatNumber(d2021[activeMeasure])}`;
    }

    const yMax = d3.max(filtered, d => d[activeMeasure]) || 1;
    const yMin = d3.min(filtered, d => d[activeMeasure]) * 0.85;
    yLineScale.domain([yMin, yMax * 1.1]);

    xLineAxisGroup.call(
      d3.axisBottom(xLineScale)
        .tickValues([2011, 2013, 2015, 2017, 2019, 2021])
        .tickFormat(d3.format('d'))
    );

    yLineAxisGroup.transition(t).call(
      d3.axisLeft(yLineScale).ticks(4).tickFormat(d3.format('~s'))
    );

    lineGridGroup.transition(t).call(
      d3.axisLeft(yLineScale).ticks(4).tickSize(-widthLine).tickFormat('')
    ).call(g => g.select('.domain').remove());

    const lineGen = d3.line()
      .x(d => xLineScale(d.Year))
      .y(d => yLineScale(d[activeMeasure]))
      .curve(d3.curveMonotoneX);

    const areaGen = d3.area()
      .x(d => xLineScale(d.Year))
      .y0(heightLine)
      .y1(d => yLineScale(d[activeMeasure]))
      .curve(d3.curveMonotoneX);

    stateLinePath.datum(filtered).transition(t).attr('d', lineGen);
    stateAreaPath.datum(filtered).transition(t).attr('d', areaGen);

    const points = statePointsGroup.selectAll('.data-point')
      .data(filtered, d => d.Year);

    points.join(
      enter => enter.append('circle')
        .attr('class', 'data-point')
        .attr('cx', d => xLineScale(d.Year))
        .attr('cy', d => yLineScale(d[activeMeasure]))
        .attr('r', 4)
        .call(enter => enter.transition(t).attr('cy', d => yLineScale(d[activeMeasure]))),
      update => update.transition(t)
        .attr('cx', d => xLineScale(d.Year))
        .attr('cy', d => yLineScale(d[activeMeasure])),
      exit => exit.remove()
    );

    statePointsGroup.selectAll('.data-point')
      .on('mouseenter', function(event, d) {
        window.showTooltip(event, `
          <div class="tooltip-header">
            <span class="tooltip-tag">${d.State} Trajectory</span>
            <span class="tooltip-badge">${d.Year}</span>
          </div>
          <div class="tooltip-title">${getStateFullName(d.State)}</div>
          <div class="tooltip-metric-row">
            <span class="tooltip-value">${window.formatNumber(d[activeMeasure])}</span>
            <span class="tooltip-subvalue">${activeMeasure === 'Hospitalisations' ? 'Admissions' : 'Bed Days'}</span>
          </div>
          <div class="tooltip-extra">
            Bed Days: <strong>${window.formatNumber(d.BedDays)}</strong><br>
            Avg Stay: <strong>${(d.BedDays / d.Hospitalisations).toFixed(1)} days</strong>
          </div>
        `);
      })
      .on('mouseleave', () => {
        window.hideTooltip();
      });
  }

  function updateLegendCanvas(maxVal) {
    const canvas = document.getElementById('s3-legend-canvas');
    const minLabel = document.getElementById('s3-legend-min');
    const maxLabel = document.getElementById('s3-legend-max');

    if (minLabel) minLabel.textContent = '0';
    if (maxLabel) maxLabel.textContent = window.formatNumber(maxVal);

    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    for (let x = 0; x < width; x++) {
      const ratio = x / width;
      ctx.fillStyle = colorScale(ratio * maxVal);
      ctx.fillRect(x, 0, 1, height);
    }
  }

  function getStateFullName(code) {
    const map = {
      NSW: 'New South Wales',
      Vic: 'Victoria',
      Qld: 'Queensland',
      WA: 'Western Australia',
      SA: 'South Australia',
      Tas: 'Tasmania',
      ACT: 'Australian Capital Territory',
      NT: 'Northern Territory'
    };
    return map[code] || code;
  }

  const dropdown = document.getElementById('s3-state-dropdown');
  if (dropdown) {
    dropdown.addEventListener('change', (e) => {
      selectState(e.target.value);
    });
  }

  const btnHosp = document.getElementById('s3-btn-hosp');
  const btnBeds = document.getElementById('s3-btn-beds');

  if (btnHosp && btnBeds) {
    btnHosp.addEventListener('click', () => {
      btnHosp.classList.add('active');
      btnBeds.classList.remove('active');
      btnHosp.setAttribute('aria-pressed', 'true');
      btnBeds.setAttribute('aria-pressed', 'false');
      activeMeasure = 'Hospitalisations';
      window.AppState.activeMeasureS3 = activeMeasure;
      updateHeatmap();
    });

    btnBeds.addEventListener('click', () => {
      btnBeds.classList.add('active');
      btnHosp.classList.remove('active');
      btnBeds.setAttribute('aria-pressed', 'true');
      btnHosp.setAttribute('aria-pressed', 'false');
      activeMeasure = 'BedDays';
      window.AppState.activeMeasureS3 = activeMeasure;
      updateHeatmap();
    });
  }

  window.reset3 = () => {
    activeMeasure = 'Hospitalisations';
    window.AppState.activeMeasureS3 = activeMeasure;
    if (btnHosp) btnHosp.classList.add('active');
    if (btnBeds) btnBeds.classList.remove('active');
    if (btnHosp) btnHosp.setAttribute('aria-pressed', 'true');
    if (btnBeds) btnBeds.setAttribute('aria-pressed', 'false');
    updateHeatmap();
    selectState('NSW');
  };

  const heatmapThemeObserver = new MutationObserver(updateHeatmap);
  heatmapThemeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  });
  updateHeatmap();
  selectState(activeState);
}
