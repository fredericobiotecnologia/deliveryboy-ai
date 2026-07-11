import { historicalDeliveries } from "./historicalData.js";

import {
    getBestArea,
    getDemandScore,
    getTopRestaurants,
    getPeakHours,
    getLiveRecommendations
} from "./demandEngine.js";

export function initializeHistoricalEngine(context) {

    console.log("====================================");
    console.log("DeliveryBoy AI Historical Engine");
    console.log("====================================");

    console.log(
        `Historical deliveries: ${historicalDeliveries.length}`
    );

    const bestArea =
        getBestArea(context.simulatedTime);

    const score =
        getDemandScore(
            bestArea,
            context.simulatedTime
        );

    const restaurants =
        getTopRestaurants(5);

    const peaks =
        getPeakHours(context.simulatedTime);

    const recommendations =
        getLiveRecommendations(
            context.simulatedTime
        );

    console.table(restaurants);

    console.table(peaks);

    console.table(recommendations);

    context.updateDashboard({

        demandScore: score,

        bestArea,

        eta:
            recommendations[0]?.eta || 4,

        earnings:
            recommendations[0]?.earnings || 30,

        fuelSaving: 18,

        demandLevel:
            score >= 90
                ? "Very High"
                : score >= 70
                ? "High"
                : "Medium",

        confidence:
            Math.min(99, score + 5),

        trend: "Stable",

        recommendation:
            "Wait in the recommended area.",

        restaurants:
            restaurants.map(r => r.restaurant),

        areaScores:
            recommendations.map(r => r.demandScore),

        regionScores:
            recommendations.map(r => r.demandScore),

        forecast: [55,62,68,81,77,70,64],

        earningsSeries: [28,31,34,38,40,36,33]

    });

    context.updateRadar(

        recommendations.map(
            r => r.demandScore
        ),

        bestArea

    );

    console.log(
        "Historical Engine initialized successfully."
    );

}