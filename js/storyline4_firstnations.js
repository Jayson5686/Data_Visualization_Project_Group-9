/**
 * Storyline 4: First Nations Hospitalisation Patterns
 * Multi-View Panel: Annual Longitudinal Trend Line + Linked Road-User & Age-Group Bars
 * Includes Dedicated Hatched Slot Styling for 'n.p.' Suppressed Records (< 5 cases)
 */

function initStoryline4(fnAnnual, fnRoadUser, fnAge) {
  const containerTrend = document.getElementById('chart-storyline4-trend');
  const containerUsers = document.getElementById('chart-storyline4-users');
  const containerAge = document.getElementById('chart-storyline4-age');
  if (!containerTrend || !containerUsers || !containerAge) return;

  containerTrend.innerHTML = '';
  containerUsers.innerHTML = '';
  containerAge.innerHTML = '';

  let activeYear = window.AppState.activeYearS4 || 2021;
  let isPlaying = false;
  let playInterval = null;

  // 1. Top Chart: Annual Longitudinal Trend Line (2011–2021)
  const marginTrend = { top: 20, right: 30, bottom: 36, left: 56 };
  const widthTrend = 760 - marginTrend.left - marginTrend.right;
  const heightTrend = 240 - marginTrend.top - marginTrend.bottom;

  const svgTrend = d3.select(containerTrend)
    .append('svg')
    .attr('class', 'chart-svg')
    .attr('viewBox', `0 0 ${widthTrend + marginTrend.left + marginTrend.right} ${heightTrend + marginTrend.top + marginTrend.bottom}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const gTrend = svgTrend.append('g')
    .attr('transform', `translate(${marginTrend.left},${marginTrend.top})`);

  const xTrendScale = d3.scaleLinear()
    .domain([2011, 2021])
    .range([0, widthTrend]);

  const yTrendScale = d3.scaleLinear()
    .domain([900, d3.max(fnAnnual, d => d.Hospitalisations) * 1.12])
    .range([heightTrend, 0]);

  gTrend.append('g')
    .attr('class', 'grid')
    .call(d3.axisLeft(yTrendScale).ticks(4).tickSize(-widthTrend).tickFormat(''))
    .call(g => g.select('.domain').remove());

  gTrend.append('g')
    .attr('class', 'axis axis-x')
    .attr('transform', `translate(0,${heightTrend})`)
    .call(d3.axisBottom(xTrendScale).tickValues(fnAnnual.map(d => d.Year)).tickFormat(d3.format('d')));

  gTrend.append('g')
    .attr('class', 'axis axis-y')
    .call(d3.axisLeft(yTrendScale).ticks(4).tickFormat(d3.format(',')));

  const lineTrendGen = d3.line()
    .x(d => xTrendScale(d.Year))
    .y(d => yTrendScale(d.Hospitalisations))
    .curve(d3.curveMonotoneX);

  const areaTrendGen = d3.area()
    .x(d => xTrendScale(d.Year))
    .y0(heightTrend)
    .y1(d => yTrendScale(d.Hospitalisations))
    .curve(d3.curveMonotoneX);

  gTrend.append('path')
    .datum(fnAnnual)
    .attr('class', 'area-path')
    .attr('d', areaTrendGen);

  gTrend.append('path')
    .datum(fnAnnual)
    .attr('class', 'line-path')
    .attr('stroke', 'var(--chart-line)')
    .attr('d', lineTrendGen);

  const trendNodes = gTrend.selectAll('.data-point')
    .data(fnAnnual)
    .enter()
    .append('circle')
    .attr('class', 'data-point')
    .attr('cx', d => xTrendScale(d.Year))
    .attr('cy', d => yTrendScale(d.Hospitalisations))
    .attr('r', d => d.Year === activeYear ? 6.5 : 4.5)
    .classed('active-year', d => d.Year === activeYear)
    .on('mouseenter', showTrendTooltip)
    .on('mouseleave', () => {
      window.hideTooltip();
    })
    .on('click', (event, d) => {
      stopPlayback();
      setStoryline4Year(d.Year);
    });

  function showTrendTooltip(event, d) {
    const growthFrom2011 = (((d.Hospitalisations - fnAnnual[0].Hospitalisations) / fnAnnual[0].Hospitalisations) * 100).toFixed(1);
    window.showTooltip(event, `
        <div class="tooltip-header">
          <span class="tooltip-tag">First Nations Annual</span>
          <span class="tooltip-badge">${d.Year}</span>
        </div>
        <div class="tooltip-title">Hospital Admissions</div>
        <div class="tooltip-metric-row">
          <span class="tooltip-value">${window.formatNumber(d.Hospitalisations)}</span>
          <span class="delta-pill up">+${growthFrom2011}% vs 2011</span>
        </div>
        <div class="tooltip-extra">
          Click node to filter ${d.Year} road-user and age breakdowns below.
        </div>
      `);
  }

  function previewTrendYear(year) {
    const node = trendNodes.filter(d => d.Year === year).node();
    if (!node) return;
    const bounds = node.getBoundingClientRect();
    showTrendTooltip({
      clientX: bounds.left + bounds.width / 2,
      clientY: bounds.top + bounds.height / 2
    }, d3.select(node).datum());
  }

  // 2. Bottom Left Chart: Road-User Horizontal Bars
  const marginUsers = { top: 16, right: 65, bottom: 36, left: 295 };
  const widthUsers = 700 - marginUsers.left - marginUsers.right;
  const heightUsers = 360 - marginUsers.top - marginUsers.bottom;

  const svgUsers = d3.select(containerUsers)
    .append('svg')
    .attr('class', 'chart-svg')
    .attr('viewBox', `0 0 ${widthUsers + marginUsers.left + marginUsers.right} ${heightUsers + marginUsers.top + marginUsers.bottom}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const gUsers = svgUsers.append('g')
    .attr('transform', `translate(${marginUsers.left},${marginUsers.top})`);

  const xUsersScale = d3.scaleLinear().range([0, widthUsers]);
  const yUsersScale = d3.scaleBand().range([0, heightUsers]).padding(0.24);

  const usersGrid = gUsers.append('g').attr('class', 'grid');
  const xUsersAxis = gUsers.append('g').attr('class', 'axis axis-x').attr('transform', `translate(0,${heightUsers})`);
  const yUsersAxis = gUsers.append('g').attr('class', 'axis axis-y');

  // 3. Bottom Right Chart: Age-Group Vertical Bars
  const marginAge = { top: 28, right: 20, bottom: 46, left: 50 };
  const widthAge = 460 - marginAge.left - marginAge.right;
  const heightAge = 360 - marginAge.top - marginAge.bottom;

  const svgAge = d3.select(containerAge)
    .append('svg')
    .attr('class', 'chart-svg')
    .attr('viewBox', `0 0 ${widthAge + marginAge.left + marginAge.right} ${heightAge + marginAge.top + marginAge.bottom}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const gAge = svgAge.append('g')
    .attr('transform', `translate(${marginAge.left},${marginAge.top})`);

  const fnAgeOrder = ['0-7', '8-16', '17-25', '26-39', '40-64', '65+'];

  const xAgeScale = d3.scaleBand()
    .domain(fnAgeOrder)
    .range([0, widthAge])
    .padding(0.28);

  const yAgeScale = d3.scaleLinear().range([heightAge, 0]);

  const ageGrid = gAge.append('g').attr('class', 'grid');
  const xAgeAxis = gAge.append('g').attr('class', 'axis axis-x').attr('transform', `translate(0,${heightAge})`);
  const yAgeAxis = gAge.append('g').attr('class', 'axis axis-y');

  function updateBottomCharts() {
    const t = d3.transition().duration(550).ease(d3.easeCubicOut);

    // Highlight active year node on top trend line
    trendNodes
      .transition(t)
      .attr('r', d => d.Year === activeYear ? 6.5 : 4.5);
    trendNodes.classed('active-year', d => d.Year === activeYear);

    // A. Filter Road Users
    const currentUsers = fnRoadUser.filter(d => d.Year === activeYear);
    currentUsers.sort((a, b) => {
      const valA = a.Hospitalisations === 'n.p.' ? -1 : a.Hospitalisations;
      const valB = b.Hospitalisations === 'n.p.' ? -1 : b.Hospitalisations;
      return valB - valA;
    });

    const maxNumericUser = d3.max(currentUsers, d => d.Hospitalisations === 'n.p.' ? 0 : d.Hospitalisations) || 1;
    xUsersScale.domain([0, maxNumericUser * 1.16]);
    yUsersScale.domain(currentUsers.map(d => d.RoadUser));

    xUsersAxis.transition(t).call(d3.axisBottom(xUsersScale).ticks(5).tickFormat(d3.format('~s')));
    yUsersAxis.transition(t).call(d3.axisLeft(yUsersScale));

    usersGrid.transition(t).call(
      d3.axisBottom(xUsersScale).ticks(5).tickSize(heightUsers).tickFormat('')
    ).call(g => g.select('.domain').remove());

    const getFnUserFill = (d, i) => {
      if (d.Hospitalisations === 'n.p.') return 'url(#diagonal-hatch-pattern)';
      if (i === 0) return 'var(--chart-bar-primary)';
      if (i === 1) return 'var(--accent-amber)';
      return 'var(--chart-bar-neutral)';
    };

    const userBars = gUsers.selectAll('.user-bar-item')
      .data(currentUsers, d => d.RoadUser);

    const userBarsEnter = userBars.enter().append('g')
      .attr('class', 'user-bar-item');

    userBarsEnter.append('rect')
      .attr('class', d => d.Hospitalisations === 'n.p.' ? 'chart-bar np-hatched-slot' : 'chart-bar')
      .attr('rx', 5)
      .attr('ry', 5)
      .attr('x', 0)
      .attr('y', d => yUsersScale(d.RoadUser))
      .attr('height', yUsersScale.bandwidth())
      .attr('width', 0);

    userBarsEnter.append('text')
      .attr('class', 'bar-value')
      .attr('y', d => yUsersScale(d.RoadUser) + yUsersScale.bandwidth() / 2 + 4);

    const userBarsMerged = userBarsEnter.merge(userBars);

    userBarsMerged.select('rect')
      .attr('class', d => d.Hospitalisations === 'n.p.' ? 'chart-bar np-hatched-slot' : 'chart-bar')
      .classed('rank-primary', (d, i) => d.Hospitalisations !== 'n.p.' && i === 0)
      .classed('rank-highlight', (d, i) => d.Hospitalisations !== 'n.p.' && i === 1)
      .classed('rank-neutral', (d, i) => d.Hospitalisations !== 'n.p.' && i > 1)
      .attr('fill', (d, i) => getFnUserFill(d, i))
      .transition(t)
      .attr('y', d => yUsersScale(d.RoadUser))
      .attr('height', yUsersScale.bandwidth())
      .attr('width', d => d.Hospitalisations === 'n.p.' ? 32 : xUsersScale(d.Hospitalisations));

    userBarsMerged.select('text')
      .classed('np-value', d => d.Hospitalisations === 'n.p.')
      .transition(t)
      .attr('x', d => (d.Hospitalisations === 'n.p.' ? 40 : xUsersScale(d.Hospitalisations) + 8))
      .attr('y', d => yUsersScale(d.RoadUser) + yUsersScale.bandwidth() / 2 + 4)
      .text(d => d.Hospitalisations === 'n.p.' ? 'n.p.' : window.formatNumber(d.Hospitalisations));

    userBars.exit().remove();

    userBarsMerged
      .on('mouseenter', function(event, d) {
        if (d.Hospitalisations === 'n.p.') {
          window.showTooltip(event, `
            <div class="tooltip-header">
              <span class="tooltip-tag" style="color: var(--accent-coral);">Suppressed Data ('n.p.')</span>
              <span class="tooltip-badge">${activeYear}</span>
            </div>
            <div class="tooltip-title">${d.RoadUser}</div>
            <div class="tooltip-extra">
              <strong>Data Not Published (n.p.)</strong><br>
              Small cell counts (&lt; 5 hospitalisations) are suppressed under AIHW privacy rules.
            </div>
          `);
        } else {
          window.showTooltip(event, `
            <div class="tooltip-header">
              <span class="tooltip-tag">First Nations Mode</span>
              <span class="tooltip-badge">${activeYear}</span>
            </div>
            <div class="tooltip-title">${d.RoadUser}</div>
            <div class="tooltip-metric-row">
              <span class="tooltip-value">${window.formatNumber(d.Hospitalisations)}</span>
              <span class="tooltip-subvalue">Admissions</span>
            </div>
            <div class="tooltip-extra">
              Bed Days: <strong>${d.BedDays === 'n.p.' ? 'n.p.' : window.formatNumber(d.BedDays)}</strong><br>
              ${d.BedDays !== 'n.p.' ? `Avg Stay: <strong>${(d.BedDays / d.Hospitalisations).toFixed(1)} days</strong>` : ''}
            </div>
          `);
        }
      })
      .on('mouseleave', () => {
        window.hideTooltip();
      });

    // B. Filter and Render Age Groups
    const currentAge = fnAge.filter(d => d.Year === activeYear);
    const ageMap = new Map(currentAge.map(d => [d.AgeGroup, d]));
    const formattedFnAge = fnAgeOrder.map(group => {
      return ageMap.get(group) || {
        Year: activeYear,
        AgeGroup: group,
        Hospitalisations: 'n.p.',
        BedDays: 'n.p.'
      };
    });

    const maxNumericAge = d3.max(formattedFnAge, d => d.Hospitalisations === 'n.p.' ? 0 : d.Hospitalisations) || 1;
    const peakAgeObj = formattedFnAge.reduce((a, b) => {
      const va = a.Hospitalisations === 'n.p.' ? -1 : a.Hospitalisations;
      const vb = b.Hospitalisations === 'n.p.' ? -1 : b.Hospitalisations;
      return vb > va ? b : a;
    }, formattedFnAge[0]);

    yAgeScale.domain([0, maxNumericAge * 1.16]);

    xAgeAxis.transition(t).call(d3.axisBottom(xAgeScale));
    yAgeAxis.transition(t).call(d3.axisLeft(yAgeScale).ticks(5).tickFormat(d3.format('~s')));

    ageGrid.transition(t).call(
      d3.axisLeft(yAgeScale).ticks(5).tickSize(-widthAge).tickFormat('')
    ).call(g => g.select('.domain').remove());

    const getFnAgeFill = d => {
      if (d.Hospitalisations === 'n.p.') return 'url(#diagonal-hatch-pattern)';
      if (d.AgeGroup === peakAgeObj.AgeGroup) return 'url(#emerald-bar-gradient)';
      return 'var(--chart-bar-primary)';
    };

    const ageBars = gAge.selectAll('.age-bar-item')
      .data(formattedFnAge, d => d.AgeGroup);

    const ageBarsEnter = ageBars.enter().append('g')
      .attr('class', 'age-bar-item');

    ageBarsEnter.append('rect')
      .attr('class', d => d.Hospitalisations === 'n.p.' ? 'chart-bar np-hatched-slot' : 'chart-bar')
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('x', d => xAgeScale(d.AgeGroup))
      .attr('width', xAgeScale.bandwidth())
      .attr('y', heightAge)
      .attr('height', 0);

    ageBarsEnter.append('text')
      .attr('class', 'bar-value')
      .attr('x', d => xAgeScale(d.AgeGroup) + xAgeScale.bandwidth() / 2)
      .attr('text-anchor', 'middle');

    const ageBarsMerged = ageBarsEnter.merge(ageBars);

    ageBarsMerged.select('rect')
      .attr('class', d => d.Hospitalisations === 'n.p.' ? 'chart-bar np-hatched-slot' : 'chart-bar')
      .classed('bar-peak', d => d.Hospitalisations !== 'n.p.' && d.AgeGroup === peakAgeObj.AgeGroup)
      .classed('rank-neutral', d => d.Hospitalisations !== 'n.p.' && d.AgeGroup !== peakAgeObj.AgeGroup)
      .attr('fill', d => getFnAgeFill(d))
      .transition(t)
      .attr('x', d => xAgeScale(d.AgeGroup))
      .attr('width', xAgeScale.bandwidth())
      .attr('y', d => d.Hospitalisations === 'n.p.' ? heightAge - 26 : yAgeScale(d.Hospitalisations))
      .attr('height', d => d.Hospitalisations === 'n.p.' ? 26 : heightAge - yAgeScale(d.Hospitalisations));

    ageBarsMerged.select('text')
      .classed('np-value', d => d.Hospitalisations === 'n.p.')
      .transition(t)
      .attr('x', d => xAgeScale(d.AgeGroup) + xAgeScale.bandwidth() / 2)
      .attr('y', d => (d.Hospitalisations === 'n.p.' ? heightAge - 32 : yAgeScale(d.Hospitalisations) - 7))
      .text(d => d.Hospitalisations === 'n.p.' ? 'n.p.' : window.formatNumber(d.Hospitalisations));

    ageBars.exit().remove();

    ageBarsMerged
      .on('mouseenter', function(event, d) {
        if (d.Hospitalisations === 'n.p.') {
          window.showTooltip(event, `
            <div class="tooltip-header">
              <span class="tooltip-tag" style="color: var(--accent-coral);">Suppressed Data ('n.p.')</span>
              <span class="tooltip-badge">${activeYear}</span>
            </div>
            <div class="tooltip-title">Age Group: ${d.AgeGroup}</div>
            <div class="tooltip-extra">
              Data suppressed for privacy protection (cell count &lt; 5).
            </div>
          `);
        } else {
          window.showTooltip(event, `
            <div class="tooltip-header">
              <span class="tooltip-tag">First Nations Age Cohort</span>
              <span class="tooltip-badge">${activeYear}</span>
            </div>
            <div class="tooltip-title">Age Bracket: ${d.AgeGroup} ${d.AgeGroup === '65+' ? '(Consolidated)' : ''}</div>
            <div class="tooltip-metric-row">
              <span class="tooltip-value">${window.formatNumber(d.Hospitalisations)}</span>
              <span class="tooltip-subvalue">Admissions</span>
            </div>
            <div class="tooltip-extra">
              Bed Days: <strong>${d.BedDays === 'n.p.' ? 'n.p.' : window.formatNumber(d.BedDays)}</strong><br>
              ${d.AgeGroup === '65+' ? '<em>AIHW consolidates older cohorts into 65+ for First Nations reporting.</em>' : ''}
            </div>
          `);
        }
      })
      .on('mouseleave', () => {
        window.hideTooltip();
      });
    window.refreshChartTooltip(containerUsers);
    window.refreshChartTooltip(containerAge);
    if (window.refreshDataTable) window.refreshDataTable('storyline4');
  }

  function setStoryline4Year(year) {
    activeYear = year;
    window.AppState.activeYearS4 = activeYear;

    const slider = document.getElementById('s4-year-slider');
    const badge = document.getElementById('s4-year-badge');
    if (slider) slider.value = activeYear;
    if (badge) badge.textContent = activeYear;

    updateBottomCharts();
    previewTrendYear(activeYear);
  }

  const slider = document.getElementById('s4-year-slider');
  const badge = document.getElementById('s4-year-badge');
  const playBtn = document.getElementById('s4-play-btn');

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

  if (slider && badge) {
    slider.addEventListener('input', (e) => {
      setStoryline4Year(+e.target.value);
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
          let nextYear = activeYear + 1;
          if (nextYear > 2021) nextYear = 2011;
          setStoryline4Year(nextYear);
        }, 1150);
      } else {
        clearInterval(playInterval);
        playInterval = null;
      }
    });
  }

  window.reset4 = () => {
    stopPlayback();
    setStoryline4Year(2021);
  };

  updateBottomCharts();
}
