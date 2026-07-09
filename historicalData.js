const neighborhoodPool = ['Centro', 'Lagoa Grande', 'Industrial', 'Rosário', 'Jardim Panorâmico', 'Ipanema'];
const restaurantPool = [
  'Padaria Suprema',
  'Café do Bairro',
  'Pão de Açúcar',
  'Bolos & Cia',
  'Sabor Mineiro',
  'Marmitaria Nobre',
  'Pizzaria Di Roma',
  'Sushi House',
  'Burguer Prime',
  'Mamma Mia',
  'Sushi Zen',
  'Lanche Express',
  'Tropical Grill',
  'Nori Express',
  'Café Central',
  'Pastelaria Aurora',
  'Restaurante do Norte',
  'Prato Feito da Vila',
  'Pizza da Serra',
  'Burger King'
];
const categoryPool = ['Bakery', 'Lunch', 'Afternoon', 'Dinner'];

const historicalDeliveries = Array.from({ length: 120 }, (_, index) => {
  const baseDate = new Date('2026-07-09T06:00:00');
  baseDate.setMinutes(baseDate.getMinutes() + index * 18);

  const neighborhood = neighborhoodPool[index % neighborhoodPool.length];
  const restaurant = restaurantPool[(index * 3 + 1) % restaurantPool.length];
  const category = categoryPool[(index + Math.floor(index / 6)) % categoryPool.length];
  const distance = Number((2.1 + ((index * 7) % 19) / 4 + (category === 'Dinner' ? 0.5 : 0)).toFixed(1));
  const demandBase = 38 + ((index * 11) % 43);
  const predictedDemand = Math.min(98, demandBase + (category === 'Dinner' ? 8 : category === 'Lunch' ? 6 : category === 'Bakery' ? 2 : 1));
  const value = Number((12 + distance * 3.5 + (predictedDemand / 10) + (category === 'Dinner' ? 4 : 1)).toFixed(2));

  return {
    id: `delivery-${index + 1}`,
    timestamp: baseDate.toISOString(),
    restaurant,
    neighborhood,
    distance,
    value,
    category,
    predictedDemand
  };
});

export { historicalDeliveries };
