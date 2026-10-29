/**
 * AuditTrail GRC — Gestão de Gráficos Forenses com Tipografia Padrão Inter
 */

const FONT_SANS = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
const FONT_MONO = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

let chartDailyCombo = null;
let chartHourlyCurve = null;
let chartUnitsBar = null;
let chartEntitiesBar = null;

/**
 * Renderiza ou atualiza os 4 gráficos corporativos da Visão Executiva com tipografia Inter.
 */
function renderOverviewCharts() {
    const fontMono = { family: FONT_MONO, size: 10 };
    const fontSans = { family: FONT_SANS, size: 11 };
    const gridColor = '#F1F5F9';
    const tickColor = '#64748B';

    // 1. Gráfico Diário Combo (Barras: Registros Banco | Linha: Transações Humanas)
    const dailyArr = telemetry.daily || [];
    const dailyLabels = dailyArr.map(d => `${d.label} (${(d.weekday || '').substring(0, 3)})`);
    const dailyRecords = dailyArr.map(d => d.records);
    const dailyTx = dailyArr.map(d => d.tx);

    const dailySub = document.getElementById('chart-daily-subtitle');
    if (dailySub) {
        if (dailyArr.length > 0) {
            const topDay = [...dailyArr].sort((a,b) => b.records - a.records)[0];
            dailySub.textContent = `Pico diário em ${topDay.date} com ${formatNumber(topDay.records)} registros de banco e ${formatNumber(topDay.tx)} transações`;
        } else {
            dailySub.textContent = 'Correlação diária de cliques de usuário vs. registros gerados em cascata no banco de dados';
        }
    }

    const hourlyArr = telemetry.hourly || [];
    const topHour = [...hourlyArr].sort((a,b) => b.count - a.count)[0];
    const hourlyBadge = document.getElementById('chart-hourly-badge');
    if (hourlyBadge) {
        hourlyBadge.textContent = topHour && topHour.count > 0 ? `Pico ${topHour.hour}` : 'Curva 24h';
    }
    const hourlySub = document.getElementById('chart-hourly-subtitle');
    if (hourlySub) {
        if (topHour && topHour.count > 0) {
            hourlySub.textContent = `Pico de atividade concentrado às ${topHour.hour} com ${formatNumber(topHour.count)} operações registradas`;
        } else {
            hourlySub.textContent = 'Distribuição das operações por faixa horária ao longo do expediente';
        }
    }

    const unitsArr = telemetry.units || [];
    const unitsBadge = document.getElementById('chart-units-badge');
    if (unitsBadge) unitsBadge.textContent = `${telemetry.totalUnits || 0} unidades`;
    const unitsSub = document.getElementById('chart-units-subtitle');
    if (unitsSub) {
        if (unitsArr.length > 0) {
            const topU = unitsArr[0];
            const pct = telemetry.totalRecords > 0 ? ((topU.count / telemetry.totalRecords) * 100).toFixed(1).replace('.', ',') : '0';
            unitsSub.textContent = `${topU.unit === 'ESC' ? 'Matriz ESC' : 'Filial ' + topU.unit} lidera com ${pct}% do volume, seguida por ${unitsArr.slice(1, 4).map(u => u.unit).join(', ')}`;
        } else {
            unitsSub.textContent = 'Concentração do volume operacional por filial ou matriz';
        }
    }

    const entsArr = telemetry.entities || [];
    const entBadge = document.getElementById('chart-entities-badge');
    if (entBadge) entBadge.textContent = `${telemetry.totalEntities || 0} entidades`;
    const entSub = document.getElementById('chart-entities-subtitle');
    if (entSub) {
        if (entsArr.length > 0) {
            entSub.textContent = `Tabelas mais impactadas: ${entsArr.slice(0, 4).map(e => e.entity).join(', ')}`;
        } else {
            entSub.textContent = 'Tabelas e objetos com maior quantidade de mutações registradas';
        }
    }

    const canvasDaily = document.getElementById('chartDailyCombo');
    if (canvasDaily) {
        if (chartDailyCombo) {
            chartDailyCombo.data.labels = dailyLabels;
            chartDailyCombo.data.datasets[0].data = dailyRecords;
            chartDailyCombo.data.datasets[1].data = dailyTx;
            chartDailyCombo.update();
        } else {
            chartDailyCombo = new Chart(canvasDaily, {
                data: {
                    labels: dailyLabels,
                    datasets: [
                        {
                            type: 'bar',
                            label: 'Registros no Banco',
                            data: dailyRecords,
                            backgroundColor: '#2563EB',
                            hoverBackgroundColor: '#1D4ED8',
                            borderRadius: 4,
                            yAxisID: 'y'
                        },
                        {
                            type: 'line',
                            label: 'Transações Humanas (Cliques)',
                            data: dailyTx,
                            borderColor: '#BE123C',
                            backgroundColor: '#BE123C',
                            borderWidth: 2,
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            tension: 0.25,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: { 
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                footer: () => '💡 Clique na barra para filtrar no Explorador'
                            }
                        }
                    },
                    onClick: (evt, activeEls) => {
                        if (activeEls && activeEls.length > 0) {
                            const idx = activeEls[0].index;
                            const dayObj = (telemetry.daily || [])[idx];
                            if (dayObj && dayObj.date) {
                                filterByDate(dayObj.date);
                            }
                        }
                    },
                    scales: {
                        x: { ticks: { color: tickColor, font: fontSans }, grid: { display: false } },
                        y: {
                            position: 'left',
                            ticks: { color: tickColor, font: fontMono },
                            grid: { color: gridColor }
                        },
                        y1: {
                            position: 'right',
                            ticks: { color: '#BE123C', font: fontMono },
                            grid: { drawOnChartArea: false }
                        }
                    }
                }
            });
        }
    }

    // 2. Curva de Ritmo Operacional por Hora (00h às 23h)
    const hourlyLabels = hourlyArr.map(h => h.hour);
    const hourlyCounts = hourlyArr.map(h => h.count);

    const canvasHourly = document.getElementById('chartHourlyCurve');
    if (canvasHourly) {
        if (chartHourlyCurve) {
            chartHourlyCurve.data.labels = hourlyLabels;
            chartHourlyCurve.data.datasets[0].data = hourlyCounts;
            chartHourlyCurve.update();
        } else {
            chartHourlyCurve = new Chart(canvasHourly, {
                type: 'line',
                data: {
                    labels: hourlyLabels,
                    datasets: [{
                        label: 'Registros / Hora',
                        data: hourlyCounts,
                        borderColor: '#0F172A',
                        backgroundColor: 'rgba(37, 99, 235, 0.08)',
                        borderWidth: 2,
                        fill: true,
                        pointBackgroundColor: hourlyArr.map(h => (topHour && h.hour === topHour.hour && topHour.count > 0) ? '#BE123C' : '#2563EB'),
                        pointRadius: hourlyArr.map(h => (topHour && h.hour === topHour.hour && topHour.count > 0) ? 5 : 3),
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { ticks: { color: tickColor, font: fontMono }, grid: { display: false } },
                        y: { ticks: { color: tickColor, font: fontMono }, grid: { color: gridColor } }
                    }
                }
            });
        }
    }

    // 3. Distribuição por Unidade de Negócio (Top 10)
    const topUnits = unitsArr.slice(0, 10);
    const unitsLabels = topUnits.map(u => u.unit === 'ESC' ? 'ESC (Matriz)' : `Filial ${u.unit}`);
    const unitsCounts = topUnits.map(u => u.count);

    const canvasUnits = document.getElementById('chartUnitsBar');
    if (canvasUnits) {
        if (chartUnitsBar) {
            chartUnitsBar.data.labels = unitsLabels;
            chartUnitsBar.data.datasets[0].data = unitsCounts;
            chartUnitsBar.update();
        } else {
            chartUnitsBar = new Chart(canvasUnits, {
                type: 'bar',
                data: {
                    labels: unitsLabels,
                    datasets: [{
                        label: 'Registros',
                        data: unitsCounts,
                        backgroundColor: topUnits.map((_, i) => i === 0 ? '#1D4ED8' : '#475569'),
                        borderRadius: 3
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { ticks: { color: tickColor, font: fontMono }, grid: { color: gridColor } },
                        y: { ticks: { color: '#0F172A', font: fontMono }, grid: { display: false } }
                    }
                }
            });
        }
    }

    // 4. Entidades de Banco de Dados Mais Afetadas (Top 10)
    const topEnts = entsArr.slice(0, 10);
    const entsLabels = topEnts.map(e => e.entity.length > 28 ? e.entity.substring(0, 26) + '…' : e.entity);
    const entsCounts = topEnts.map(e => e.count);

    const canvasEntities = document.getElementById('chartEntitiesBar');
    if (canvasEntities) {
        if (chartEntitiesBar) {
            chartEntitiesBar.data.labels = entsLabels;
            chartEntitiesBar.data.datasets[0].data = entsCounts;
            chartEntitiesBar.update();
        } else {
            chartEntitiesBar = new Chart(canvasEntities, {
                type: 'bar',
                data: {
                    labels: entsLabels,
                    datasets: [{
                        label: 'Registros Afetados',
                        data: entsCounts,
                        backgroundColor: '#334155',
                        borderRadius: 3
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { ticks: { color: tickColor, font: fontMono }, grid: { color: gridColor } },
                        y: { ticks: { color: '#0F172A', font: fontMono }, grid: { display: false } }
                    }
                }
            });
        }
    }
}
