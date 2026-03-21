export class PhysicsEngine {
    constructor() {
        this.gravity = 0.35; // Visually scaled 9.8m/s^2
        this.wind = 0;      
        this.airDensity = 1.0; 
    }

    randomizeWind(baseVolatility) {
        // Volatility scales the max wind limits based on weather
        const maxWind = 0.05 + (baseVolatility * 0.1); 
        this.wind = (Math.random() - 0.5) * maxWind;
        return this.wind;
    }
}
