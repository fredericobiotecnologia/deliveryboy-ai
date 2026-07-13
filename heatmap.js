import { neighborhoodCoordinates, neighborhoodNames } from "./demandEngine.js";

// Centro geográfico usado para abrir o mapa diretamente em Patos de Minas - MG.
const PATOS_DE_MINAS_CENTER = [-18.5789, -46.5181];

// Estado interno do módulo para manter o código isolado e reutilizável.
let map;
let heatLayer;
let markers = [];

// Converte o score do Demand Engine para a intensidade esperada pelo Leaflet.heat.
const toIntensity = (score) => Math.max(0.15, Math.min(1, score / 100));

// Monta o conteúdo do popup solicitado para cada bairro.
const buildPopup = (item) => `
  <strong>${item.neighborhood}</strong><br>
  Score de demanda: ${item.demandScore}%<br>
  Tempo estimado: ${item.eta} min<br>
  Ganho estimado: R$${Number(item.earnings).toFixed(2)}<br>
  Nível de confiança: ${item.confidence}%
`;

// Inicializa o Leaflet e preserva o restante do dashboard sem alterar o design atual.
export function initializeDemandHeatmap(containerId = "leaflet-demand-map") {
  const container = document.getElementById(containerId);
  if (!container || !window.L || map) return;

  map = window.L.map(container, { scrollWheelZoom: false }).setView(PATOS_DE_MINAS_CENTER, 13);

  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  heatLayer = window.L.heatLayer([], { radius: 34, blur: 22, maxZoom: 16, gradient: { 0.3: "#4ad5a0", 0.6: "#ffb547", 0.8: "#ff7d2c", 1: "#ff4848" } }).addTo(map);

  setTimeout(() => map.invalidateSize(), 250);
}

// Atualiza a camada de calor e os popups sempre que uma análise for executada.
export function updateDemandHeatmap(recommendations = []) {
  if (!map || !heatLayer) return;

  const byName = new Map(recommendations.map((item) => [item.neighborhood, item]));
  const points = neighborhoodNames.map((name) => {
    const item = byName.get(name) || { neighborhood: name, demandScore: 1, eta: 0, earnings: 0, confidence: 0 };
    const [lat, lng] = neighborhoodCoordinates[name];
    return [lat, lng, toIntensity(item.demandScore)];
  });

  markers.forEach((marker) => marker.remove());
  markers = neighborhoodNames.map((name) => {
    const item = byName.get(name) || { neighborhood: name, demandScore: 0, eta: 0, earnings: 0, confidence: 0 };
    return window.L.circleMarker(neighborhoodCoordinates[name], { radius: 8, color: "#ffffff", weight: 1, fillColor: "#7c5cff", fillOpacity: toIntensity(item.demandScore) }).bindPopup(buildPopup(item)).addTo(map);
  });

  heatLayer.setLatLngs(points);
}
