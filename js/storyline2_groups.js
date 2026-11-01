/**
 * Storyline 2: Road-User and Age-Group Patterns
 * Dual Linked Bento Views: Sorted Horizontal Bars (Road Users) + Chronological Vertical Bars (Age Groups)
 * Styled after dashboarddesign.webp ("Product view" active emerald gradient bar + dark pill callout)
 */

function initStoryline2(roadUserData, ageData) {
  const containerUsers = document.getElementById('chart-storyline2-users');
  const containerAge = document.getElementById('chart-storyline2-age');
  if (!containerUsers || !containerAge) return;

  containerUsers.innerHTML = '';
  containerAge.innerHTML = '';

  let activeYear = window.AppState.activeYearS2 || 2021;
  let activeMeasure = window.AppState.activeMeasureS2 || 'Hospitalisations';
  let isPlaying = false;
  let playInterval = null;

  // 1. Setup Road Users Chart (Horizontal Bar Chart)
  const marginUsers = { top: 16, right: 68, bottom: 36, left: 215 };
  const widthUsers = 620 - marginUsers.left - marginUsers.right;
  const heightUsers = 430 - marginUsers.top - marginUsers.bottom;

  const svgUsers = d3.select(containerUsers)
    .append('svg')
    .attr('class', 'chart-svg')
    .attr('viewBox', `0 0 ${widthUsers + marginUsers.left + marginUsers.right} ${heightUsers + marginUsers.top + marginUsers.bottom}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const gUsers = svgUsers.append('g')
    .attr('transform', `translate(${marginUsers.left},${marginUsers.top})`);

  const xUsersScale = d3.scaleLinear().range([0, widthUsers]);
  const yUsersScale = d3.scaleBand().range([0, heightUsers]).padding(0.24);

  const usersGridGroup = gUsers.append('g').attr('class', 'grid');
  const xUsersAxisGroup = gUsers.append('g')
    .attr('class', 'axis axis-x')
    .attr('transform', `translate(0,${heightUsers})`);
  const yUsersAxisGroup = gUsers.append('g').attr('class', 'axis axis-y');

  // 2. Setup Age Groups Chart (Vertical Bar Chart — dashboarddesign.webp "Product view" style)
  const marginAge = { top: 36, right: 20, bottom: 56, left: 52 };
  const widthAge = 460 - marginAge.left - marginAge.right;
  const heightAge = 430 - marginAge.top - marginAge.bottom;

  const svgAge = d3.select(containerAge)
    .append('svg')
    .attr('class', 'chart-svg')
    .attr('viewBox', `0 0 ${widthAge + marginAge.left + marginAge.right} ${heightAge + marginAge.top + marginAge.bottom}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const gAge = svgAge.append('g')
    .attr('transform', `translate(${marginAge.left},${marginAge.top})`);

  const chronologicalAgeOrder = ['0-7', '8-16', '17-25', '26-39', '40-64', '65-74', '75+', 'Unknown'];

  const xAgeScale = d3.scaleBand()
    .domain(chronologicalAgeOrder)
    .range([0, widthAge])
    .padding(0.26);

  const yAgeScale = d3.scaleLinear().range([heightAge, 0]);

  const ageGridGroup = gAge.append('g').attr('class', 'grid');
  const xAgeAxisGroup = gAge.append('g')
    .attr('class', 'axis axis-x')
    .attr('transform', `translate(0,${heightAge})`);
  const yAgeAxisGroup = gAge.append('g').attr('class', 'axis axis-y');
  const peakCalloutGroup = gAge.append('g').attr('class', 'peak-callout-layer');

  function updateCharts() {
    const t = d3.transition().duration(550).ease(d3.easeCubicOut);

    // ------------------------------------------------------------------------
    // A. Road Users Horizontal Bars
    // ------------------------------------------------------------------------
    let yearUsers = roadUserData.filter(d => d.Year === activeYear);
    yearUsers.sort((a, b) => b[activeMeasure] - a[activeMeasure]);

    const maxUserVal = d3.max(yearUsers, d => d[activeMeasure]) || 1;
    xUsersScale.domain([0, maxUserVal * 1.16]);
    yUsersScale.domain(yearUsers.map(d => d.RoadUser));

    xUsersAxisGroup.transition(t).call(
      d3.axisBottom(xUsersScale).ticks(5).tickFormat(d3.format('~s'))
    );
    yUsersAxisGroup.transition(t).call(d3.axisLeft(yUsersScale));

    usersGridGroup.transition(t).call(
      d3.axisBottom(xUsersScale).ticks(5).tickSize(heightUsers).tickFormat('')
    ).call(g => g.select('.domain').remove());

    const getUserBarFill = (d, i) => {
      if (i === 0) return 'var(--chart-bar-primary)';
      if (i === 1 || i === 2) return 'var(--accent-amber)';
      return 'var(--chart-bar-neutral)';
    };

    const userBars = gUsers.selectAll('.chart-bar')
      .data(yearUsers, d => d.RoadUser);

    userBars.join(
      enter => enter.append('rect')
        .attr('class', 'chart-bar')
        .attr('x', 0)
        .attr('y', d => yUsersScale(d.RoadUser))
        .attr('height', yUsersScale.bandwidth())
        .attr('width', 0)
        .attr('rx', 5)
        .attr('ry', 5)
        .attr('fill', (d, i) => getUserBarFill(d, i))
        .call(enter => enter.transition(t)
          .attr('width', d => xUsersScale(d[activeMeasure]))
        ),
      update => update.transition(t)
        .attr('y', d => yUsersScale(d.RoadUser))
        .attr('height', yUsersScale.bandwidth())
        .attr('width', d => xUsersScale(d[activeMeasure]))
        .attr('fill', (d, i) => getUserBarFill(d, i)),
      exit => exit.transition(t).attr('width', 0).remove()
    );

    const userLabels = gUsers.selectAll('.bar-value')
      .data(yearUsers, d => d.RoadUser);

    userLabels.join(
      enter => enter.append('text')
        .attr('class', 'bar-value')
        .attr('x', d => xUsersScale(d[activeMeasure]) + 8)
        .attr('y', d => yUsersScale(d.RoadUser) + yUsersScale.bandwidth() / 2 + 4)
        .text(d => window.formatNumber(d[activeMeasure]))
        .style('opacity', 0)
        .call(enter => enter.transition(t).style('opacity', 1)),
      update => update.transition(t)
        .attr('x', d => xUsersScale(d[activeMeasure]) + 8)
        .attr('y', d => yUsersScale(d.RoadUser) + yUsersScale.bandwidth() / 2 + 4)
        .text(d => window.formatNumber(d[activeMeasure])),
      exit => exit.remove()
    );

    gUsers.selectAll('.chart-bar')
      .classed('rank-primary', (d, i) => i === 0)
      .classed('rank-highlight', (d, i) => i === 1 || i === 2)
      .classed('rank-neutral', (d, i) => i > 2)
      .on('mouseenter', function(event, d) {
        d3.select(this).classed('is-hovered', true);
        gUsers.selectAll('.chart-bar').classed('dimmed', o => o.RoadUser !== d.RoadUser);

        const stayRatio = (d.BedDays / d.Hospitalisations).toFixed(1);

        window.showTooltip(event, `
          <div class="tooltip-header">
            <span class="tooltip-tag">Road-User Mode</span>
            <span class="tooltip-badge">${activeYear}</span>
          </div>
          <div class="tooltip-title">${d.RoadUser}</div>
          <div class="tooltip-metric-row">
            <span class="tooltip-value">${window.formatNumber(d[activeMeasure])}</span>
            <span class="tooltip-subvalue">${activeMeasure === 'Hospitalisations' ? 'Admissions' : 'Bed Days'}</span>
          </div>
          <div class="tooltip-extra">
            Admissions: <strong>${window.formatNumber(d.Hospitalisations)}</strong><br>
            Bed Days: <strong>${window.formatNumber(d.BedDays)}</strong><br>
            Bed-Day Burden: <strong>${stayRatio} days / patient</strong>
          </div>
        `);
      })
      .on('mouseleave', function() {
        gUsers.selectAll('.chart-bar')
          .classed('dimmed', false)
          .classed('is-hovered', false);
        window.hideTooltip();
      });

    // ------------------------------------------------------------------------
    // B. Age Groups Vertical Bars (dashboarddesign.webp "Product view" style)
    // ------------------------------------------------------------------------
    let yearAge = ageData.filter(d => d.Year === activeYear);
    const ageMap = new Map(yearAge.map(d => [d.AgeGroup, d]));
    const formattedAge = chronologicalAgeOrder.map(group => {
      return ageMap.get(group) || {
        Year: activeYear,
        AgeGroup: group,
        Hospitalisations: 0,
        BedDays: 0
      };
    });

    const maxAgeVal = d3.max(formattedAge, d => d[activeMeasure]) || 1;
    const peakAgeObj = formattedAge.reduce((a, b) => (b[activeMeasure] > a[activeMeasure] ? b : a), formattedAge[0]);

    yAgeScale.domain([0, maxAgeVal * 1.18]);

    xAgeAxisGroup.transition(t).call(d3.axisBottom(xAgeScale))
      .selectAll('text')
      .attr('transform', 'rotate(-28)')
      .style('text-anchor', 'end')
      .attr('dx', '-0.4em')
      .attr('dy', '0.25em');

    yAgeAxisGroup.transition(t).call(
      d3.axisLeft(yAgeScale).ticks(5).tickFormat(d3.format('~s'))
    );

    ageGridGroup.transition(t).call(
      d3.axisLeft(yAgeScale).ticks(5).tickSize(-widthAge).tickFormat('')
    ).call(g => g.select('.domain').remove());

    const getAgeBarFill = d => d.AgeGroup === peakAgeObj.AgeGroup ? 'url(#emerald-bar-gradient)' : 'var(--strip-line)';

    const ageBars = gAge.selectAll('.chart-bar')
      .data(formattedAge, d => d.AgeGroup);

    ageBars.join(
      enter => enter.append('rect')
        .attr('class', 'chart-bar')
        .attr('x', d => xAgeScale(d.AgeGroup))
        .attr('y', heightAge)
        .attr('width', xAgeScale.bandwidth())
        .attr('height', 0)
        .attr('rx', 7)
        .attr('ry', 7)
        .attr('fill', d => getAgeBarFill(d))
        .call(enter => enter.transition(t)
          .attr('y', d => yAgeScale(d[activeMeasure]))
          .attr('height', d => heightAge - yAgeScale(d[activeMeasure]))
        ),
      update => update.transition(t)
        .attr('x', d => xAgeScale(d.AgeGroup))
        .attr('y', d => yAgeScale(d[activeMeasure]))
        .attr('width', xAgeScale.bandwidth())
        .attr('height', d => heightAge - yAgeScale(d[activeMeasure]))
        .attr('fill', d => getAgeBarFill(d)),
      exit => exit.transition(t).attr('height', 0).attr('y', heightAge).remove()
    );

    const ageLabels = gAge.selectAll('.bar-value')
      .data(formattedAge, d => d.AgeGroup);

    ageLabels.join(
      enter => enter.append('text')
        .attr('class', 'bar-value')
        .attr('x', d => xAgeScale(d.AgeGroup) + xAgeScale.bandwidth() / 2)
        .attr('y', d => yAgeScale(d[activeMeasure]) - 7)
        .attr('text-anchor', 'middle')
        .text(d => d[activeMeasure] > 0 && d.AgeGroup !== peakAgeObj.AgeGroup ? window.formatNumber(d[activeMeasure]) : '')
        .style('opacity', 0)
        .call(enter => enter.transition(t).style('opacity', 1)),
      update => update.transition(t)
        .attr('x', d => xAgeScale(d.AgeGroup) + xAgeScale.bandwidth() / 2)
        .attr('y', d => yAgeScale(d[activeMeasure]) - 7)
        .text(d => d[activeMeasure] > 0 && d.AgeGroup !== peakAgeObj.AgeGroup ? window.formatNumber(d[activeMeasure]) : ''),
      exit => exit.remove()
    );

    // Render dashboarddesign.webp signature dark pill callout above the peak bar
    peakCalloutGroup.selectAll('*').remove();
    if (peakAgeObj && peakAgeObj[activeMeasure] > 0) {
      const px = xAgeScale(peakAgeObj.AgeGroup) + xAgeScale.bandwidth() / 2;
      const py = yAgeScale(peakAgeObj[activeMeasure]);

      peakCalloutGroup.append('circle')
        .attr('cx', px)
        .attr('cy', py - 8)
        .attr('r', 3.5)
        .attr('fill', '#FFFFFF')
        .attr('stroke', 'var(--accent-emerald)')
        .attr('stroke-width', 2);

      const pillText = window.formatNumber(peakAgeObj[activeMeasure]);
      const pillW = pillText.length * 7 + 16;

      peakCalloutGroup.append('rect')
        .attr('x', px - pillW / 2)
        .attr('y', py - 34)
        .attr('width', pillW)
        .attr('height', 20)
        .attr('rx', 6)
        .attr('fill', 'var(--chart-bar-primary)');

      peakCalloutGroup.append('text')
        .attr('x', px)
        .attr('y', py - 21)
        .attr('text-anchor', 'middle')
        .attr('fill', '#FFFFFF')
        .attr('font-size', '0.7rem')
        .attr('font-weight', '700')
        .text(pillText);
    }

    gAge.selectAll('.chart-bar')
      .classed('bar-peak', d => d.AgeGroup === peakAgeObj.AgeGroup)
      .classed('bar-muted', d => d.AgeGroup !== peakAgeObj.AgeGroup)
      .on('mouseenter', function(event, d) {
        d3.select(this).classed('is-hovered', true);
        gAge.selectAll('.chart-bar').classed('dimmed', o => o.AgeGroup !== d.AgeGroup);

        const stayRatio = d.Hospitalisations > 0 
          ? (d.BedDays / d.Hospitalisations).toFixed(1)
          : '0.0';

        window.showTooltip(event, `
          <div class="tooltip-header">
            <span class="tooltip-tag">Age Bracket</span>
            <span class="tooltip-badge">${activeYear}</span>
          </div>
          <div class="tooltip-title">Age Group: ${d.AgeGroup}</div>
          <div class="tooltip-metric-row">
            <span class="tooltip-value">${window.formatNumber(d[activeMeasure])}</span>
            <span class="tooltip-subvalue">${activeMeasure === 'Hospitalisations' ? 'Admissions' : 'Bed Days'}</span>
          </div>
          <div class="tooltip-extra">
            Admissions: <strong>${window.formatNumber(d.Hospitalisations)}</strong><br>
            Bed Days: <strong>${window.formatNumber(d.BedDays)}</strong><br>
            Average Stay: <strong>${stayRatio} days / patient</strong>
          </div>
        `);
      })
      .on('mouseleave', function() {
        gAge.selectAll('.chart-bar')
          .classed('dimmed', false)
          .classed('is-hovered', false);
        window.hideTooltip();
      });
    window.refreshChartTooltip(containerUsers);
    window.refreshChartTooltip(containerAge);
    if (window.refreshDataTable) window.refreshDataTable('storyline2');
  }

  // Controls
  const slider = document.getElementById('s2-year-slider');
  const yearBadge = document.getElementById('s2-year-badge');
  const playBtn = document.getElementById('s2-play-btn');
  const btnHosp = document.getElementById('s2-btn-hosp');
  const btnBeds = document.getElementById('s2-btn-beds');

  function stopPlayback() {
    isPlaying = false;
    if (playInterval) clearInterval(playInterval);
    playInterval = null;
    if (playBtn) {
      playBtn.textContent = '▶';
      playBtn.setAttribute('aria-label', 'Play timeline animation');
      playBtn.title = 'Play timeline animation';
    }
  }

  if (slider && yearBadge) {
    slider.addEventListener('input', (e) => {
      activeYear = +e.target.value;
      yearBadge.textContent = activeYear;
      window.AppState.activeYearS2 = activeYear;
      updateCharts();
    });
  }

  if (playBtn) {
    playBtn.addEventListener('click', () => {
      isPlaying = !isPlaying;
      playBtn.textContent = isPlaying ? '⏸' : '▶';
      playBtn.setAttribute('aria-label', isPlaying ? 'Pause timeline animation' : 'Play timeline animation');
      playBtn.title = isPlaying ? 'Pause timeline animation' : 'Play timeline animation';

      if (isPlaying) {
        playInterval = setInterval(() => {
          activeYear++;
          if (activeYear > 2021) activeYear = 2011;
          slider.value = activeYear;
          yearBadge.textContent = activeYear;
          window.AppState.activeYearS2 = activeYear;
          updateCharts();
        }, 1150);
      } else {
        clearInterval(playInterval);
        playInterval = null;
      }
    });
  }

  if (btnHosp && btnBeds) {
    btnHosp.addEventListener('click', () => {
      btnHosp.classList.add('active');
      btnBeds.classList.remove('active');
      btnHosp.setAttribute('aria-pressed', 'true');
      btnBeds.setAttribute('aria-pressed', 'false');
      activeMeasure = 'Hospitalisations';
      window.AppState.activeMeasureS2 = activeMeasure;
      updateCharts();
    });

    btnBeds.addEventListener('click', () => {
      btnBeds.classList.add('active');
      btnHosp.classList.remove('active');
      btnBeds.setAttribute('aria-pressed', 'true');
      btnHosp.setAttribute('aria-pressed', 'false');
      activeMeasure = 'BedDays';
      window.AppState.activeMeasureS2 = activeMeasure;
      updateCharts();
    });
  }

  window.reset2 = () => {
    stopPlayback();
    activeYear = 2021;
    activeMeasure = 'Hospitalisations';
    window.AppState.activeYearS2 = activeYear;
    window.AppState.activeMeasureS2 = activeMeasure;
    if (slider) slider.value = activeYear;
    if (yearBadge) yearBadge.textContent = activeYear;
    if (btnHosp) btnHosp.classList.add('active');
    if (btnBeds) btnBeds.classList.remove('active');
    if (btnHosp) btnHosp.setAttribute('aria-pressed', 'true');
    if (btnBeds) btnBeds.setAttribute('aria-pressed', 'false');
    updateCharts();
  };

  updateCharts();
}
