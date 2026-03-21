export function setupUI() {
    console.log("Setting up UI listeners...");
    
    // Bind controls mapping
    const angleSlider = document.getElementById('angle-slider');
    const angleDisplay = document.getElementById('angle-display');
    const powerSlider = document.getElementById('power-slider');
    const powerDisplay = document.getElementById('power-display');

    if (angleSlider && angleDisplay) {
        angleSlider.addEventListener('input', (e) => {
            angleDisplay.innerText = `${e.target.value}°`;
        });
    }

    if (powerSlider && powerDisplay) {
        powerSlider.addEventListener('input', (e) => {
            powerDisplay.innerText = `${e.target.value}`;
        });
    }
}
