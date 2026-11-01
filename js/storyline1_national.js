/**
 * Storyline 1: National Hospitalisation Trends (2011–2021)
 * Interactive Line Chart with Overview Inset Card Sync & Comparability Break Callouts
 */

function initStoryline1(data) {
  const container = document.getElementById('chart-storyline1');
  if (!container) return;
  container.innerHTML = '';

  const margin = { top: 38, right: 36, bottom: 44, left: 88 };
  const width = 1120 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const svg = d3.select(container)
    .append('svg')
    .attr('class', 'chart-svg')
    .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleLinear()
    .domain(d3.extent(data, d => d.Year))
    .range([0, width]);

  const yScale = d3.scaleLinear()
    .range([height, 0]);

  let currentMeasure = window.AppState.activeMeasureS1 || 'Hospitalisations';

  const lineGenerator = d3.line()
    .x(d => xScale(d.Year))
    .y(d => yScale(d[currentMeasure]))
    .curve(d3.curveMonotoneX);

  const areaGenerator = d3.area()
    .x(d => xScale(d.Year))
    .y0(height)
    .y1(d => yScale(d[currentMeasure]))
    .curve(d3.curveMonotoneX);

  const gridGroup = g.append('g').attr('class', 'grid');
  const xAxisGroup = g.append('g').attr('class', 'axis axis-x').attr('transform', `translate(0,${height})`);
  const yAxisGroup = g.append('g').attr('class', 'axis axis-y');

  const yAxisTitle = g.append('text')
    .attr('class', 'axis-title')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -66)
    .attr('text-anchor', 'middle');

  const areaPath = g.append('path').attr('class', 'area-path');
  const linePath = g.append('path').attr('class', 'line-path');
  const pointsGroup = g.append('g').attr('class', 'points-group');
  const annotationsGroup = g.append('g').attr('class', 'annotations-layer');

  const crosshair = g.append('line')
    .attr('class', 'crosshair-line')
    .attr('y1', 0)
    .attr('y2', height)
    .style('opacity', 0);

  const focusDot = g.append('circle')
    .attr('class', 'focus-dot')
    .attr('r', 6.5)
    .style('opacity', 0);

  const overlay = g.append('rect')
    .attr('width', width)
    .attr('height', height)
    .style('fill', 'none')
    .style('pointer-events', 'all');

  const annotations = [
    {
      year: 2012,
      label: '2012 · Vic Reporting Break',
      note: 'Victorian hospitals expanded emergency admission surveillance reporting criteria.',
      yOffset: -30
    },
    {
      year: 2017,
      label: '2017 · NSW Series Break',
      note: 'NSW health classification transitioned ICD-10-AM trauma coding protocols.',
      yOffset: -34
    },
    {
      year: 2020,
      label: '2020 · COVID-19 Dip (-4.8%)',
      note: 'National pandemic lockdowns reduced road traffic volume and crash hospitalisations.',
      yOffset: 34
    }
  ];

  function updateChart(measure) {
    currentMeasure = measure;
    const t = d3.transition().duration(600).ease(d3.easeCubicOut);

    const yMax = d3.max(data, d => d[measure]);
    const yMin = d3.min(data, d => d[measure]) * 0.88;
    yScale.domain([yMin, yMax * 1.07]);

    const xAxis = d3.axisBottom(xScale)
      .tickValues(data.map(d => d.Year))
      .tickFormat(d3.format('d'));

    const yAxis = d3.axisLeft(yScale)
      .ticks(6)
      .tickFormat(d3.format(','));

    xAxisGroup.call(xAxis);
    yAxisGroup.transition(t).call(yAxis);

    gridGroup.transition(t).call(
      d3.axisLeft(yScale)
        .ticks(6)
        .tickSize(-width)
        .tickFormat('')
    );

    yAxisTitle.text(measure === 'Hospitalisations' 
      ? 'Admitted Patients (Excl. 30-Day Deaths)' 
      : 'Total Hospital Bed Days Occupied');

    linePath.datum(data).transition(t).attr('d', lineGenerator);
    areaPath.datum(data).transition(t).attr('d', areaGenerator);

    const points = pointsGroup.selectAll('.data-point')
      .data(data, d => d.Year);

    points.join(
      enter => enter.append('circle')
        .attr('class', 'data-point')
        .attr('cx', d => xScale(d.Year))
        .attr('cy', d => yScale(d[measure]))
        .attr('r', 4.5)
        .call(enter => enter.transition(t).attr('cy', d => yScale(d[measure]))),
      update => update.transition(t)
        .attr('cx', d => xScale(d.Year))
        .attr('cy', d => yScale(d[measure])),
      exit => exit.remove()
    );

    pointsGroup.selectAll('.data-point')
      .on('mouseenter', (event, d) => {
        const baseline = data[0][currentMeasure];
        const diffFromBaseline = ((d[currentMeasure] - baseline) / baseline) * 100;
        const baselinePill = diffFromBaseline >= 0
          ? `<span class="delta-pill up">+${diffFromBaseline.toFixed(1)}% vs 2011</span>`
          : `<span class="delta-pill stable">${diffFromBaseline.toFixed(1)}% vs 2011</span>`;
        window.showTooltip(event, `
          <div class="tooltip-header">
            <span class="tooltip-tag">National Cohort</span>
            <span class="tooltip-badge">${d.Year}</span>
          </div>
          <div class="tooltip-title">${currentMeasure === 'Hospitalisations' ? 'Road Crash Admissions' : 'Hospital Bed Days'}</div>
          <div class="tooltip-metric-row">
            <span class="tooltip-value">${window.formatNumber(d[currentMeasure])}</span>
            ${baselinePill}
          </div>
          <div class="tooltip-extra">
            Admissions: <strong>${window.formatNumber(d.Hospitalisations)}</strong><br>
            Bed Days: <strong>${window.formatNumber(d.BedDays)}</strong><br>
            Average Length of Stay: <strong>${(d.BedDays / d.Hospitalisations).toFixed(1)} days / patient</strong>
          </div>
        `);
      })
      .on('mouseleave', () => window.hideTooltip());

    renderAnnotations(measure);
    if (window.refreshDataTable) window.refreshDataTable('storyline1');
  }

  function renderAnnotations(measure) {
    annotationsGroup.selectAll('*').remove();

    annotations.forEach(anno => {
      const datum = data.find(d => d.Year === anno.year);
      if (!datum) return;

      const x = xScale(anno.year);
      const y = yScale(datum[measure]);
      const targetY = y + anno.yOffset;

      const gAnno = annotationsGroup.append('g')
        .attr('class', 'annotation-group')
        .attr('tabindex', '0')
        .attr('role', 'note')
        .attr('aria-label', `${anno.label}: ${anno.note}`);

      gAnno.append('line')
        .attr('class', 'annotation-line')
        .attr('x1', x)
        .attr('y1', y)
        .attr('x2', x)
        .attr('y2', targetY + (anno.yOffset > 0 ? -12 : 12));

      gAnno.append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', 5)
        .attr('fill', 'var(--accent-amber)')
        .attr('stroke', 'var(--bg-card-white)')
        .attr('stroke-width', 2);

      const textWidth = anno.label.length * 6.4 + 20;
      const rectX = Math.min(Math.max(x - textWidth / 2, 4), width - textWidth - 4);

      gAnno.append('rect')
        .attr('class', 'annotation-badge')
        .attr('x', rectX)
        .attr('y', targetY - 12)
        .attr('width', textWidth)
        .attr('height', 24);

      gAnno.append('text')
        .attr('class', 'annotation-text')
        .attr('x', rectX + textWidth / 2)
        .attr('y', targetY + 4)
        .attr('text-anchor', 'middle')
        .text(anno.label);

      gAnno.on('mouseenter', (event) => {
        window.showTooltip(event, `
          <div class="tooltip-header">
            <span class="tooltip-tag">Comparability Break</span>
            <span class="tooltip-badge">${anno.year}</span>
          </div>
          <div class="tooltip-title">${anno.label}</div>
          <div class="tooltip-extra">${anno.note}</div>
        `);
      }).on('mouseleave', () => {
        window.hideTooltip();
      });
    });
  }

  const bisectYear = d3.bisector(d => d.Year).center;

  overlay
    .on('mousemove', function(event) {
      const [mouseX] = d3.pointer(event);
      const hoveredYear = xScale.invert(mouseX);
      const index = bisectYear(data, hoveredYear);
      const d = data[index];
      if (!d) return;

      const x = xScale(d.Year);
      const y = yScale(d[currentMeasure]);

      crosshair.style('opacity', 1).attr('x1', x).attr('x2', x);
      focusDot.style('opacity', 1).attr('cx', x).attr('cy', y);

      const baseline = data[0][currentMeasure];
      const diffFromBaseline = ((d[currentMeasure] - baseline) / baseline) * 100;
      const baselinePill = diffFromBaseline >= 0 
        ? `<span class="delta-pill up">+${diffFromBaseline.toFixed(1)}% vs 2011</span>`
        : `<span class="delta-pill stable">${diffFromBaseline.toFixed(1)}% vs 2011</span>`;

      const avgDays = (d.BedDays / d.Hospitalisations).toFixed(1);

      window.showTooltip(event, `
        <div class="tooltip-header">
          <span class="tooltip-tag">National Cohort</span>
          <span class="tooltip-badge">${d.Year}</span>
        </div>
        <div class="tooltip-title">${currentMeasure === 'Hospitalisations' ? 'Road Crash Admissions' : 'Hospital Bed Days'}</div>
        <div class="tooltip-metric-row">
          <span class="tooltip-value">${window.formatNumber(d[currentMeasure])}</span>
          ${baselinePill}
        </div>
        <div class="tooltip-extra">
          ${currentMeasure === 'Hospitalisations' ? `Bed Days Occupied: <strong>${window.formatNumber(d.BedDays)}</strong><br>` : ''}
          Avg Length of Stay: <strong>${avgDays} days / patient</strong>
        </div>
      `);
    })
    .on('mouseleave', function() {
      crosshair.style('opacity', 0);
      focusDot.style('opacity', 0);
      window.hideTooltip();
    });

  // Synchronized Controls (Pill Buttons + Overview Inset Cards)
  const btnHosp = document.getElementById('s1-btn-hosp');
  const btnBeds = document.getElementById('s1-btn-beds');
  const cardHosp = document.getElementById('s1-card-hosp');
  const cardBeds = document.getElementById('s1-card-beds');

  function setMeasureS1(measure) {
    window.AppState.activeMeasureS1 = measure;
    const isHosp = measure === 'Hospitalisations';
    if (btnHosp) btnHosp.classList.toggle('active', isHosp);
    if (btnBeds) btnBeds.classList.toggle('active', !isHosp);
    if (btnHosp) btnHosp.setAttribute('aria-pressed', String(isHosp));
    if (btnBeds) btnBeds.setAttribute('aria-pressed', String(!isHosp));
    if (cardHosp) cardHosp.classList.toggle('active-inset', isHosp);
    if (cardBeds) cardBeds.classList.toggle('active-inset', !isHosp);
    if (cardHosp) cardHosp.setAttribute('aria-pressed', String(isHosp));
    if (cardBeds) cardBeds.setAttribute('aria-pressed', String(!isHosp));
    updateChart(measure);
  }

  window.reset1 = () => setMeasureS1('Hospitalisations');

  if (btnHosp) btnHosp.addEventListener('click', () => setMeasureS1('Hospitalisations'));
  if (btnBeds) btnBeds.addEventListener('click', () => setMeasureS1('BedDays'));
  if (cardHosp) cardHosp.addEventListener('click', () => setMeasureS1('Hospitalisations'));
  if (cardBeds) cardBeds.addEventListener('click', () => setMeasureS1('BedDays'));

  updateChart(currentMeasure);
}
