import { historicalDeliveries } from "./historicalData.js";
import { getBestArea, getDemandScore, getHourlyDemand, getLiveRecommendations, getPeakHours, getTopRestaurants, neighborhoodNames } from "./demandEngine.js";
import { initializeDemandHeatmap, updateDemandHeatmap } from "./heatmap.js";
import { initializeHistoricalEngine } from "./historicalEngine.js";

// Relógio simulado usado para recalcular o Demand Engine a cada nova análise.
let simulatedTime = new Date();

// Atalhos de DOM mantêm o código modular e evitam consultas repetidas.
const $ = (id) => document.getElementById(id);
const runButton = $("run-analysis");
const aiStream = $("ai-stream");
const progressBar = $("progress-fill");
const progressMessage = $("progress-message");
const demandChart = $("demand-chart");
const earningsChart = $("earnings-chart");
const areaRows = document.querySelectorAll(".heatmap-row");
const selectedRegionLabel = $("selected-region-label");
const selectedRegionScore = $("selected-region-score");

// Cria uma análise completa a partir dos dados históricos existentes e do Demand Engine.
function generateAnalysis() {
  const recommendations = getLiveRecommendations(simulatedTime);
  const best = recommendations[0];
  const regionScores = neighborhoodNames.map((district) => getDemandScore(district, simulatedTime));
  const demandScore = Math.max(...regionScores);
  const hourlyDemand = getHourlyDemand(simulatedTime);

  return {
    demandScore,
    bestArea: best?.neighborhood || getBestArea(simulatedTime),
    eta: best?.eta || 5,
    earnings: Number(best?.earnings || 25),
    fuelSaving: Math.max(8, Math.min(35, Math.round(demandScore / 3))),
    demandLevel: getDemandLevel(demandScore),
    confidence: best?.confidence || Math.min(99, demandScore),
    trend: best?.trend || "Stable",
    recommendation: best?.recommendation || "Stay in recommended area",
    restaurants: best?.restaurants || [],
    areaScores: regionScores,
    regionScores,
    forecast: hourlyDemand.slice(0, 8).map((item) => item.demand),
    earningsSeries: hourlyDemand.slice(0, 8).map((item) => Number((Number(best?.earnings || 25) * (item.demand / 100 + 0.5)).toFixed(2))),
    recommendations,
    hourlyDemand
  };
}

// Atualiza todos os cards existentes sem remover funcionalidades visuais do dashboard.
function updateDashboard(data, highlightedArea = null) {
  setText("demand-score", `${data.demandScore}%`);
  setText("card-best-area", data.bestArea);
  setText("card-eta", `${data.eta} min`);
  setText("card-earnings", `R$${data.earnings.toFixed(2)}`);
  setText("live-demand", data.demandLevel);
  setText("fuel-efficiency", `${data.fuelSaving}% Saved`);
  setText("peak-area", data.bestArea);
  setText("best-area", data.bestArea);
  setText("confidence", `${data.confidence}%`);
  setText("wait-time", `${data.eta} minutes`);
  setText("earnings", `R$${data.earnings.toFixed(2)}/hour`);
  setText("fuel-saving", `${data.fuelSaving}%`);
  setText("demand-level", data.demandLevel);
  setText("radar-best-area", data.bestArea);
  setText("radar-confidence", `${data.confidence}% confidence`);
  setText("radar-wait", `${data.eta} min`);
  setText("radar-earnings", `R$${data.earnings.toFixed(2)}`);
  setText("demand-intensity", data.demandLevel);
  setText("most-active-area", data.bestArea);
  setText("top-restaurant", getTopRestaurants(1)[0]?.restaurant || "Restaurante local");

  updateHeatMap(data.areaScores);
  updateRadar(data.regionScores, highlightedArea || data.bestArea);
  drawChart(demandChart, data.forecast, "#7c5cff");
  drawChart(earningsChart, data.earningsSeries, "#4ad5a0");
  updateDemandHeatmap(data.recommendations);
  updateRecommendationReport(data);
  updateAnalysisStatus("Ready", true);
}

// Executa a análise e dispara a atualização automática do mapa Leaflet.
function runAnalysis() {
  const messages = ["Loading historical operational dataset...", "Calculating neighborhood demand...", "Updating Leaflet heatmap layer...", "Recommendation completed."];
  runButton.disabled = true;
  updateAnalysisStatus("Running analysis", false);
  aiStream.innerHTML = "";
  progressBar.style.width = "0%";

  messages.forEach((message, index) => {
    setTimeout(() => {
      const line = document.createElement("div");
      line.textContent = message;
      aiStream.appendChild(line);
      progressBar.style.width = `${Math.round(((index + 1) / messages.length) * 100)}%`;
      progressMessage.textContent = message;

      if (index === messages.length - 1) {
        simulatedTime = new Date(simulatedTime.getTime() + 15 * 60000);
        updateDashboard(generateAnalysis());
        runButton.disabled = false;
      }
    }, index * 350);
  });
}

// Atualiza a lista de calor lateral já existente no layout.
function updateHeatMap(values) {
  const highest = Math.max(...values);
  areaRows.forEach((row, index) => {
    const value = values[index] || 0;
    row.querySelector(".bar-value").textContent = `${value}%`;
    row.querySelector(".heatbar-fill").style.width = `${value}%`;
    row.style.transform = value === highest ? "scale(1.02)" : "scale(1)";
    row.style.boxShadow = value === highest ? "0 0 22px rgba(124,92,255,.35)" : "none";
  });
}

// Sincroniza o SVG legado para preservar o design atual enquanto o Leaflet fornece o mapa real.
function updateRadar(scores, recommendedArea) {
  document.querySelectorAll(".map-neighborhood").forEach((neighborhood, index) => {
    const score = scores[index] || 0;
    neighborhood.classList.toggle("recommended", neighborhood.dataset.area === recommendedArea);
    neighborhood.onclick = () => {
      const item = getLiveRecommendations(simulatedTime).find((entry) => entry.neighborhood === neighborhood.dataset.area);
      selectedRegionLabel.textContent = item.neighborhood;
      selectedRegionScore.textContent = `${item.demandScore}% demand • ${item.eta} min • R$${item.earnings.toFixed(2)} • ${item.confidence}% confidence`;
    };
    neighborhood.style.opacity = String(0.35 + score / 150);
  });
}

// Desenha gráficos SVG simples para manter a previsão visual existente.
function drawChart(svg, values, color) {
  if (!svg || !values.length) return;
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => `${24 + index * 39},${120 - (value / max) * 90}`).join(" ");
  svg.innerHTML = `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></polyline>`;
}


// Mantém o relatório executivo do PR #2 sincronizado com os dados consolidados,
// sem sobrescrever a integração do mapa Leaflet adicionada no PR #1.
function updateRecommendationReport(data) {
  setText("report-area", data.bestArea);
  setText("report-confidence", `${data.confidence}%`);

  const historicalDemand = Math.min(100, data.demandScore);
  const courierAvailability = Math.max(35, Math.min(100, 100 - data.eta * 6));
  const restaurantDensity = Math.max(35, Math.min(100, data.restaurants.length * 18 || data.confidence));
  const routeEfficiency = Math.max(35, Math.min(100, data.fuelSaving * 3));

  setBarWidth("bar-historical-demand", historicalDemand);
  setBarWidth("bar-courier-availability", courierAvailability);
  setBarWidth("bar-restaurant-density", restaurantDensity);
  setBarWidth("bar-route-efficiency", routeEfficiency);
}

// Atualiza o estado visual da análise para as seções adicionadas antes do mapa Leaflet.
function updateAnalysisStatus(label, completed = false) {
  setText("analysis-status-label", label);
  const status = $("analysis-status");
  if (status) status.classList.toggle("is-complete", completed);
}

// Aplica largura nas barras opcionais do relatório somente quando elas existem no DOM.
function setBarWidth(id, value) {
  const element = $(id);
  if (element) element.style.width = `${Math.round(value)}%`;
}

// Define textos apenas quando o elemento existe, evitando quebrar seções opcionais.
function setText(id, value) {
  const element = $(id);
  if (element) element.textContent = value;
}

// Classificação textual compartilhada por cards e mapa.
function getDemandLevel(score) {
  if (score >= 90) return "Very High";
  if (score >= 70) return "High";
  if (score >= 50) return "Medium";
  return "Low";
}

// Inicialização principal do dashboard.
initializeDemandHeatmap();
const initialAnalysis = generateAnalysis();
updateDashboard(initialAnalysis);
initializeHistoricalEngine({
  simulatedTime,
  updateDashboard,
  updateRadar
});
runButton?.addEventListener("click", runAnalysis);

console.log(`DeliveryBoy AI loaded with ${historicalDeliveries.length} historical deliveries.`);
