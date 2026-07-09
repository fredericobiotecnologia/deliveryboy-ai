import { historicalDeliveries } from './historicalData.js';
import {
  getBestArea,
  getDemandScore,
  getTopRestaurants,
  getHourlyDemand,
  getLiveRecommendations,
  getPeakHours
} from './demandEngine.js';

const runButton = document.getElementById('run-analysis');
const statusLabel = document.getElementById('analysis-status-label');
const statusDot = document.querySelector('.status-dot');
const progressBar = document.getElementById('progress-fill');
const progressMessage = document.getElementById('progress-message');
const demandChart = document.getElementById('demand-chart');
const earningsChart = document.getElementById('earnings-chart');
const toast = document.getElementById('toast');
const aiStream = document.getElementById('ai-stream');

const areaRows = Array.from(document.querySelectorAll('.heatmap-row'));
const districtNames = ['Centro', 'Lagoa Grande', 'Industrial', 'Rosário', 'Jardim Panorâmico', 'Ipanema'];
const cityNeighborhoods = Array.from(document.querySelectorAll('.map-neighborhood'));
const cityMarkers = Array.from(document.querySelectorAll('.map-marker'));
const radarCore = document.getElementById('radar-core');
const selectedRegionLabel = document.getElementById('selected-region-label');
const selectedRegionScore = document.getElementById('selected-region-score');
const radarBestArea = document.getElementById('radar-best-area');
const radarConfidence = document.getElementById('radar-confidence');
const radarWait = document.getElementById('radar-wait');
const radarEarnings = document.getElementById('radar-earnings');
const deliveryList = document.getElementById('delivery-list');
const deliveryCountLabel = document.getElementById('delivery-count-label');
const simTimeLabel = document.getElementById('sim-time-label');
const demandIntensityLabel = document.getElementById('demand-intensity');
const mostActiveAreaLabel = document.getElementById('most-active-area');
const topRestaurantLabel = document.getElementById('top-restaurant');
const reasoningReport = document.getElementById('reasoning-report');
const reportArea = document.getElementById('report-area');
const reportConfidence = document.getElementById('report-confidence');
const reasoningBars = [
  document.getElementById('bar-historical-demand'),
  document.getElementById('bar-similar-periods'),
  document.getElementById('bar-restaurant-activity'),
  document.getElementById('bar-courier-availability'),
  document.getElementById('bar-wait-time'),
  document.getElementById('bar-earnings')
];
let currentRegionScores = districtNames.map(() => 50);
let simulatedTime = new Date(2026, 6, 9, 6, 0);
let activeDeliveries = [];
let deliveryIndex = 0;

function getDemandLevel(score) {
  if (score >= 95) return 'Very High';
  if (score >= 90) return 'High';
  if (score >= 84) return 'Medium';
  return 'Low';
}

function createLinePath(values, width, height, padding) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = (width - padding * 2) / (values.length - 1);
  const points = values.map((value, index) => {
    const x = padding + index * step;
    const normalized = (value - min) / range;
    const y = height - padding - normalized * (height - padding * 2);
    return { x, y };
  });

  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const area = `${line} L ${points[points.length - 1].x.toFixed(1)} ${height - padding} L ${points[0].x.toFixed(1)} ${height - padding} Z`;
  return { points, line, area };
}

function drawChart(svg, values, color, fillColor) {
  if (!svg) return;
  const width = 320;
  const height = 140;
  const padding = 24;
  const path = createLinePath(values, width, height, padding);
  const gridLines = Array.from({ length: 4 }, (_, index) => {
    const y = padding + index * ((height - padding * 2) / 3);
    return `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="rgba(255,255,255,0.08)" stroke-dasharray="4 4" />`;
  }).join('');
  const markers = path.points.map((point) => `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="4" fill="${color}" />`).join('');
  svg.innerHTML = `
    <defs>
      <linearGradient id="chart-fill" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${fillColor}" stop-opacity="0.35"></stop>
        <stop offset="100%" stop-color="${fillColor}" stop-opacity="0.02"></stop>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${width}" height="${height}" rx="18" fill="rgba(255,255,255,0.02)"></rect>
    ${gridLines}
    <path d="${path.area}" fill="url(#chart-fill)"></path>
    <path d="${path.line}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
    ${markers}
  `;
}

function updateHeatMap(values) {
  areaRows.forEach((row, index) => {
    const value = values[index];
    const label = row.querySelector('.bar-value');
    const bar = row.querySelector('.heatbar-fill');
    label.textContent = `${value}%`;
    bar.style.width = '0%';
    requestAnimationFrame(() => {
      bar.style.width = `${value}%`;
    });
  });
}

function getDemandClass(score) {
  if (score >= 90) return 'state-very-high';
  if (score >= 70) return 'state-high';
  if (score >= 45) return 'state-medium';
  return 'state-low';
}

function updateRadar(scores, recommendedArea = null) {
  currentRegionScores = scores;
  cityNeighborhoods.forEach((neighborhood, index) => {
    const area = neighborhood.dataset.area;
    neighborhood.classList.remove('state-low', 'state-medium', 'state-high', 'state-very-high', 'recommended');
    neighborhood.classList.add(getDemandClass(scores[index]));

    if (recommendedArea && area === recommendedArea) {
      neighborhood.classList.add('recommended');
    }
  });

  cityMarkers.forEach((marker, index) => {
    marker.classList.remove('state-low', 'state-medium', 'state-high', 'state-very-high', 'recommended');
    marker.classList.add(getDemandClass(scores[index]));

    if (recommendedArea && districtNames[index] === recommendedArea) {
      marker.classList.add('recommended');
    }
  });
}

function updateRecommendationSummary(data) {
  radarBestArea.textContent = data.bestArea;
  radarConfidence.textContent = `${data.confidence}% confidence`;
  radarWait.textContent = `${data.eta} min`;
  radarEarnings.textContent = `R$${data.earnings.toFixed(2)}/hour`;
}

function updateDashboard(data, highlightedArea = null) {
  document.getElementById('demand-score').textContent = `${data.demandScore}%`;
  document.getElementById('card-best-area').textContent = data.bestArea;
  document.getElementById('card-eta').textContent = `${data.eta} min`;
  document.getElementById('card-earnings').textContent = `R$${data.earnings.toFixed(2)}`;

  document.getElementById('live-demand').textContent = data.demandLevel;
  document.getElementById('fuel-efficiency').textContent = `${data.fuelSaving}% Saved`;
  document.getElementById('peak-area').textContent = data.bestArea;

  document.getElementById('best-area').textContent = data.bestArea;
  document.getElementById('confidence').textContent = `${data.confidence}%`;
  document.getElementById('wait-time').textContent = `${data.eta} minutes`;
  document.getElementById('earnings').textContent = `R$${data.earnings.toFixed(2)}/hour`;
  document.getElementById('fuel-saving').textContent = `${data.fuelSaving}%`;
  document.getElementById('demand-level').textContent = data.demandLevel;

  updateHeatMap(data.areaScores);
  updateRadar(data.regionScores, highlightedArea);
  updateRecommendationSummary(data);
  drawChart(demandChart, data.forecast, '#7c5cff', '#7c5cff');
  drawChart(earningsChart, data.earningsSeries, '#4ad5a0', '#4ad5a0');
}

function buildReasoningMessages() {
  return [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'Loading historical operational dataset...',
    'Dataset loaded successfully.',
    'Source:',
    'Real WhatsApp operational community.',
    'Community size:',
    '922 members.',
    'Historical coverage:',
    'March 2024 → July 2026.',
    'Detected businesses:',
    'Restaurants, bakeries, snack bars, pizzerias and motorcycle couriers.',
    'Analyzing historical delivery demand...',
    'Comparing current time with similar historical periods...',
    'Detecting recurring demand patterns...',
    'Identifying active restaurants...',
    'Estimating rider availability...',
    'Searching for demand hotspots...',
    'Cross-checking historical idle periods...',
    'Building confidence score...',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━'
  ];
}

function setAnalysisStatus(label, active) {
  statusLabel.textContent = label;
  statusDot.classList.toggle('active', active);
}

function showToast(message = 'AI recommendation completed.') {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

function animateCounters() {
  document.querySelectorAll('.dataset-counter').forEach((counter) => {
    const target = Number(counter.dataset.target || 0);
    if (!Number.isFinite(target)) return;

    const duration = 1400;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(target * eased);
      counter.textContent = value.toLocaleString('en-US');

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        counter.textContent = target.toLocaleString('en-US');
      }
    };

    requestAnimationFrame(tick);
  });
}

function typeParagraph(message, index, totalMessages, callback) {
  const line = document.createElement('div');
  line.className = 'ai-line';
  aiStream.appendChild(line);

  let current = '';
  const chars = message.split('');
  const interval = window.setInterval(() => {
    if (current.length < chars.length) {
      current += chars[current.length];
      line.textContent = current;
    } else {
      window.clearInterval(interval);
      if (index === totalMessages - 1) {
        callback();
      }
    }
  }, 28);
}

function highlightBestAreaCard() {
  const targetCard = document.getElementById('card-best-area').closest('.metric-card');
  if (!targetCard) return;

  targetCard.classList.remove('highlight-area');
  requestAnimationFrame(() => {
    targetCard.classList.add('highlight-area');
  });

  window.clearTimeout(highlightBestAreaCard.timeoutId);
  highlightBestAreaCard.timeoutId = window.setTimeout(() => {
    targetCard.classList.remove('highlight-area');
  }, 3000);
}

function hideReasoningReport() {
  reasoningReport.classList.remove('visible');
  reasoningBars.forEach((bar) => {
    if (bar) {
      bar.style.width = '0%';
    }
  });
}

function showReasoningReport(analysis) {
  if (!reasoningReport) return;

  reportArea.textContent = analysis.bestArea;
  reportConfidence.textContent = `${analysis.confidence}%`;

  const fillTargets = [96, 94, 91, 88, 84, 82];
  requestAnimationFrame(() => {
    reasoningBars.forEach((bar, index) => {
      if (!bar) return;
      bar.style.width = `${fillTargets[index]}%`;
    });
  });

  reasoningReport.classList.add('visible');
}

function showRecommendation(analysis) {
  const reasoningHighlights = [
    'Historical demand concentration detected.',
    'Similar days generated high delivery volume.',
    'High restaurant activity.',
    analysis.eta <= 4 ? 'Short average waiting time.' : 'Moderate average waiting time.',
    'Higher estimated hourly earnings.'
  ];

  const recommendation = document.createElement('div');
  recommendation.className = 'ai-recommendation';
  recommendation.innerHTML = `
    <div class="recommendation-divider"></div>
    <strong>AI Recommendation</strong>
    <div class="recommendation-grid">
      <div>
        <p class="recommendation-label">Best waiting area</p>
        <p class="recommendation-value">${analysis.bestArea}</p>
      </div>
      <div>
        <p class="recommendation-label">Confidence</p>
        <p class="recommendation-value">${analysis.confidence}%</p>
      </div>
    </div>
    <div class="recommendation-block">
      <p class="recommendation-label">Reasoning</p>
      <ul class="recommendation-list">
        ${reasoningHighlights.map((item) => `<li>${item}</li>`).join('')}
      </ul>
    </div>
    <div class="recommendation-divider"></div>
  `;
  aiStream.appendChild(recommendation);

  window.setTimeout(() => {
    highlightBestAreaCard();
    updateDashboard(analysis, analysis.bestArea);
    showReasoningReport(analysis);
    setAnalysisStatus('Complete', false);
    runButton.disabled = false;
    runButton.textContent = 'Análise executiva de IA';
    radarCore.classList.remove('analysis-running');
    showToast('Historical reasoning completed');
  }, 900);
}

function generateAnalysis(deliveryContext = null) {
  const recommendations = getLiveRecommendations(simulatedTime);
  const bestRecommendation = recommendations[0] || {
    neighborhood: getBestArea(simulatedTime),
    demandScore: getDemandScore(getBestArea(simulatedTime), simulatedTime),
    eta: 4,
    earnings: 24,
    restaurants: []
  };
  const bestArea = deliveryContext?.neighborhood || bestRecommendation.neighborhood;
  const regionScores = districtNames.map((neighborhood) => getDemandScore(neighborhood, simulatedTime));
  const demandScore = Math.max(...regionScores);
  const eta = Math.max(2, Math.min(12, bestRecommendation.eta));
  const earnings = Number((bestRecommendation.earnings + (demandScore - 50) * 0.08).toFixed(2));
  const fuelSaving = Math.min(30, Math.max(8, 8 + Math.round(demandScore / 10)));
  const demandLevel = getDemandLevel(demandScore);
  const confidence = Math.min(98, Math.round(demandScore * 0.9 + 4));
  const hourlyDemand = getHourlyDemand(simulatedTime);
  const forecast = hourlyDemand.slice(0, 7).map((entry) => Math.max(20, Math.round(entry.demand * 0.62)));
  const earningsSeries = hourlyDemand.slice(0, 7).map((entry) => Number((earnings * (0.72 + entry.demand / 220)).toFixed(2)));

  return {
    demandScore,
    bestArea,
    eta,
    earnings,
    fuelSaving,
    demandLevel,
    confidence,
    areaScores: regionScores.map((value) => Math.round(value)),
    forecast,
    earningsSeries,
    regionScores,
    recommendations,
    hourlyDemand
  };
}

function runAnalysis() {
  const analysis = generateAnalysis();
  const messages = buildReasoningMessages();

  runButton.disabled = true;
  runButton.textContent = 'Analisando...';
  progressBar.style.width = '0%';
  progressMessage.textContent = 'Generating historical reasoning...';
  setAnalysisStatus('Running', true);
  aiStream.innerHTML = '';
  hideReasoningReport();
  radarCore.classList.add('analysis-running');
  updateRadar(analysis.regionScores.map((score) => Math.max(12, score - 18)));

  messages.forEach((message, index) => {
    window.setTimeout(() => {
      const percentage = Math.round(((index + 1) / messages.length) * 100);
      progressBar.style.width = `${percentage}%`;
      progressMessage.textContent = message;
      const stagedScores = analysis.regionScores.map((score, scoreIndex) => {
        const variance = (scoreIndex % 3 === 0 ? 4 : -3) + (index * 2);
        return Math.max(12, Math.min(98, score - variance));
      });
      updateRadar(stagedScores);
      typeParagraph(message, index, messages.length, () => {
        if (index === messages.length - 1) {
          showRecommendation(analysis);
        }
      });
    }, index * 650);
  });
}

function generateDeliveryRequest() {
  const delivery = historicalDeliveries[deliveryIndex % historicalDeliveries.length];
  deliveryIndex += 1;
  return {
    ...delivery,
    distance: Number(delivery.distance.toFixed(1)),
    value: Number(delivery.value.toFixed(2)),
    pickup: `${Math.min(6, Math.max(1, Math.round(delivery.distance / 1.2)))} min`,
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`
  };
}

function updateSimulationMetrics() {
  const recommendations = getLiveRecommendations(simulatedTime);
  const topRecommendation = recommendations[0];
  const contextHour = simulatedTime.getHours();
  let intensity = 'Low';
  if (contextHour >= 10 && contextHour < 15) intensity = 'Peak';
  else if (contextHour >= 18 || contextHour < 8) intensity = 'High';
  else if (contextHour >= 8 && contextHour < 10) intensity = 'Medium';

  demandIntensityLabel.textContent = intensity;
  mostActiveAreaLabel.textContent = topRecommendation?.neighborhood || 'Centro';
  topRestaurantLabel.textContent = topRecommendation?.restaurants?.[0] || getTopRestaurants(1)[0]?.restaurant || '—';
  deliveryCountLabel.textContent = `${activeDeliveries.length} active requests`;
  simTimeLabel.textContent = `Sim time: ${simulatedTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

function addDeliveryToFeed(delivery) {
  const item = document.createElement('article');
  item.className = 'delivery-item';
  item.innerHTML = `
    <div class="delivery-pill">Live</div>
    <div class="delivery-main">
      <strong>${delivery.restaurant}</strong>
      <span>${delivery.neighborhood}</span>
    </div>
    <div class="delivery-meta">
      <div><span>Distance</span><strong>${delivery.distance.toFixed(1)} km</strong></div>
      <div><span>Value</span><strong>R$${delivery.value.toFixed(2)}</strong></div>
      <div><span>Pickup</span><strong>${delivery.pickup}</strong></div>
    </div>
  `;
  deliveryList.prepend(item);
  requestAnimationFrame(() => item.classList.add('visible'));
  activeDeliveries = [delivery, ...activeDeliveries].slice(0, 6);
  updateSimulationMetrics();
  window.setTimeout(() => {
    item.classList.add('removing');
    window.setTimeout(() => {
      item.remove();
      activeDeliveries = activeDeliveries.filter((entry) => entry.id !== delivery.id);
      updateSimulationMetrics();
    }, 320);
  }, 7000);
}

function handleLiveDelivery(delivery) {
  const analysis = generateAnalysis(delivery);
  selectedRegionLabel.textContent = delivery.neighborhood;
  selectedRegionScore.textContent = `${analysis.regionScores[districtNames.indexOf(delivery.neighborhood)]}% demand`;
  updateDashboard(analysis, analysis.bestArea);
  setAnalysisStatus('Live', true);
  showToast('New delivery detected');
}

function startLiveSimulator() {
  const tick = () => {
    const delivery = generateDeliveryRequest();
    simulatedTime = new Date(simulatedTime.getTime() + 15 * 60000);
    addDeliveryToFeed(delivery);
    handleLiveDelivery(delivery);
    updateSimulationMetrics();
    window.setTimeout(tick, 4000);
  };
  tick();
}

cityNeighborhoods.forEach((neighborhood) => {
  neighborhood.addEventListener('click', () => {
    const region = neighborhood.dataset.area;
    const index = districtNames.indexOf(region);
    const score = currentRegionScores[index] ?? 0;
    selectedRegionLabel.textContent = region;
    selectedRegionScore.textContent = `${score}% demand`;
    cityNeighborhoods.forEach((item) => item.classList.toggle('active', item === neighborhood));
  });
});

runButton.addEventListener('click', runAnalysis);
updateDashboard(generateAnalysis());
animateCounters();
startLiveSimulator();
