import { historicalDeliveries } from './historicalData.js';

const neighborhoodNames = ['Centro', 'Lagoa Grande', 'Industrial', 'Rosário', 'Jardim Panorâmico', 'Ipanema'];

function toDate(value) {
  return value instanceof Date ? value : new Date(value);
}

function getNeighborhoodStats(referenceDate = new Date()) {
  const stats = neighborhoodNames.reduce((acc, neighborhood) => {
    acc[neighborhood] = {
      neighborhood,
      deliveries: 0,
      demand: 0,
      earnings: 0,
      waiting: 0,
      restaurants: new Map()
    };
    return acc;
  }, {});

  historicalDeliveries.forEach((delivery) => {
    const recordDate = toDate(delivery.timestamp);
    const hour = recordDate.getHours();
    const hourWeight = 1 + Math.max(0, hour - referenceDate.getHours()) * 0.01;
    const deliveryStats = stats[delivery.neighborhood];

    deliveryStats.deliveries += 1;
    deliveryStats.demand += delivery.predictedDemand * hourWeight;
    deliveryStats.earnings += delivery.value;
    deliveryStats.waiting += Math.round((delivery.distance * 1.4) + (delivery.predictedDemand / 12));

    const existingRestaurantCount = deliveryStats.restaurants.get(delivery.restaurant) || 0;
    deliveryStats.restaurants.set(delivery.restaurant, existingRestaurantCount + 1);
  });

  return Object.values(stats).map((item) => {
    item.avgValue = item.earnings / item.deliveries;
    item.avgWaitTime = item.waiting / item.deliveries;
    item.avgDemand = item.demand / item.deliveries;
    item.restaurants = [...item.restaurants.entries()]
      .map(([restaurant, count]) => ({ restaurant, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
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
  const maxDemand = Math.max(...stats.map((item) => item.demand));
  const maxEarnings = Math.max(...stats.map((item) => item.avgValue));
  const maxDeliveries = Math.max(...stats.map((item) => item.deliveries));

  return stats
    .map((item) => {
      const demandRatio = maxDemand ? item.demand / maxDemand : 0;
      const valueRatio = maxEarnings ? item.avgValue / maxEarnings : 0;
      const deliveryRatio = maxDeliveries ? item.deliveries / maxDeliveries : 0;
      const demandScore = Math.min(98, Math.round(demandRatio * 62 + valueRatio * 24 + deliveryRatio * 14));
      return {
        ...item,
        demandScore
      };
    })
    .sort((a, b) => b.demandScore - a.demandScore);
}

function getBestArea(referenceDate = new Date()) {
  return getRankedNeighborhoods(referenceDate)[0]?.neighborhood || neighborhoodNames[0];
}

function getDemandScore(neighborhood = getBestArea(), referenceDate = new Date()) {
  return getRankedNeighborhoods(referenceDate).find((item) => item.neighborhood === neighborhood)?.demandScore || 0;
}

function getTopRestaurants(limit = 5, referenceDate = new Date()) {
  const restaurantStats = new Map();

  historicalDeliveries.forEach((delivery) => {
    const current = restaurantStats.get(delivery.restaurant) || { restaurant: delivery.restaurant, count: 0, demand: 0, earnings: 0 };
    current.count += 1;
    current.demand += delivery.predictedDemand;
    current.earnings += delivery.value;
    restaurantStats.set(delivery.restaurant, current);
  });

  return [...restaurantStats.values()]
    .sort((a, b) => b.count - a.count || b.demand - a.demand)
    .slice(0, limit)
    .map((item) => ({
      restaurant: item.restaurant,
      count: item.count,
      demand: item.demand,
      earnings: Number(item.earnings / item.count).toFixed(2)
    }));
}

function getHourlyDemand(referenceDate = new Date()) {
  const hourlyTotals = Array.from({ length: 24 }, () => 0);

  historicalDeliveries.forEach((delivery) => {
    const hour = toDate(delivery.timestamp).getHours();
    hourlyTotals[hour] += delivery.predictedDemand * (1 + delivery.value / 100);
  });

  return hourlyTotals.map((total, hour) => ({
    hour,
    demand: Math.round(total / 4),
    label: `${String(hour).padStart(2, '0')}:00`
  }));
}

function getPeakHours(referenceDate = new Date()) {
  return [...getHourlyDemand(referenceDate)]
    .sort((a, b) => b.demand - a.demand)
    .slice(0, 3);
}

function getLiveRecommendations(referenceDate = new Date()) {
  return getRankedNeighborhoods(referenceDate)
    .slice(0, 4)
    .map((item) => ({
      neighborhood: item.neighborhood,
      demandScore: item.demandScore,
      eta: Math.max(2, Math.round(item.avgWaitTime / 2.4)),
      earnings: Number((item.avgValue + item.demandScore / 10).toFixed(2)),
      restaurants: item.restaurants.map((restaurant) => restaurant.restaurant)
    }));
}

export {
  getBestArea,
  getDemandScore,
  getTopRestaurants,
  getHourlyDemand,
  getLiveRecommendations,
  getPeakHours,
  getDemandByNeighborhood,
  getRankedNeighborhoods
};
