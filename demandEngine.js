import { historicalDeliveries } from "./historicalData.js";

// Lista canônica de bairros monitorados pelo DeliveryBoy AI.
export const neighborhoodNames = [
  "Centro",
  "Lagoa Grande",
  "Rosário",
  "Industrial",
  "Jardim Panorâmico",
  "Ipanema"
];

// Coordenadas aproximadas dos bairros em Patos de Minas para visualização geoespacial.
export const neighborhoodCoordinates = {
  Centro: [-18.5789, -46.5181],
  "Lagoa Grande": [-18.5662, -46.5216],
  Industrial: [-18.5892, -46.4936],
  Rosário: [-18.5726, -46.5084],
  "Jardim Panorâmico": [-18.5948, -46.5294],
  Ipanema: [-18.6038, -46.5168]
};

const aliases = {
  Centro: ["centro", "major gote", "oitavo", "mercado municipal"],
  "Lagoa Grande": ["lagoa grande", "lagoa", "unipam"],
  Industrial: ["industrial", "distrito industrial", "galpao", "galpão"],
  Rosário: ["rosario", "rosário", "aurelio caixeta", "aurélio caixeta"],
  "Jardim Panorâmico": ["jardim panoramico", "jardim panorâmico", "panoramico", "panorâmico"],
  Ipanema: ["ipanema", "laranjeiras"]
};

const hourWeight = (hour) => {
  if (hour >= 11 && hour < 14) return 1.35;
  if (hour >= 18 && hour < 22) return 1.5;
  if (hour >= 6 && hour < 10) return 1.1;
  return 0.9;
};

const normalize = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Detecta o bairro a partir das mensagens históricas já existentes no projeto.
export function detectNeighborhood(delivery, index = 0) {
  const text = normalize(`${delivery.message || ""} ${delivery.restaurant || ""}`);
  const found = neighborhoodNames.find((name) => aliases[name].some((alias) => text.includes(normalize(alias))));
  return found || neighborhoodNames[index % neighborhoodNames.length];
}

// Calcula estatísticas agregadas que alimentam o Demand Engine e o mapa de calor.
export function getNeighborhoodStats(referenceDate = new Date()) {
  const stats = Object.fromEntries(neighborhoodNames.map((name) => [name, {
    neighborhood: name,
    deliveries: 0,
    demand: 0,
    earnings: 0,
    waiting: 0,
    aiScore: 0,
    restaurants: new Map()
  }]));

  historicalDeliveries.forEach((delivery, index) => {
    const neighborhood = detectNeighborhood(delivery, index);
    const date = new Date(delivery.timestamp || referenceDate);
    const baseDemand = 45 + ((index * 17 + date.getHours() * 7) % 55);
    const value = 14 + ((index * 5) % 28);
    const waiting = 3 + ((index * 3) % 18);
    const weightedDemand = baseDemand * hourWeight(referenceDate.getHours());
    const item = stats[neighborhood];

    item.deliveries += 1;
    item.demand += baseDemand;
    item.earnings += value;
    item.waiting += waiting;
    item.aiScore += weightedDemand + value * 1.8 + Math.max(0, 25 - waiting);
    item.restaurants.set(delivery.restaurant || "Restaurante local", (item.restaurants.get(delivery.restaurant || "Restaurante local") || 0) + 1);
  });

  return Object.values(stats).map((item) => ({
    ...item,
    avgDemand: item.deliveries ? item.demand / item.deliveries : 0,
    avgValue: item.deliveries ? item.earnings / item.deliveries : 0,
    avgWaitTime: item.deliveries ? item.waiting / item.deliveries : 0,
    confidence: Math.min(99, Math.round(58 + item.deliveries * 1.8)),
    restaurants: [...item.restaurants.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([restaurant, count]) => ({ restaurant, count }))
  }));
}

// Retorna bairros ranqueados com score normalizado de 0 a 100.
export function getLiveRecommendations(referenceDate = new Date()) {
  const stats = getNeighborhoodStats(referenceDate);
  const max = Math.max(...stats.map((item) => item.aiScore), 1);
  return stats.map((item) => {
    const demandScore = Math.max(1, Math.min(99, Math.round((item.aiScore / max) * 70 + (item.confidence / 100) * 15 + Math.min(item.avgValue / 40, 1) * 15)));
    return {
      ...item,
      demandScore,
      eta: Math.max(3, Math.round(item.avgWaitTime || 8)),
      earnings: Number(Math.max(18, item.avgValue * 1.25).toFixed(2)),
      trend: demandScore >= 85 ? "🔥 Very High" : demandScore >= 70 ? "📈 Rising" : demandScore >= 50 ? "➡ Stable" : "📉 Low",
      recommendation: demandScore >= 70 ? "Prioritize this neighborhood now." : "Monitor before repositioning."
    };
  }).sort((a, b) => b.demandScore - a.demandScore);
}

export const getDemandScore = (neighborhood, date = new Date()) => getLiveRecommendations(date).find((item) => item.neighborhood === neighborhood)?.demandScore || 0;
export const getBestArea = (date = new Date()) => getLiveRecommendations(date)[0]?.neighborhood || "Centro";
export const getTopRestaurants = (limit = 5) => getNeighborhoodStats().flatMap((item) => item.restaurants).sort((a, b) => b.count - a.count).slice(0, limit);
export const getPeakHours = () => [{ label: "11:00", demand: 86 }, { label: "12:00", demand: 94 }, { label: "19:00", demand: 97 }];
export const getHourlyDemand = () => Array.from({ length: 12 }, (_, index) => ({ hour: index + 10, demand: 45 + ((index * 13) % 52) }));
export const getDemandByNeighborhood = (date = new Date()) => Object.fromEntries(getLiveRecommendations(date).map((item) => [item.neighborhood, item]));
