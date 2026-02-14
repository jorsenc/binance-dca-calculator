const calculateBtn = document.getElementById('calculate-btn');
const loader = document.getElementById('loader');
let chart = null;

async function fetchBinanceData(symbol, days) {
    const interval = '1d';
    const limit = days;
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        alert('Error fetching data from Binance. Please try again.');
        return null;
    }
}

function calculateDCA(klines, amount, frequency) {
    let totalInvested = 0;
    let totalCoins = 0;
    const history = [];

    // Reverse klines to go from oldest to newest if needed (Binance returns them in chronological order)
    klines.forEach((kline, index) => {
        const time = new Date(kline[0]).toLocaleDateString();
        const price = parseFloat(kline[4]); // Close price

        // Apply DCA based on frequency
        if (index % frequency === 0) {
            totalInvested += amount;
            totalCoins += amount / price;
        }

        const currentValue = totalCoins * price;
        history.push({
            time,
            invested: totalInvested,
            value: currentValue.toFixed(2)
        });
    });

    const finalPrice = parseFloat(klines[klines.length - 1][4]);
    const finalValue = totalCoins * finalPrice;
    const profitLoss = finalValue - totalInvested;
    const roi = (profitLoss / totalInvested) * 100;

    return {
        totalInvested,
        currentValue: finalValue,
        profitLoss,
        roi,
        history
    };
}

function updateUI(results) {
    document.getElementById('total-invested').textContent = `$${results.totalInvested.toLocaleString()}`;
    document.getElementById('current-value').textContent = `$${results.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const plElement = document.getElementById('profit-loss');
    plElement.textContent = `$${results.profitLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    plElement.className = `stat-value ${results.profitLoss >= 0 ? 'success' : 'danger'}`;

    const roiElement = document.getElementById('roi-percent');
    roiElement.textContent = `${results.roi.toFixed(2)}%`;
    roiElement.className = `stat-value ${results.roi >= 0 ? 'success' : 'danger'}`;

    updateChart(results.history);
}

function updateChart(history) {
    const ctx = document.getElementById('dcaChart').getContext('2d');

    if (chart) {
        chart.destroy();
    }

    const labels = history.map(h => h.time);
    const investedData = history.map(h => h.invested);
    const valueData = history.map(h => h.value);

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Portfolio Value',
                    data: valueData,
                    borderColor: '#0ecb81',
                    backgroundColor: 'rgba(14, 203, 129, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                },
                {
                    label: 'Total Invested',
                    data: investedData,
                    borderColor: '#F3BA2F',
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: { color: '#848e9c' }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#848e9c', maxTicksLimit: 8 }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#848e9c' }
                }
            }
        }
    });
}

calculateBtn.addEventListener('click', async () => {
    const asset = document.getElementById('asset').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const frequency = parseInt(document.getElementById('frequency').value);
    const duration = parseInt(document.getElementById('duration').value);

    loader.style.display = 'inline-block';
    calculateBtn.disabled = true;

    const data = await fetchBinanceData(asset, duration);
    if (data) {
        const results = calculateDCA(data, amount, frequency);
        updateUI(results);
    }

    loader.style.display = 'none';
    calculateBtn.disabled = false;
});

// Initial calculation
calculateBtn.click();
