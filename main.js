function generateAnalysis(deliveryContext = null) {

  const recommendations = getLiveRecommendations(simulatedTime);

  const best = recommendations[0] || {
    neighborhood: getBestArea(simulatedTime),
    demandScore: 50,
    eta: 5,
    earnings: 25,
    confidence: 80,
    trend: "Stable",
    recommendation: "Wait"
  };

  const bestArea = deliveryContext?.neighborhood || best.neighborhood;

  const regionScores = districtNames.map((district) =>
    getDemandScore(district, simulatedTime)
  );

  const demandScore = Math.max(...regionScores);

  const demandLevel = getDemandLevel(demandScore);

  const confidence = best.confidence || Math.min(99, demandScore);

  const eta = best.eta;

  const earnings = Number(best.earnings);

  const fuelSaving = Math.max(
    8,
    Math.min(
      35,
      Math.round(demandScore / 3)
    )
  );

  const hourlyDemand = getHourlyDemand(simulatedTime);

  const forecast = hourlyDemand
    .slice(0, 8)
    .map(item => item.demand);

  const earningsSeries = hourlyDemand
    .slice(0, 8)
    .map(item =>
      Number(
        (earnings * (item.demand / 100 + 0.5))
        .toFixed(2)
      )
    );

  return {

    demandScore,

    bestArea,

    eta,

    earnings,

    fuelSaving,

    demandLevel,

    confidence,

    trend: best.trend || "Stable",

    recommendation:
      best.recommendation ||
      "Stay in recommended area",

    restaurants:
      best.restaurants || [],

    areaScores: regionScores,

    regionScores,

    forecast,

    earningsSeries,

    recommendations,

    hourlyDemand

  };

}

function updateDashboard(data, highlightedArea = null) {

  document.getElementById("demand-score").textContent =
    `${data.demandScore}%`;

  document.getElementById("card-best-area").textContent =
    data.bestArea;

  document.getElementById("card-eta").textContent =
    `${data.eta} min`;

  document.getElementById("card-earnings").textContent =
    `R$${data.earnings.toFixed(2)}`;

  document.getElementById("live-demand").textContent =
    data.demandLevel;

  document.getElementById("fuel-efficiency").textContent =
    `${data.fuelSaving}% Saved`;

  document.getElementById("peak-area").textContent =
    data.bestArea;

  document.getElementById("best-area").textContent =
    data.bestArea;

  document.getElementById("confidence").textContent =
    `${data.confidence}%`;

  document.getElementById("wait-time").textContent =
    `${data.eta} minutes`;

  document.getElementById("earnings").textContent =
    `R$${data.earnings.toFixed(2)}/hour`;

  document.getElementById("fuel-saving").textContent =
    `${data.fuelSaving}%`;

  document.getElementById("demand-level").textContent =
    data.demandLevel;

  updateHeatMap(data.areaScores);

  updateRadar(
    data.regionScores,
    highlightedArea || data.bestArea
  );

  updateRecommendationSummary({
    bestArea: data.bestArea,
    confidence: data.confidence,
    eta: data.eta,
    earnings: data.earnings
  });

  drawChart(
    demandChart,
    data.forecast,
    "#7c5cff",
    "#7c5cff"
  );

  drawChart(
    earningsChart,
    data.earningsSeries,
    "#4ad5a0",
    "#4ad5a0"
  );

  const reportArea =
    document.getElementById("report-area");

  const reportConfidence =
    document.getElementById("report-confidence");

  if (reportArea)
    reportArea.textContent = data.bestArea;

  if (reportConfidence)
    reportConfidence.textContent =
      `${data.confidence}%`;

}

function showRecommendation(analysis) {

  const recommendation = document.createElement("div");

  recommendation.className = "ai-recommendation";

  recommendation.innerHTML = `

    <div class="recommendation-divider"></div>

    <strong>🧠 AI Decision Engine</strong>

    <div class="recommendation-grid">

      <div>

        <p class="recommendation-label">Recommended Area</p>

        <p class="recommendation-value">${analysis.bestArea}</p>

      </div>

      <div>

        <p class="recommendation-label">Confidence</p>

        <p class="recommendation-value">${analysis.confidence}%</p>

      </div>

    </div>

    <div class="recommendation-grid">

      <div>

        <p class="recommendation-label">Demand</p>

        <p class="recommendation-value">

          ${analysis.demandScore}%

        </p>

      </div>

      <div>

        <p class="recommendation-label">Trend</p>

        <p class="recommendation-value">

          ${analysis.trend}

        </p>

      </div>

    </div>

    <div class="recommendation-grid">

      <div>

        <p class="recommendation-label">

          ETA

        </p>

        <p class="recommendation-value">

          ${analysis.eta} min

        </p>

      </div>

      <div>

        <p class="recommendation-label">

          Expected Earnings

        </p>

        <p class="recommendation-value">

          R$${analysis.earnings.toFixed(2)}

        </p>

      </div>

    </div>

    <div class="recommendation-block">

      <p class="recommendation-label">

        AI Recommendation

      </p>

      <p class="recommendation-value">

        ${analysis.recommendation}

      </p>

    </div>

    <div class="recommendation-block">

      <p class="recommend

function runAnalysis() {

  const analysis = generateAnalysis();

  const messages = [

    "Loading historical operational dataset...",

    "Reading WhatsApp delivery history...",

    "Identifying active restaurants...",

    "Calculating neighborhood demand...",

    "Predicting next delivery hotspots...",

    "Running AI Decision Engine...",

    "Optimizing waiting locations...",

    "Estimating earnings...",

    "Building confidence score...",

    "Recommendation completed."

  ];

  runButton.disabled = true;

  runButton.textContent =

    "AI Processing...";

  aiStream.innerHTML = "";

  hideReasoningReport();

  radarCore.classList.add(

    "analysis-running"

  );

  setAnalysisStatus(

    "Running",

    true

  );

  progressBar.style.width = "0%";

  let step = 0;

  function nextStep() {

    if (step >= messages.length) {

      progressBar.style.width = "100%";

      progressMessage.textContent =

        "Historical reasoning completed.";

      showRecommendation(

        analysis

      );

      return;

    }

    const percent = Math.round(

      ((step + 1) /

        messages.length) *

      100

    );

    progressBar.style.width =

      percent + "%";

    progressMessage.textContent =

      messages[step];

    const line =

      document.createElement(

        "div"

      );

    line.className =

      "ai-line";

    line.textContent =

      messages[step];

    aiStream.appendChild(

      line

    );

    const animatedScores =

      analysis.regionScores.map(

        score =>

          Math.max(

            10,

            Math.min(

              99,

              score +

                Math.round(

                  Math.random() * 8 - 4

                )

            )

          )

      );

    updateRadar(

      animatedScores,

      analysis.bestArea

    );

    step++;

    setTimeout(

      nextStep,

      450

    );

  }

  nextStep();

}

function handleLiveDelivery(delivery) {

  const analysis = generateAnalysis(delivery);

  const regionIndex = districtNames.indexOf(
    delivery.neighborhood
  );

  const regionScore =
    regionIndex >= 0
      ? analysis.regionScores[regionIndex]
      : analysis.demandScore;

  selectedRegionLabel.textContent =
    delivery.neighborhood;

  selectedRegionScore.textContent =
    `${regionScore}% predicted demand`;

  updateDashboard(
    analysis,
    delivery.neighborhood
  );

  radarBestArea.textContent =
    analysis.bestArea;

  radarConfidence.textContent =
    `${analysis.confidence}% confidence`;

  radarWait.textContent =
    `${analysis.eta} min`;

  radarEarnings.textContent =
    `R$${analysis.earnings.toFixed(2)}/hour`;

  setAnalysisStatus(
    "Live",
    true
  );

  showToast(

    `📦 ${delivery.restaurant}
→ ${delivery.neighborhood}`

  );

  window.clearTimeout(
    handleLiveDelivery.statusTimer
  );

  handleLiveDelivery.statusTimer =
    window.setTimeout(() => {

      setAnalysisStatus(
        "Monitoring",
        false
      );

    }, 3000);

}

function updateSimulationMetrics() {

  const recommendations =
    getLiveRecommendations(simulatedTime);

  const top =
    recommendations[0] || {};

  const peaks =
    getPeakHours(simulatedTime);

  const currentHour =
    simulatedTime.getHours();

  let intensity = "Low";

  if (currentHour >= 11 && currentHour <= 14) {

    intensity = "🔥 Lunch Peak";

  } else if (currentHour >= 18 && currentHour <= 22) {

    intensity = "🍕 Dinner Peak";

  } else if (currentHour >= 8 && currentHour <= 10) {

    intensity = "📈 Rising";

  } else {

    intensity = "😴 Low";

  }

  demandIntensityLabel.textContent =
    intensity;

  mostActiveAreaLabel.textContent =
    top.neighborhood || "Centro";

  const restaurant =
    top.restaurants?.[0] ||
    getTopRestaurants(1)[0]?.restaurant ||
    "---";

  topRestaurantLabel.textContent =
    restaurant;

  deliveryCountLabel.textContent =
    `${activeDeliveries.length} active deliveries`;

  simTimeLabel.textContent =
    simulatedTime.toLocaleTimeString(
      "en-GB

function generateDeliveryRequest() {

  const delivery =
    historicalDeliveries[
      deliveryIndex %
      historicalDeliveries.length
    ];

  deliveryIndex++;

  const randomDistance =
    delivery.distance ??
    Number(
      (1.2 + Math.random() * 5.5)
      .toFixed(1)
    );

  const randomValue =
    delivery.value ??
    Number(
      (8 + Math.random() * 18)
      .toFixed(2)
    );

  const predictedDemand =
    delivery.predictedDemand ??
    Math.round(
      60 + Math.random() * 35
    );

  const waitingTime =
    Math.max(
      2,
      Math.round(
        randomDistance * 1.8
      )
    );

  return {

    ...delivery,

    distance: randomDistance,

    value: randomValue,

    predictedDemand,

    pickup:
      `${waitingTime} min`,

    generatedAt:
      simulatedTime.toISOString(),

    id:
      crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`

  };

}

function addDeliveryToFeed(delivery) {

  const item = document.createElement("article");

  item.className = "delivery-item";

  const score =
    delivery.predictedDemand || 0;

  let badge = "🟢";

  if (score >= 90) badge = "🔴";
  else if (score >= 75) badge = "🟠";
  else if (score >= 60) badge = "🟡";

  item.innerHTML = `

    <div class="delivery-pill">

      ${badge} Live

    </div>

    <div class="delivery-main">

      <strong>

        ${delivery.restaurant}

      </strong>

      <span>

        ${delivery.neighborhood}

      </span>

    </div>

    <div class="delivery-meta">

      <div>

        <span>Distance</span>

        <strong>

          ${delivery.distance.toFixed(1)} km

        </strong>

      </div>

      <div>

        <span>Value</span>

        <strong>

          R$${delivery.value.toFixed(2)}

        </strong>

      </div>

      <div>

        <span>Demand</span>

        <strong>

          ${score}%

        </strong>

      </div>

      <div>

        <span>Pickup</span>

        <strong>

          ${delivery.pickup}

        </strong>

      </div>

    </div>

  `;

  deliveryList.prepend(item);

  requestAnimationFrame(() => {

    item.classList.add("visible");

  });

  activeDeliveries.unshift(delivery);

  if (activeDeliveries.length > 8) {

    activeDeliveries.pop();

  }

  updateSimulationMetrics();

  setTimeout(() => {

    item.classList.add("removing");

    setTimeout(() => {

      item.remove();

      activeDeliveries =
        activeDeliveries.filter(

          d => d.id !== delivery.id

        );

      updateSimulationMetrics();

    }, 300);

  }, 8000);

}

function startLiveSimulator() {

  updateSimulationMetrics();

  function simulatorLoop() {

    simulatedTime = new Date(

      simulatedTime.getTime() +

      15 * 60000

    );

    const delivery =

      generateDeliveryRequest();

    addDeliveryToFeed(

      delivery

    );

    handleLiveDelivery(

      delivery

    );

    updateSimulationMetrics();

    const recommendations =

      getLiveRecommendations(

        simulatedTime

      );

    const scores =

      districtNames.map(

        district =>

          getDemandScore(

            district,

            simulatedTime

          )

      );

    updateRadar(

      scores,

      recommendations[0]?.neighborhood

    );

    const delay =

      recommendations[0]?.demandScore > 90

        ? 2500

        : recommendations[0]?.demandScore > 75

        ? 3500

        : 5000;

    startLiveSimulator.timer =

      window.setTimeout(

        simulatorLoop,

        delay

      );

  }

  if (

    startLiveSimulator.timer

  ) {

    clearTimeout(

      startLiveSimulator.timer

    );

  }

  simulatorLoop();

}

function buildReasoningMessages() {

  const peaks = getPeakHours(simulatedTime);

  const restaurants = getTopRestaurants(3);

  return [

    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",

    "🧠 Initializing AI Decision Engine...",

    "📚 Loading historical operational database...",

    `📦 ${historicalDeliveries.length} historical deliveries loaded.`,

    "📍 Detecting active neighborhoods...",

    `🔥 Peak hours: ${peaks.map(p => p.label).join(" • ")}`,

    "🏪 Ranking restaurant activity...",

    ...restaurants.map(

      (item, index) =>

        `${index + 1}. ${item.restaurant} (${item.count} deliveries)`

    ),

    "📈 Calculating demand prediction...",

    "🚦 Estimating waiting times...",

    "💰 Estimating earnings...",

    "🛰️ Updating AI hotspot radar...",

    "🤖 Confidence model completed.",

    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  ];

}


function showReasoningReport(analysis) {

  if (!reasoningReport) return;

  reportArea.textContent =
    analysis.bestArea;

  reportConfidence.textContent =
    `${analysis.confidence}%`;

  const demandWeight =
    Math.min(100, analysis.demandScore);

  const confidenceWeight =
    analysis.confidence;

  const earningsWeight =
    Math.min(
      100,
      Math.round(
        (analysis.earnings / 45) * 100
      )
    );

  const waitWeight =
    Math.max(
      40,
      100 - analysis.eta * 8
    );

  const historicalWeight =
    Math.round(
      (demandWeight +
       confidenceWeight) / 2
    );

  const restaurantWeight =
    Math.min(
      100,
      70 +
      analysis.restaurants.length * 8
    );

  const values = [

    historicalWeight,

    confidenceWeight,

    restaurantWeight,

    demandWeight,

    waitWeight,

    earningsWeight

  ];

  requestAnimationFrame(() => {

    reasoningBars.forEach(

      (bar, index) => {

        if (!bar) return;

        bar.style.width =
          `${values[index]}%`;

      }

    );

  });

  reasoningReport.classList.add(
    "visible"
  );

}

function animateCounters() {

  const counters =
    document.querySelectorAll(
      ".dataset-counter, .kpi-value"
    );

  counters.forEach(counter => {

    const target =
      Number(counter.dataset.target || 0);

    if (!target) return;

    const duration = 1800;

    const start =
      performance.now();

    function animate(now) {

      const progress =
        Math.min(
          1,
          (now - start) / duration
        );

      const eased =
        1 - Math.pow(
          1 - progress,
          4
        );

      const value =
        Math.round(
          target * eased
        );

      if (target >= 1000) {

        counter.textContent =
          value.toLocaleString(
            "en-US"
          );

      } else {

        counter.textContent =
          value;

      }

      if (progress < 1) {

        requestAnimationFrame(
          animate
        );

      } else {

        if (target >= 1000) {

          counter.textContent =
            target.toLocaleString(
              "en-US"
            );

        } else {

          counter.textContent =
            target;

        }

      }

    }

    requestAnimationFrame(
      animate
    );

  });

}

function getDemandLevel(score) {

  if (score >= 97) {

    return "🔥 Critical";

  }

  if (score >= 90) {

    return "🚀 Very High";

  }

  if (score >= 80) {

    return "📈 High";

  }

  if (score >= 65) {

    return "🟡 Medium";

  }

  if (score >= 45) {

    return "🟢 Moderate";

  }

  return "🔵 Low";

}

function updateRadar(scores, recommendedArea = null) {

  currentRegionScores = scores;

  let bestScore = 0;

  cityNeighborhoods.forEach((neighborhood, index) => {

    const area = neighborhood.dataset.area;

    const score = scores[index] || 0;

    if (score > bestScore) {

      bestScore = score;

    }

    neighborhood.classList.remove(
      "state-low",
      "state-medium",
      "state-high",
      "state-very-high",
      "recommended"
    );

    neighborhood.classList.add(
      getDemandClass(score)
    );

    neighborhood.style.opacity =
      Math.max(
        0.45,
        score / 100
      );

    if (
      recommendedArea &&
      area === recommendedArea
    ) {

      neighborhood.classList.add(
        "recommended"
      );

    }

  });

  cityMarkers.forEach((marker, index) => {

    const score = scores[index] || 0;

    marker.classList.remove(
      "state-low",
      "state-medium",
      "state-high",
      "state-very-high",
      "recommended"
    );

    marker.classList.add(
      getDemandClass(score)
    );

    marker.style.transform =
      `scale(${1 + score / 250})`;

    marker.style.opacity =
      Math.max(
        0.55,
        score / 100
      );

    if (
      recommendedArea &&
      districtNames[index] === recommendedArea
    ) {

      marker.classList.add(
        "recommended"
      );

    }

  });

  const radarGlow =
    document.querySelector(".radar-core");

  if (rad

function drawChart(svg, values, color, fillColor) {

  if (!svg || !values.length) return;

  const width = 320;
  const height = 140;
  const padding = 24;

  const path = createLinePath(
    values,
    width,
    height,
    padding
  );

  const maxValue = Math.max(...values);

  const grid = Array.from(
    { length: 5 },
    (_, i) => {

      const y =
        padding +
        i * ((height - padding * 2) / 4);

      return `
        <line
          x1="${padding}"
          y1="${y}"
          x2="${width-padding}"
          y2="${y}"
          stroke="rgba(255,255,255,.05)"
          stroke-dasharray="4 6"/>
      `;

    }

  ).join("");

  const labels = values.map((v, i) => {

    const x =
      padding +
      i *
      ((width - padding * 2) /
      (values.length - 1));

    return `
      <text
        x="${x}"
        y="${height-6}"
        fill="rgba(255,255,255,.45)"
        font-size="10"
        text-anchor="middle">

        ${i}

      </text>
    `;

  }).join("");

  const points = path.points.map(point =>

    `
      <circle
        cx="${point.x}"
        cy="${point.y}"
        r="4"
        fill="${color}">

        <animate
          attributeName="r"
          values="3;5;3"
          dur="2s"
          repeatCount="indefinite"/>

      </circle>
    `

  ).join("");

  svg.innerHTML = `

  <defs>

    <linearGradient
      id="gradient-fill"
      x1="0%"
      y1="0%"
      x2="0%"
      y2="100%">

      <stop
        offset="0%"
        stop-color="${fillColor}"
        stop-opacity=".45"/>

      <stop
        offset="100%"
        stop-color="${fillColor}"
        stop-opacity=".02"/>

    </linearGradient>

  </defs>

  ${grid}

  <path

      d="${path.area}"

      fill="url(#gradient-fill)">

  </path>

  <path

      d="${path.line}"

      fill="none"

      stroke="${color}"

      stroke-width="3"

      stroke-linejoin="round"

      stroke-linecap="round">

  </path>

  ${points}

  ${labels}

  `;

}

function updateHeatMap(values) {

  const highest = Math.max(...values);

  areaRows.forEach((row, index) => {

    const value = values[index] || 0;

    const label =
      row.querySelector(".bar-value");

    const bar =
      row.querySelector(".heatbar-fill");

    label.textContent = `${value}%`;

    bar.style.width = `${value}%`;

    row.classList.remove(
      "very-high",
      "high",
      "medium",
      "low"
    );

    if (value >= 90) {

      row.classList.add("very-high");

    } else if (value >= 75) {

      row.classList.add("high");

    } else if (value >= 55) {

      row.classList.add("medium");

    } else {

      row.classList.add("low");

    }

    if (value === highest) {

      row.style.transform =
        "scale(1.02)";

      row.style.boxShadow =
        "0 0 22px rgba(124,92,255,.35)";

    } else {

      row.style.transform =
        "scale(1)";

      row.style.boxShadow =
        "none";

    }

  });

}

import { initializeHistoricalEngine } from "./historicalEngine.js";

initializeHistoricalEngine({
    deliveries: historicalDeliveries,
    simulatedTime,
    updateDashboard,
    updateRadar
});

import { initializeHistoricalEngine } from "./historicalEngine.js";

initializeHistoricalEngine({
    simulatedTime,
    updateDashboard,
    updateRadar
});