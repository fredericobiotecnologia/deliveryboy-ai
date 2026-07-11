import { historicalDeliveries } from "./historicalData.js";

const neighborhoodNames = [
  "Centro",
  "Lagoa Grande",
  "Industrial",
  "Rosário",
  "Jardim Panorâmico",
  "Ipanema"
];

const HOUR_WEIGHTS = {
  breakfast: 1.05,
  lunch: 1.45,
  afternoon: 0.90,
  dinner: 1.60,
  night: 1.10
};

const WEEKDAY_WEIGHTS = {
  0: 1.30,
  1: 0.90,
  2: 1.00,
  3: 1.05,
  4: 1.15,
  5: 1.35,
  6: 1.45
};

function toDate(value) {
  return value instanceof Date ? value : new Date(value);
}

function getHourWeight(hour) {
  if (hour >= 6 && hour < 10) return HOUR_WEIGHTS.breakfast;
  if (hour >= 11 && hour < 14) return HOUR_WEIGHTS.lunch;
  if (hour >= 14 && hour < 18) return HOUR_WEIGHTS.afternoon;
  if (hour >= 18 && hour < 22) return HOUR_WEIGHTS.dinner;
  return HOUR_WEIGHTS.night;
}

function getWeekWeight(day) {
  return WEEKDAY_WEIGHTS[day] || 1;
}

function calculateAIScore(delivery) {
  const date = toDate(delivery.timestamp);

  const hourWeight = getHourWeight(date.getHours());
  const weekWeight = getWeekWeight(date.getDay());

  const demand = delivery.predictedDemand * 0.45;
  const earnings = delivery.value * 0.35;
  const distance = Math.max(1, 20 - delivery.distance) * 0.20;

  return (
    (demand + earnings + distance) *
    hourWeight *
    weekWeight
  );
}

function createStats() {
  return neighborhoodNames.reduce((acc, neighborhood) => {
    acc[neighborhood] = {
      neighborhood,
      deliveries: 0,
      demand: 0,
      earnings: 0,
      aiScore: 0,
      avg
  return Object.values(stats).map((item) => {

    item.avgValue = item.deliveries
      ? item.earnings / item.deliveries
      : 0;

    item.avgDemand = item.deliveries
      ? item.demand / item.deliveries
      : 0;

    item.avgWaitTime = item.deliveries
      ? item.waiting / item.deliveries
      : 0;

    item.confidence = Math.min(
      100,
      Math.round(55 + item.deliveries * 2.2)
    );

    if (item.avgDemand >= 90) {
      item.trend = "🔥 Very High";
    } else if (item.avgDemand >= 70) {
      item.trend = "📈 Rising";
    } else if (item.avgDemand >= 50) {
      item.trend = "➡ Stable";
    } else {
      item.trend = "📉 Low";
    }

    item.restaurants = [...item.restaurants.entries()]
      .map(([restaurant, count]) => ({
        restaurant,
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return item;

  });

}

function getDemandByNeighborhood(referenceDate = new Date()) {

  return getNeighborhoodStats(referenceDate).reduce((acc, item) => {

    acc[item.neighborhood] = item;

    return acc;

  }, {});

}

function getRankedNeighborhoods(referenceDate = new Date()) {

  const stats = getNeighborhoodStats(referenceDate);

  const maxScore = Math.max(
    ...stats.map(item => item.aiScore),
    1
  );

  return stats

    .map(item => {

      const demandRatio = item.aiScore / maxScore;

      const waitRatio =
        1 - Math.min(item.avgWaitTime / 30, 1);

      const valueRatio =
        Math.min(item.avgValue / 35, 1);

      const confidenceRatio =
        item.confidence / 100;

      const demandScore = Math.round(

        demandRatio * 55 +

        waitRatio * 15 +

        valueRatio * 20 +

        confidenceRatio * 10

      );

      return {

        ...item,

        demand

function getTopRestaurants(limit = 5) {

  const restaurants = new Map();

  historicalDeliveries.forEach(delivery => {

    const current = restaurants.get(delivery.restaurant) || {

      restaurant: delivery.restaurant,

      count: 0,

      demand: 0,

      earnings: 0

    };

    current.count++;

    current.demand += delivery.predictedDemand;

    current.earnings += delivery.value;

    restaurants.set(delivery.restaurant, current);

  });

  return [...restaurants.values()]

    .sort((a, b) =>

      b.count - a.count ||

      b.demand - a.demand ||

      b.earnings - a.earnings

    )

    .slice(0, limit)

    .map(item => ({

      restaurant: item.restaurant,

      count: item.count,

      demand: Math.round(item.demand),

      earnings: Number(

        item.earnings / item.count

      ).toFixed(2)

    }));

}

function