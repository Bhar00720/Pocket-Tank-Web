export class PhysicsEngine {
  gravity: number;
  wind: number;
  airDensity: number;

  constructor() {
    this.gravity = 0.35;
    this.wind = 0;
    this.airDensity = 1.0;
  }

  randomizeWind(baseVolatility: number): number {
    const maxWind = 0.05 + (baseVolatility * 0.1);
    this.wind = (Math.random() - 0.5) * maxWind;
    return this.wind;
  }
}
