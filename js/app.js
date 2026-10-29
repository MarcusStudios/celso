/**
 * AuditTrail GRC — Aplicação Principal, Roteamento e Interatividade
 * Atualizado com Event Delegation segura (Anti-XSS), debounce, escala 24h e sincronização reativa.
 */

// =========================================================================
// RENDERIZADOR MESTRE
// =========================================================================
function renderAllViews() {
    renderTopBannersAndKPIs();
    renderOverviewCharts();
    renderRiskMatrixView();
    renderFootprintView();
    populateExplorerDropdowns();
    applyExplorerFilters(false); // sem re-selecionar imediatamente
    if (filteredRecords.length > 0) {
        selectExplorerRow(0);
    }
}

/**
 * Atualiza indicadores de cabeçalho, cartões de KPI e barra lateral.
 */
function renderTopBannersAndKPIs() {
    const hasData = telemetry.totalRecords > 0;
    const cascade = (hasData && telemetry.totalTransactions > 0)
        ? (telemetry.totalRecords / telemetry.totalTransactions).toFixed(2).replace('.', ',')
        : '0,00';

    const initials = telemetry.user && telemetry.user !== "Aguardando Upload" && telemetry.user !== "Usuário não identificado"
        ? telemetry.user.split(' ').filter(p => p.length > 0).slice(0, 2).map(p => p[0].toUpperCase()).join('')
        : '—';
    const initialsEl = document.getElementById('banner-user-initials');
    if (initialsEl) initialsEl.textContent = initials;

    document.getElementById('sidebar-user-name').textContent = telemetry.user || "Aguardando Upload";
    document.getElementById('sidebar-user-id').textContent = `ID: ${telemetry.userId || '—'}`;
    const sideErp = document.getElementById('sidebar-erp-ver');
    if (sideErp) sideErp.textContent = telemetry.erpVersion || '—';

    document.getElementById('nav-badge-total').textContent = hasData 
        ? (telemetry.totalRecords / 1000).toFixed(1).replace('.', ',') + 'k'
        : '0';

    const navDays = document.getElementById('nav-badge-days');
    if (navDays) {
        navDays.textContent = (telemetry.daily && telemetry.daily.length > 0) ? `${telemetry.daily.length}d` : '—';
    }

    const navRisks = document.getElementById('nav-badge-risks');
    if (navRisks) {
        navRisks.textContent = (FORENSIC_FINDINGS || []).length;
    }
    
    const periodText = (telemetry.periodStart && telemetry.periodEnd)
        ? `${telemetry.periodStart.substring(0, 16)} — ${telemetry.periodEnd.substring(0, 16)}`
        : 'Nenhuma planilha carregada';
    document.getElementById('topbar-period').textContent = periodText;

    document.getElementById('banner-user-id').textContent = `ID ${telemetry.userId || '—'}`;
    document.getElementById('banner-user-name').textContent = telemetry.user || "Aguardando Planilha";
    document.getElementById('banner-units-count').textContent = telemetry.totalUnits || 0;
    document.getElementById('banner-erp-ver').textContent = telemetry.erpVersion || "—";
    document.getElementById('banner-hostname').textContent = telemetry.hostname || "—";
    document.getElementById('banner-station').textContent = telemetry.mainStation || "—";
    document.getElementById('banner-os-hash').textContent = telemetry.osHash || "—";
    document.getElementById('banner-cascade').textContent = cascade;
    document.getElementById('banner-sessions').textContent = formatNumber(telemetry.totalSessions || 0);
    document.getElementById('banner-menus').textContent = formatNumber(telemetry.totalMenuAccess || 0);

    document.getElementById('kpi-total-records').textContent = formatNumber(telemetry.totalRecords || 0);
    document.getElementById('kpi-total-tx').textContent = `${formatNumber(telemetry.totalTransactions || 0)} cliques`;
    document.getElementById('kpi-cascade-pill').textContent = `${cascade}x cascata`;
    document.getElementById('kpi-units-total').textContent = `${telemetry.totalUnits || 0} Filiais`;

    // Top Filiais
    const topUnitsEl = document.getElementById('kpi-top-units');
    if (topUnitsEl) {
        if (telemetry.units && telemetry.units.length > 0) {
            topUnitsEl.textContent = telemetry.units.slice(0, 3).map(u => u.unit).join(', ');
        } else {
            topUnitsEl.textContent = '—';
        }
    }

    // Unidades badge
    const unitsBadgeEl = document.getElementById('kpi-units-badge');
    if (unitsBadgeEl) {
        if (hasData && telemetry.units && telemetry.units.length > 0) {
            const topUnit = telemetry.units[0];
            const pct = ((topUnit.count / telemetry.totalRecords) * 100).toFixed(1).replace('.', ',');
            unitsBadgeEl.textContent = `${topUnit.unit}: ${pct}%`;
        } else {
            unitsBadgeEl.textContent = '—';
        }
    }

    // Achados de conformidade KPI
    const riskCountEl = document.getElementById('kpi-risk-count');
    if (riskCountEl) {
        const count = (FORENSIC_FINDINGS || []).length;
        riskCountEl.textContent = `${count} ${count === 1 ? 'Categoria' : 'Categorias'}`;
    }
    const riskSubtitleEl = document.getElementById('kpi-risk-subtitle');
    if (riskSubtitleEl) {
        if (FORENSIC_FINDINGS && FORENSIC_FINDINGS.length > 0) {
            riskSubtitleEl.textContent = FORENSIC_FINDINGS.slice(0, 2).map(f => f.title.replace(/^\d+\.\s*/, '')).join(' • ');
        } else {
            riskSubtitleEl.textContent = hasData ? 'Nenhum desvio crítico' : 'Aguardando dados';
        }
    }

    // Visibilidade dos banners de Upload / Planilha Ativa no topo do Overview
    const ctaBanner = document.getElementById('overview-upload-cta');
    const activeBanner = document.getElementById('overview-active-file-banner');
    if (ctaBanner && activeBanner) {
        if (hasData) {
            ctaBanner.classList.add('hidden');
            activeBanner.classList.remove('hidden');
            const actRecs = document.getElementById('active-file-records');
            if (actRecs) actRecs.textContent = formatNumber(telemetry.totalRecords);
        } else {
            ctaBanner.classList.remove('hidden');
            activeBanner.classList.add('hidden');
        }
    }

    const del = (telemetry.operations && telemetry.operations["Exclusão"]) || 0;
    const edit = (telemetry.operations && telemetry.operations["Edição"]) || 0;
    const add = (telemetry.operations && telemetry.operations["Inclusão"]) || 0;
    const tot = Math.max(1, del + edit + add);

    document.getElementById('kpi-del-num').textContent = formatNumber(del);
    document.getElementById('kpi-edit-num').textContent = formatNumber(edit);
    document.getElementById('kpi-add-num').textContent = formatNumber(add);

    document.getElementById('bar-op-del').style.width = hasData ? `${((del / tot) * 100).toFixed(2)}%` : '0%';
    document.getElementById('bar-op-edit').style.width = hasData ? `${((edit / tot) * 100).toFixed(2)}%` : '0%';
    document.getElementById('bar-op-add').style.width = hasData ? `${((add / tot) * 100).toFixed(2)}%` : '0%';

    const entitiesCountEl = document.getElementById('kpi-entities-count');
    if (entitiesCountEl) {
        entitiesCountEl.textContent = `${telemetry.totalEntities || 0} entidades`;
    }
}

// =========================================================================
// VIEW 2: MATRIZ DE RISCOS & ACHADOS FORENSES
// =========================================================================
function renderRiskMatrixView() {
    // Atualização de contadores da barra lateral (todos os 8 atalhos)
    const badgeMap = {
        'self_audit': 'side-badge-self-audit',
        'supplier_bypass': 'side-badge-supplier-bypass',
        'physical_reversal': 'side-badge-physical-reversal',
        'manual_price': 'side-badge-manual-price',
        'clearance': 'side-badge-clearance',
        'packaging_change': 'side-badge-packaging',
        'after_hours': 'side-badge-after-hours',
        'deletions': 'side-badge-deletions'
    };

    Object.entries(badgeMap).forEach(([fId, elId]) => {
        const el = document.getElementById(elId);
        if (el) {
            const finding = (FORENSIC_FINDINGS || []).find(f => f.id === fId);
            el.textContent = finding ? formatNumber(finding.count || 0) : '0';
        }
    });

    // Título da Matriz
    const riskTitleEl = document.getElementById('risk-matrix-title');
    if (riskTitleEl) {
        const count = (FORENSIC_FINDINGS || []).length;
        riskTitleEl.textContent = count > 0 
            ? `${count} Classes de Eventos Sensíveis Detectadas na Trilha de Auditoria`
            : 'Nenhuma Exceção Forense Detectada';
    }

    const grid = document.getElementById('forensic-cards-grid');
    if (grid) {
        if (!FORENSIC_FINDINGS || FORENSIC_FINDINGS.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full p-8 rounded-lg border-2 border-dashed border-slate-200 bg-white text-center">
                    <i class="fa-solid fa-cloud-arrow-up text-4xl text-slate-300 mb-2"></i>
                    <h3 class="text-sm font-bold text-slate-700">Aguardando dados de auditoria</h3>
                    <p class="text-xs text-slate-500 mt-1 max-w-md mx-auto">Faça o upload de uma planilha (.xlsx ou .csv) na barra lateral para analisar e gerar a Matriz de Riscos em tempo real.</p>
                </div>
            `;
        } else {
            const totalRecs = Math.max(1, telemetry.totalRecords || 1);
            grid.innerHTML = FORENSIC_FINDINGS.map(f => {
                const borderAccent = f.severity === 'CRÍTICO'
                    ? 'border-l-4 border-l-rose-600'
                    : f.severity === 'ALTO'
                        ? 'border-l-4 border-l-amber-500'
                        : f.severity === 'MÉDIO'
                            ? 'border-l-4 border-l-indigo-500'
                            : 'border-l-4 border-l-emerald-500';

                const sharePct = ((f.count / totalRecs) * 100).toFixed(1).replace('.', ',');
                const entityTags = (f.entities || []).map(ent => {
                    const meta = getEntityVisualMeta(ent);
                    return `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border ${meta.bgClass}"><i class="${meta.icon} ${meta.colorClass} text-[9px]"></i>${escapeHtml(ent)}</span>`;
                }).join('');

                return `
                    <div class="surface-card surface-card-interactive p-4 flex flex-col justify-between ${borderAccent}">
                        <div>
                            <div class="flex items-center justify-between gap-2 mb-2">
                                <span class="pill-badge ${escapeHtml(f.badgeClass)}">${escapeHtml(f.severity)}</span>
                                <div class="flex items-center gap-2">
                                    <span class="font-mono text-xs font-bold text-slate-800 tabular-nums">${escapeHtml(f.occurrences)}</span>
                                    <span class="text-[10px] font-mono text-slate-400 tabular-nums">(${sharePct}% do log)</span>
                                </div>
                            </div>
                            <h4 class="text-sm font-bold text-slate-900">${escapeHtml(f.title)}</h4>
                            <p class="text-xs text-slate-600 mt-1.5 leading-relaxed">${escapeHtml(f.summary)}</p>
                            <div class="mt-2.5 flex items-center gap-1.5 flex-wrap">
                                ${entityTags}
                            </div>
                            ${f.timestamps ? `<div class="mt-2 text-[10px] font-mono text-slate-400 truncate" title="${escapeHtml(f.timestamps)}"><i class="fa-regular fa-clock mr-1"></i>Amostra: ${escapeHtml(f.timestamps)}</div>` : ''}
                        </div>
                        <div class="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div class="text-[11px] font-mono text-slate-500 truncate" title="${escapeHtml(f.controlRef)}">
                                <i class="fa-solid fa-scale-balanced text-slate-400 mr-1"></i>${escapeHtml(f.controlRef)}
                            </div>
                            <button type="button" data-action="inspect-anomaly" data-anomaly-id="${escapeHtml(f.id)}" class="px-3 py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-brand-600 text-white transition inline-flex items-center gap-1.5 shrink-0 cursor-pointer">
                                <span>Inspecionar Logs (${formatNumber(f.count)})</span>
                                <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // Tabela de Preços Manuais e Embalagens
    const priceTable = document.getElementById('table-risk-prices');
    const riskPricesSub = document.getElementById('risk-prices-sub');
    if (priceTable) {
        const priceRows = records.filter(r => r.entidade === 'AlteracaoPreco' || r.entidade === 'PrecoEmbalagemUnidadeNegocio');
        if (riskPricesSub) {
            const p1 = records.filter(r => r.entidade === 'AlteracaoPreco').length;
            const p2 = records.filter(r => r.entidade === 'PrecoEmbalagemUnidadeNegocio').length;
            riskPricesSub.innerHTML = `${formatNumber(p1)} registros em <code>AlteracaoPreco</code> e ${formatNumber(p2)} em <code>PrecoEmbalagemUnidadeNegocio</code>`;
        }

        if (priceRows.length === 0) {
            priceTable.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-slate-400 font-sans">Nenhum registro de preço carregado. Faça upload de uma planilha.</td></tr>`;
        } else {
            priceTable.innerHTML = priceRows.slice(0, 18).map(r => {
                const kv = r.kvPost || parseKeyValueString(r.valorPosterior);
                const antKv = r.kvAnt || parseKeyValueString(r.valorAnterior);
                const ant = parseBRNumber(kv.precoVendaAnterior || antKv.precoVenda || antKv.precoReferencial || 0);
                const post = parseBRNumber(kv.precoVendaPosterior || kv.precoVenda || 0);
                const diff = post - ant;
                const pct = ant > 0 ? ((diff / ant) * 100).toFixed(1) : '0.0';
                const embId = kv.embalagem || antKv.embalagem || '';
                const prodId = kv.produto || antKv.produto || '';

                const badgeClass = diff > 0 ? 'pill-crimson' : diff < 0 ? 'pill-emerald' : 'pill-slate';
                const prefix = diff > 0 ? '+' : '';

                return `
                    <tr tabindex="0" role="button" aria-label="Ver transação ${escapeHtml(r.transacao)}" data-action="jump-tx" data-tx="${escapeHtml(r.transacao)}" class="clickable-row hover:bg-slate-50">
                        <td class="py-2 px-3">${formatLogTimestampHtml(r.dataHora)}</td>
                        <td class="py-2 px-2.5"><span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-200">${escapeHtml(r.unNeg)}</span></td>
                        <td class="py-2 px-2.5 text-slate-700">
                            <div class="flex items-center gap-1.5">
                                <span class="px-1.5 py-0.2 rounded bg-sky-50 text-sky-800 border border-sky-200 font-mono font-bold text-[11px]">
                                    <i class="fa-solid fa-box text-sky-600 text-[9px] mr-1"></i>${escapeHtml(embId || prodId || '—')}
                                </span>
                            </div>
                            ${prodId && embId && prodId !== embId ? `<div class="text-[10px] text-slate-400 font-mono mt-0.5">Prod: ${escapeHtml(prodId)}</div>` : ''}
                        </td>
                        <td class="py-2 px-2.5 text-right"><span class="diff-val-old text-[11px]">${formatCurrency(ant)}</span></td>
                        <td class="py-2 px-2.5 text-right"><span class="diff-val-new text-[11px]">${formatCurrency(post)}</span></td>
                        <td class="py-2 px-3 text-right"><span class="pill-badge ${badgeClass}">${prefix}${pct}%</span></td>
                    </tr>
                `;
            }).join('');
        }
    }

    // Tabela de Ajuste de Estoque, NFe e Embalagens
    const stockTable = document.getElementById('table-risk-stock');
    if (stockTable) {
        const stockRows = records.filter(r => ['ItemNotaFiscal', 'CustoProduto', 'Estoque', 'Embalagem'].includes(r.entidade));
        if (stockRows.length === 0) {
            stockTable.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-400 font-sans">Nenhuma movimentação de NFe, estoque ou embalagem carregada.</td></tr>`;
        } else {
            stockTable.innerHTML = stockRows.slice(0, 18).map(r => {
                const ant = r.kvAnt || parseKeyValueString(r.valorAnterior);
                const post = r.kvPost || parseKeyValueString(r.valorPosterior);
                const meta = getEntityVisualMeta(r.entidade);
                let attr = 'quantidade';
                let pair = `<span class="diff-val-old text-[10px]">${escapeHtml(ant.quantidade || '—')}</span> <span class="diff-chip-arrow">&rarr;</span> <span class="diff-val-new text-[10px]">${escapeHtml(post.quantidade || '—')}</span>`;

                if (r.entidade === 'ItemNotaFiscal') {
                    if (ant.embalagem && post.embalagem && ant.embalagem !== post.embalagem) {
                        attr = 'embalagem + qtd';
                        pair = `<div><span class="diff-val-old text-[10px]">Emb ${escapeHtml(ant.embalagem)}</span> <span class="diff-chip-arrow">&rarr;</span> <span class="diff-val-new text-[10px]">Emb ${escapeHtml(post.embalagem)}</span></div><div class="text-[10px] text-slate-500 mt-0.5">Qtd: ${escapeHtml(ant.quantidade || '—')} &rarr; ${escapeHtml(post.quantidade || '—')}</div>`;
                    } else if (post.embalagem || ant.embalagem) {
                        attr = 'quantidade';
                        pair = `<div><span class="diff-val-old text-[10px]">${escapeHtml(ant.quantidade || '—')}</span> <span class="diff-chip-arrow">&rarr;</span> <span class="diff-val-new text-[10px]">${escapeHtml(post.quantidade || '—')}</span></div><div class="text-[10px] text-sky-700 font-mono mt-0.5"><i class="fa-solid fa-box text-sky-600 mr-1 text-[9px]"></i>Emb: ${escapeHtml(post.embalagem || ant.embalagem)}</div>`;
                    }
                } else if (r.entidade === 'Embalagem') {
                    attr = 'fator / preço';
                    const desc = post.descricao || ant.descricao || 'Embalagem';
                    const pA = ant.precoVenda ? formatCurrency(parseBRNumber(ant.precoVenda)) : '';
                    const pP = post.precoVenda ? formatCurrency(parseBRNumber(post.precoVenda)) : '';
                    const fat = post.quantidadePorEmbalagem || post.quantidadeEmbalagem ? `Fator ${post.quantidadePorEmbalagem || post.quantidadeEmbalagem}x` : '';
                    pair = `<div class="truncate max-w-[200px] text-slate-800 font-semibold text-[11px]" title="${escapeHtml(desc)}">${escapeHtml(desc)}</div><div class="text-[10px] text-slate-500 mt-0.5">${pA && pP && pA !== pP ? `<span class="diff-val-old">${pA}</span> &rarr; <span class="diff-val-new">${pP}</span> ` : ''}${fat ? `<span class="px-1 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">${escapeHtml(fat)}</span>` : ''}</div>`;
                } else if (r.entidade === 'CustoProduto') {
                    attr = 'custoMedio';
                    pair = `<span class="diff-val-old text-[10px]">${formatCurrency(parseBRNumber(ant.custoMedio))}</span> <span class="diff-chip-arrow">&rarr;</span> <span class="diff-val-new text-[10px]">${formatCurrency(parseBRNumber(post.custoMedio))}</span>`;
                } else if (r.entidade === 'Estoque') {
                    attr = 'estoque';
                    pair = `<span class="diff-val-old text-[10px]">${escapeHtml(ant.estoque || post.estoqueAnterior || '—')}</span> <span class="diff-chip-arrow">&rarr;</span> <span class="diff-val-new text-[10px]">${escapeHtml(post.estoque || '—')}</span>`;
                }

                return `
                    <tr tabindex="0" role="button" aria-label="Ver transação ${escapeHtml(r.transacao)}" data-action="jump-tx" data-tx="${escapeHtml(r.transacao)}" class="clickable-row hover:bg-slate-50">
                        <td class="py-2 px-3">${formatLogTimestampHtml(r.dataHora)}</td>
                        <td class="py-2 px-2"><span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-200">${escapeHtml(r.unNeg)}</span></td>
                        <td class="py-2 px-2.5">
                            <span class="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded border text-[11px] font-medium ${meta.bgClass}">
                                <i class="${meta.icon} ${meta.colorClass} text-[10px]"></i>
                                ${escapeHtml(r.entidade)}
                            </span>
                        </td>
                        <td class="py-2 px-2.5 text-slate-500 text-[11px]">${escapeHtml(attr)}</td>
                        <td class="py-2 px-2.5 text-right font-semibold text-slate-900">${pair}</td>
                    </tr>
                `;
            }).join('');
        }
    }
}

// =========================================================================
// VIEW 3: JORNADA, SESSÕES & RASTREIO DE TELAS
// =========================================================================
function timeToHoursFloat(tStr) {
    if (!tStr) return 0;
    const parts = tStr.split(':').map(Number);
    const h = Number.isFinite(parts[0]) ? parts[0] : 0;
    const m = Number.isFinite(parts[1]) ? parts[1] : 0;
    return h + (m / 60);
}

function renderFootprintView() {
    // 1. Régua Cronológica Diária
    const wdTitle = document.getElementById('footprint-workday-title');
    if (wdTitle) {
        const hasD = telemetry.daily && telemetry.daily.length > 0;
        wdTitle.textContent = hasD 
            ? `Cronologia Diária de Jornada de Trabalho (${telemetry.daily[0].date} a ${telemetry.daily[telemetry.daily.length - 1].date})`
            : 'Cronologia Diária de Jornada de Trabalho';
    }
    const wdSub = document.getElementById('footprint-workday-sub');
    if (wdSub) {
        const hasD = telemetry.daily && telemetry.daily.length > 0;
        wdSub.textContent = hasD 
            ? `Mapeamento do primeiro ao último registro em ${telemetry.daily.length} dias de atividade — clique em um dia para filtrar os logs`
            : 'Nenhuma jornada diária registrada';
    }

    const tbody = document.getElementById('footprint-daily-tbody');
    if (tbody) {
        if (!telemetry.daily || telemetry.daily.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="py-8 text-center text-slate-400 font-sans">Nenhuma jornada diária registrada. Faça o upload de uma planilha.</td></tr>`;
        } else {
            tbody.innerHTML = telemetry.daily.map(d => {
                const startH = timeToHoursFloat(d.start);
                const endH = timeToHoursFloat(d.end);
                const leftPct = Math.max(0, Math.min(100, (startH / 24) * 100));
                const widthPct = Math.max(3, Math.min(100 - leftPct, ((endH - startH) / 24) * 100));
                const isWeekend = d.weekday === 'Dom' || d.weekday === 'Sáb';
                const isAfterHours = startH < 6 || endH >= 22 || isWeekend;
                const barColor = isAfterHours ? 'bg-amber-500' : 'bg-brand-600';

                return `
                    <tr tabindex="0" role="button" data-action="filter-date" data-date="${escapeHtml(d.date)}" class="clickable-row hover:bg-slate-50" title="Clique para filtrar os ${formatNumber(d.records)} logs do dia ${escapeHtml(d.date)}">
                        <td class="py-2.5 px-3 font-semibold text-slate-900">
                            <span class="inline-flex items-center gap-1.5">
                                <i class="fa-regular fa-calendar text-slate-400 text-[10px]"></i>
                                ${escapeHtml(d.date)}
                            </span>
                        </td>
                        <td class="py-2.5 px-2.5 font-sans">
                            <span class="px-1.5 py-0.5 rounded text-[11px] font-medium ${isWeekend ? 'bg-amber-100 text-amber-800 font-bold' : 'text-slate-600'}">${escapeHtml(d.weekday)}</span>
                        </td>
                        <td class="py-2.5 px-2.5 text-emerald-700 font-semibold">${escapeHtml(d.start)}</td>
                        <td class="py-2.5 px-2.5 ${endH >= 20 ? 'text-amber-700 font-semibold' : 'text-slate-700'}">${escapeHtml(d.end)}</td>
                        <td class="py-2.5 px-2.5 text-slate-500">${escapeHtml(d.span)}</td>
                        <td class="py-2.5 px-3">
                            <div class="w-full h-3 rounded-full bg-slate-100 relative overflow-hidden border border-slate-200/80" title="Início: ${escapeHtml(d.start)} | Término: ${escapeHtml(d.end)}">
                                <!-- Faixa de expediente comercial de referência (07h às 19h = 29% a 79%) -->
                                <div class="h-full bg-slate-200/60 absolute top-0 border-x border-slate-300/60" style="left: 29.1%; width: 50%"></div>
                                <div class="h-full ${barColor} rounded-full absolute top-0 shadow-2xs" style="left: ${leftPct.toFixed(1)}%; width: ${widthPct.toFixed(1)}%"></div>
                            </div>
                        </td>
                        <td class="py-2.5 px-2.5 text-right text-slate-600">${escapeHtml(d.sessions)}</td>
                        <td class="py-2.5 px-2.5 text-right text-slate-700 font-medium">${formatNumber(d.tx)}</td>
                        <td class="py-2.5 px-3 text-right font-bold text-brand-700">
                            ${formatNumber(d.records)} <i class="fa-solid fa-arrow-right text-[9px] text-slate-400 ml-1"></i>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }

    // 2. Rotas de Menus (Clicáveis para filtrar no Explorador)
    const menuBadge = document.getElementById('footprint-menu-badge');
    if (menuBadge) menuBadge.textContent = `${(telemetry.menus || []).length} Telas`;
    const menuSub = document.getElementById('footprint-menu-sub');
    if (menuSub) menuSub.textContent = `${formatNumber(telemetry.totalMenuAccess || 0)} aberturas de módulos — clique para inspecionar os acessos`;

    const menuEl = document.getElementById('footprint-menus-list');
    if (menuEl) {
        if (!telemetry.menus || telemetry.menus.length === 0) {
            menuEl.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs font-sans">Nenhum menu de operação rastreado na planilha.</div>`;
        } else {
            const maxMenu = Math.max(...telemetry.menus.map(m => m.count), 1);
            menuEl.innerHTML = telemetry.menus.map(m => {
                const pct = Math.round((m.count / maxMenu) * 100);
                return `
                    <button type="button" data-action="filter-menu" data-route="${escapeHtml(m.route)}" class="w-full text-left p-2.5 rounded-md border transition cursor-pointer ${m.risk ? 'bg-rose-50/70 border-rose-200 hover:bg-rose-100/70' : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100'}">
                        <div class="flex items-center justify-between text-xs font-mono">
                            <span class="${m.risk ? 'font-bold text-rose-800' : 'text-slate-800 font-medium'} truncate">
                                ${m.risk ? '<i class="fa-solid fa-triangle-exclamation text-rose-600 mr-1.5" title="Módulo Sensível"></i>' : '<i class="fa-solid fa-window-maximize text-slate-400 mr-1.5 text-[10px]"></i>'}${escapeHtml(m.route)}
                            </span>
                            <span class="font-semibold ${m.risk ? 'text-rose-700' : 'text-slate-700'} ml-2 shrink-0 tabular-nums">${m.count}x <i class="fa-solid fa-magnifying-glass text-[9px] text-slate-400 ml-1"></i></span>
                        </div>
                        <div class="w-full h-1.5 bg-slate-200/80 rounded-full mt-1.5 overflow-hidden">
                            <div class="h-full ${m.risk ? 'bg-rose-600' : 'bg-brand-600'}" style="width: ${pct}%"></div>
                        </div>
                    </button>
                `;
            }).join('');
        }
    }

    // 3. Sessões Autenticadas
    const sessBadge = document.getElementById('footprint-sess-badge');
    if (sessBadge) sessBadge.textContent = `${formatNumber(telemetry.totalSessions || 0)} Logins`;
    const sessSub = document.getElementById('footprint-sess-sub');
    if (sessSub) {
        sessSub.innerHTML = `${formatNumber(telemetry.totalSessions || 0)} autenticações originadas do host <code>${escapeHtml(telemetry.hostname || '—')}</code>`;
    }

    const sessTbody = document.getElementById('footprint-sessions-tbody');
    if (sessTbody) {
        const sessionRows = records.filter(r => r.entidade === 'SessaoUsuario' || r.entidade === 'Estacao');
        if (sessionRows.length === 0) {
            sessTbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-400 font-sans">Nenhuma sessão autenticada ou estação registrada.</td></tr>`;
        } else {
            sessTbody.innerHTML = sessionRows.slice(0, 50).map(r => {
                const kv = r.kvPost || parseKeyValueString(r.valorPosterior);
                return `
                    <tr tabindex="0" role="button" aria-label="Ver transação ${escapeHtml(r.transacao)}" data-action="jump-tx" data-tx="${escapeHtml(r.transacao)}" class="clickable-row hover:bg-slate-50">
                        <td class="py-2 px-2.5">${formatLogTimestampHtml(r.dataHora)}</td>
                        <td class="py-2 px-2"><span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-200">${escapeHtml(r.unNeg)}</span></td>
                        <td class="py-2 px-2.5 text-brand-700 font-semibold">${escapeHtml(kv.IDSessao || 'Host Edit')}</td>
                        <td class="py-2 px-2.5 text-slate-600"><i class="fa-solid fa-desktop text-slate-400 mr-1 text-[10px]"></i>${escapeHtml(kv.estacao || kv.id || '—')}</td>
                        <td class="py-2 px-2.5 text-right">
                            <span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 text-[10px]">#${escapeHtml(r.transacao)}</span>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }
}

// =========================================================================
// VIEW 4: EXPLORADOR FORENSE & FILTROS
// =========================================================================
function populateExplorerDropdowns() {
    const entSel = document.getElementById('exp-entity');
    const unitSel = document.getElementById('exp-unit');

    const entities = Array.from(new Set(records.map(r => r.entidade).filter(Boolean))).sort();
    const units = Array.from(new Set(records.map(r => r.unNeg).filter(Boolean))).sort();

    if (entSel) {
        entSel.innerHTML = `<option value="">Todas as Entidades (${entities.length})</option>` +
            entities.map(e => `<option value="${escapeHtml(e)}">${escapeHtml(e)}</option>`).join('');
    }

    if (unitSel) {
        unitSel.innerHTML = `<option value="">Todas as Filiais (${units.length})</option>` +
            units.map(u => `<option value="${escapeHtml(u)}">${escapeHtml(u)}</option>`).join('');
    }
}

function updateActiveFilterPillsUI() {
    // Destacar pílula forense ativa
    document.querySelectorAll('[data-anomaly-pill]').forEach(btn => {
        if (activeFindingFilter && btn.dataset.anomalyPill === activeFindingFilter) {
            btn.classList.add('active-pill');
        } else {
            btn.classList.remove('active-pill');
        }
    });

    const findingPill = document.getElementById('active-finding-pill');
    const findingVal = document.getElementById('active-finding-val');
    if (findingPill && findingVal) {
        if (activeFindingFilter) {
            const fObj = (FORENSIC_FINDINGS || []).find(x => x.id === activeFindingFilter);
            findingVal.textContent = fObj ? fObj.title.replace(/^\d+\.\s*/, '') : `Anomalia: ${activeFindingFilter}`;
            findingPill.classList.remove('hidden');
            findingPill.classList.add('inline-flex');
        } else if (activeEntitiesFilter && activeEntitiesFilter.length > 1) {
            findingVal.textContent = `Entidades (${activeEntitiesFilter.length})`;
            findingPill.classList.remove('hidden');
            findingPill.classList.add('inline-flex');
        } else {
            findingPill.classList.add('hidden');
            findingPill.classList.remove('inline-flex');
        }
    }
}

function applyExplorerFilters(autoSelect = true) {
    const q = (document.getElementById('exp-search')?.value || '').toLowerCase().trim();
    const ent = document.getElementById('exp-entity')?.value || '';
    const unit = document.getElementById('exp-unit')?.value || '';
    const op = document.getElementById('exp-op')?.value || '';
    const dateStart = document.getElementById('exp-date-start')?.value || '';
    const dateEnd = document.getElementById('exp-date-end')?.value || '';

    filteredRecords = records.filter(r => {
        // Filtro especial quando o atalho é extra-expediente
        if (activeFindingFilter === 'after_hours') {
            let time = '';
            if (r.dataHora.includes('T')) time = (r.dataHora.split('T')[1] || '').substring(0, 8);
            else time = (r.dataHora.split(' ')[1] || '').substring(0, 8);
            const h = parseInt(time.substring(0, 2), 10);
            const parsedD = parseDateComponents(r.dataHora);
            const isWeekend = parsedD ? (parsedD.getDay() === 0 || parsedD.getDay() === 6) : false;
            const isNight = (!isNaN(h) && (h >= 22 || h < 6));
            if (!isNight && !isWeekend) return false;
        }

        // Filtro por entidade individual ou conjunto de entidades ativas
        if (ent && r.entidade !== ent) return false;
        if (activeEntitiesFilter.length > 0 && !activeEntitiesFilter.includes(r.entidade)) return false;

        if (unit && r.unNeg !== unit) return false;
        if (op && r.operacao !== op) return false;
        if (activeTxFilter && String(r.transacao) !== String(activeTxFilter)) return false;

        // Filtro de intervalo de datas
        if (dateStart || dateEnd) {
            const rawDate = r.dataHora.split(' ')[0] || '';
            let isoDate = rawDate;
            if (rawDate.includes('/')) {
                const parts = rawDate.split('/');
                if (parts.length === 3) isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
            if (dateStart && isoDate < dateStart) return false;
            if (dateEnd && isoDate > dateEnd) return false;
        }

        // Busca rápida utilizando searchText pré-calculado
        if (q) {
            const hay = r.searchText || `${r.dataHora} ${r.unNeg} ${r.entidade} ${r.operacao} ${r.valorPosterior} ${r.valorAnterior} ${r.transacao}`.toLowerCase();
            if (!hay.includes(q)) return false;
        }
        return true;
    });

    // Atualizar contadores de resumo do conjunto filtrado
    let fDel = 0, fEdit = 0, fAdd = 0;
    const fTxSet = new Set();
    for (let i = 0; i < filteredRecords.length; i++) {
        const rec = filteredRecords[i];
        if (rec.transacao) fTxSet.add(rec.transacao);
        if (rec.operacao === 'Exclusão') fDel++;
        else if (rec.operacao === 'Edição') fEdit++;
        else if (rec.operacao === 'Inclusão') fAdd++;
    }

    const txCountEl = document.getElementById('exp-tx-count');
    if (txCountEl) txCountEl.textContent = formatNumber(fTxSet.size);
    const statDelEl = document.getElementById('exp-stat-del');
    if (statDelEl) statDelEl.textContent = formatNumber(fDel);
    const statEditEl = document.getElementById('exp-stat-edit');
    if (statEditEl) statEditEl.textContent = formatNumber(fEdit);
    const statAddEl = document.getElementById('exp-stat-add');
    if (statAddEl) statAddEl.textContent = formatNumber(fAdd);

    updateActiveFilterPillsUI();

    currentPage = 1;
    renderExplorerTable();

    if (autoSelect && filteredRecords.length > 0) {
        selectExplorerRow(0);
    } else if (filteredRecords.length === 0) {
        selectedRecord = null;
        renderDiffInspector(null);
    }
}

function renderExplorerTable() {
    const total = filteredRecords.length;
    const maxPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (currentPage > maxPages) currentPage = maxPages;

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filteredRecords.slice(start, start + PAGE_SIZE);

    document.getElementById('exp-count').textContent = formatNumber(total);
    document.getElementById('exp-page-label').textContent = `${currentPage} / ${maxPages}`;
    document.getElementById('exp-prev').disabled = currentPage <= 1;
    document.getElementById('exp-next').disabled = currentPage >= maxPages;

    const tbody = document.getElementById('exp-tbody');
    if (pageItems.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="py-10 text-center text-slate-400 font-sans">
                    <i class="fa-solid fa-magnifying-glass text-2xl text-slate-300 mb-2 block"></i>
                    Nenhum registro encontrado para os filtros aplicados.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = pageItems.map((r, idx) => {
        const absIndex = start + idx;
        const isSelected = selectedRecord === r;
        const opBadge = r.operacao === 'Exclusão' ? 'pill-crimson' : r.operacao === 'Edição' ? 'pill-amber' : r.operacao === 'Inclusão' ? 'pill-emerald' : 'pill-slate';
        const entityMeta = getEntityVisualMeta(r.entidade);
        const richSummary = buildRecordSummaryHtml(r);

        return `
            <tr tabindex="0" role="button" aria-label="Inspecionar registro ${escapeHtml(r.entidade)}" data-action="select-row" data-row-index="${absIndex}" class="clickable-row ${isSelected ? 'selected-log-row font-semibold' : ''}">
                <td class="py-2 px-3 whitespace-nowrap">${formatLogTimestampHtml(r.dataHora)}</td>
                <td class="py-2 px-2">
                    <span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-200">${escapeHtml(r.unNeg)}</span>
                </td>
                <td class="py-2 px-2.5">
                    <span class="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded border text-[11px] font-medium max-w-[165px] truncate ${entityMeta.bgClass}" title="${escapeHtml(r.entidade)}">
                        <i class="${entityMeta.icon} ${entityMeta.colorClass} text-[10px] shrink-0"></i>
                        <span class="truncate">${escapeHtml(r.entidade)}</span>
                    </span>
                </td>
                <td class="py-2 px-2"><span class="pill-badge ${opBadge}">${escapeHtml(r.operacao)}</span></td>
                <td class="py-2 px-2.5 max-w-[300px]">${richSummary}</td>
                <td class="py-2 px-2.5 text-right whitespace-nowrap">
                    ${r.transacao ? `
                        <button type="button" data-action="filter-tx-inline" data-tx="${escapeHtml(r.transacao)}" class="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-brand-50 text-slate-600 hover:text-brand-700 border border-slate-200 hover:border-brand-300 text-[10px] font-mono transition cursor-pointer" title="Filtrar toda a cascata da Transação #${escapeHtml(r.transacao)}">
                            #${escapeHtml(r.transacao)}
                        </button>
                    ` : '<span class="text-slate-300">—</span>'}
                </td>
            </tr>
        `;
    }).join('');
}

function selectExplorerRow(absIndex) {
    const rec = filteredRecords[absIndex];
    if (!rec) return;
    selectedRecord = rec;

    // Atualizar indicador de posição no cabeçalho do Inspetor
    const posEl = document.getElementById('diff-row-pos');
    if (posEl) {
        posEl.textContent = `• #${formatNumber(absIndex + 1)} de ${formatNumber(filteredRecords.length)}`;
    }

    // Atualização leve de classes visuais na tabela sem recriar todo o DOM
    const rows = document.querySelectorAll('#exp-tbody tr');
    const start = (currentPage - 1) * PAGE_SIZE;
    rows.forEach((row, idx) => {
        if (start + idx === absIndex) {
            row.classList.add('selected-log-row', 'font-semibold');
        } else {
            row.classList.remove('selected-log-row', 'font-semibold');
        }
    });

    renderDiffInspector(rec);
}

function quickToggleOpFilter(opName) {
    const opSel = document.getElementById('exp-op');
    if (!opSel) return;
    opSel.value = opSel.value === opName ? '' : opName;
    applyExplorerFilters();
}

function changeExplorerPageSize(newSize) {
    const parsed = parseInt(newSize, 10);
    if (parsed > 0) {
        PAGE_SIZE = parsed;
        currentPage = 1;
        renderExplorerTable();
    }
}

function filterByCurrentTx() {
    if (!selectedRecord || !selectedRecord.transacao) return;
    jumpToTransaction(selectedRecord.transacao);
}

function jumpToTransaction(txId) {
    switchView('view-explorer');
    activeTxFilter = txId;
    activeEntitiesFilter = [];
    activeFindingFilter = "";

    document.getElementById('exp-entity').value = '';
    document.getElementById('exp-unit').value = '';
    document.getElementById('exp-op').value = '';
    document.getElementById('exp-search').value = '';

    const pill = document.getElementById('active-tx-pill');
    if (pill) {
        pill.classList.remove('hidden');
        pill.classList.add('inline-flex');
    }
    const valEl = document.getElementById('active-tx-val');
    if (valEl) valEl.textContent = `#${txId}`;

    applyExplorerFilters();
    notifyToast(`Filtrando cascata completa da Transação #${txId}`, 'info');
}

function filterByDate(dateStr) {
    switchView('view-explorer');
    activeFindingFilter = "";
    activeEntitiesFilter = [];
    let isoDate = dateStr;
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    const startInput = document.getElementById('exp-date-start');
    const endInput = document.getElementById('exp-date-end');
    if (startInput) startInput.value = isoDate;
    if (endInput) endInput.value = isoDate;
    applyExplorerFilters();
    notifyToast(`Filtrando registros do dia ${dateStr}`, 'info');
}

function clearTxFilter() {
    activeTxFilter = "";
    const pill = document.getElementById('active-tx-pill');
    if (pill) {
        pill.classList.add('hidden');
        pill.classList.remove('inline-flex');
    }
    applyExplorerFilters();
}

function setQuickFilter(entity, op, searchQuery, entitiesList = []) {
    switchView('view-explorer');
    clearTxFilter();
    
    activeEntitiesFilter = (entitiesList && entitiesList.length > 0) ? entitiesList : (entity ? [entity] : []);

    const entSel = document.getElementById('exp-entity');
    if (entSel) entSel.value = (activeEntitiesFilter.length === 1) ? activeEntitiesFilter[0] : '';

    const opSel = document.getElementById('exp-op');
    if (opSel) opSel.value = op || '';

    const unitSel = document.getElementById('exp-unit');
    if (unitSel) unitSel.value = '';

    const searchInput = document.getElementById('exp-search');
    if (searchInput) searchInput.value = searchQuery || '';
    
    const startInput = document.getElementById('exp-date-start');
    const endInput = document.getElementById('exp-date-end');
    if (startInput) startInput.value = '';
    if (endInput) endInput.value = '';

    applyExplorerFilters();
}

function resetExplorerFilters() {
    activeEntitiesFilter = [];
    activeFindingFilter = "";
    setQuickFilter('', '', '');
}

function changeExplorerPage(delta) {
    currentPage += delta;
    renderExplorerTable();
}

function inspectAnomaly(anomalyId) {
    const f = FORENSIC_FINDINGS.find(x => x.id === anomalyId);
    if (!f) {
        // Caso o usuário clique numa pílula antes ou sem ocorrências daquele achado específico
        activeFindingFilter = anomalyId;
        if (anomalyId === 'deletions') {
            setQuickFilter('', 'Exclusão', '', []);
        } else if (anomalyId === 'after_hours') {
            setQuickFilter('', '', '', []);
        } else {
            notifyToast("Nenhuma ocorrência desta categoria na planilha atual.", "info");
        }
        return;
    }
    activeFindingFilter = anomalyId;
    const opFilter = anomalyId === 'deletions' ? 'Exclusão' : '';
    const ents = (anomalyId === 'after_hours' || anomalyId === 'deletions') ? [] : (f.entities || []);
    setQuickFilter('', opFilter, f.searchKey || '', ents);
    notifyToast(`Inspecionando evidências: ${f.title}`, 'info');
}

// =========================================================================
// EVENT DELEGATION SEGURA (ANTI-XSS & ACESSIBILIDADE)
// =========================================================================
function setupEventDelegation() {
    // 1. Tabela do Explorador (seleção de linha e clique direto na transação)
    const expTbody = document.getElementById('exp-tbody');
    if (expTbody) {
        expTbody.addEventListener('click', e => {
            const txBtn = e.target.closest('button[data-action="filter-tx-inline"]');
            if (txBtn && txBtn.dataset.tx) {
                e.stopPropagation();
                jumpToTransaction(txBtn.dataset.tx);
                return;
            }
            const tr = e.target.closest('tr[data-action="select-row"]');
            if (tr && tr.dataset.rowIndex !== undefined) {
                selectExplorerRow(parseInt(tr.dataset.rowIndex, 10));
            }
        });

        expTbody.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                const tr = e.target.closest('tr[data-action="select-row"]');
                if (tr && tr.dataset.rowIndex !== undefined) {
                    e.preventDefault();
                    selectExplorerRow(parseInt(tr.dataset.rowIndex, 10));
                }
            }
        });
    }

    // 2. Navegação por setas (Cima / Baixo) no Explorador Forense
    window.addEventListener('keydown', e => {
        const expView = document.getElementById('view-explorer');
        if (!expView || expView.classList.contains('hidden')) return;
        const activeTag = document.activeElement?.tagName;
        if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return;
        if (!filteredRecords || filteredRecords.length === 0) return;

        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const curIdx = selectedRecord ? filteredRecords.indexOf(selectedRecord) : -1;
            const nextIdx = e.key === 'ArrowDown'
                ? Math.min(filteredRecords.length - 1, curIdx + 1)
                : Math.max(0, curIdx - 1);

            if (nextIdx !== curIdx && nextIdx >= 0) {
                const targetPage = Math.floor(nextIdx / PAGE_SIZE) + 1;
                if (targetPage !== currentPage) {
                    currentPage = targetPage;
                    renderExplorerTable();
                }
                selectExplorerRow(nextIdx);
            }
        }
    });

    // 3. Tabelas com pulo para transação (Preços, Estoque, Sessões)
    const txTables = ['table-risk-prices', 'table-risk-stock', 'footprint-sessions-tbody'];
    txTables.forEach(tId => {
        const tbody = document.getElementById(tId);
        if (tbody) {
            tbody.addEventListener('click', e => {
                const tr = e.target.closest('tr[data-action="jump-tx"]');
                if (tr && tr.dataset.tx) {
                    jumpToTransaction(tr.dataset.tx);
                }
            });

            tbody.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    const tr = e.target.closest('tr[data-action="jump-tx"]');
                    if (tr && tr.dataset.tx) {
                        e.preventDefault();
                        jumpToTransaction(tr.dataset.tx);
                    }
                }
            });
        }
    });

    // 4. Tabela de Cronologia Diária (Clique para filtrar por data)
    const dailyTbody = document.getElementById('footprint-daily-tbody');
    if (dailyTbody) {
        dailyTbody.addEventListener('click', e => {
            const tr = e.target.closest('tr[data-action="filter-date"]');
            if (tr && tr.dataset.date) {
                filterByDate(tr.dataset.date);
            }
        });
    }

    // 5. Lista de Rotas de Menus (Clique para filtrar acessos à tela)
    const menusList = document.getElementById('footprint-menus-list');
    if (menusList) {
        menusList.addEventListener('click', e => {
            const btn = e.target.closest('button[data-action="filter-menu"]');
            if (btn && btn.dataset.route) {
                activeFindingFilter = "";
                setQuickFilter('AcessoRecursoSistema', '', btn.dataset.route, ['AcessoRecursoSistema']);
                notifyToast(`Filtrando acessos ao menu: ${btn.dataset.route}`, 'info');
            }
        });
    }

    // 6. Grid de Cartões de Risco (Inspecionar Evidências)
    const riskGrid = document.getElementById('forensic-cards-grid');
    if (riskGrid) {
        riskGrid.addEventListener('click', e => {
            const btn = e.target.closest('button[data-action="inspect-anomaly"]');
            if (btn && btn.dataset.anomalyId) {
                inspectAnomaly(btn.dataset.anomalyId);
            }
        });
    }

    // 7. Busca com debounce para máxima fluidez
    const searchInput = document.getElementById('exp-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            applyExplorerFilters();
        }, 200));
    }
}

// =========================================================================
// NAVEGAÇÃO ENTRE TELAS E RESPONSIVIDADE
// =========================================================================
function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(viewId);
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('.sidebar-nav-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`nav-${viewId}`);
    if (btn) btn.classList.add('active');

    const titles = {
        'view-overview': '1. Visão Executiva & Telemetria Forense',
        'view-risk': '2. Matriz de Riscos & Achados de Conformidade (SOX / GRC)',
        'view-footprint': '3. Jornada de Trabalho, Sessões & Navegação de Menus',
        'view-explorer': '4. Explorador Forense & Inspetor de Diff (Antes vs. Depois)'
    };
    document.getElementById('topbar-view-title').textContent = titles[viewId] || 'AuditTrail GRC';
    
    // Fechar menu móvel caso aberto em telas pequenas
    if (window.innerWidth < 1024) {
        toggleSidebar(false);
    }
}

/**
 * Alterna entre recolher e expandir a barra lateral.
 * @param {boolean} [forceState]
 */
function toggleSidebar(forceState) {
    const isMobile = window.innerWidth < 1024;
    const drawer = document.getElementById('sidebar-drawer');
    const backdrop = document.getElementById('sidebar-backdrop');

    if (isMobile) {
        if (!drawer || !backdrop) return;
        const isOpen = typeof forceState === 'boolean' ? forceState : !drawer.classList.contains('open');
        if (isOpen) {
            drawer.classList.add('open');
            backdrop.classList.remove('hidden');
        } else {
            drawer.classList.remove('open');
            backdrop.classList.add('hidden');
        }
    } else {
        // Desktop
        const isCollapsed = typeof forceState === 'boolean' ? !forceState : !document.body.classList.contains('sidebar-collapsed');
        if (isCollapsed) {
            document.body.classList.add('sidebar-collapsed');
            localStorage.setItem('audittrail_sidebar_collapsed', 'true');
        } else {
            document.body.classList.remove('sidebar-collapsed');
            localStorage.setItem('audittrail_sidebar_collapsed', 'false');
        }
    }
}

// Fechamento de modais com a tecla Escape
window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closePdfModal();
        if (window.innerWidth < 1024) {
            toggleSidebar(false);
        }
    }
});

// Inicialização Geral
window.addEventListener('DOMContentLoaded', () => {
    // Restaurar preferência de barra lateral no desktop
    if (window.innerWidth >= 1024 && localStorage.getItem('audittrail_sidebar_collapsed') === 'true') {
        document.body.classList.add('sidebar-collapsed');
    }

    setupFileIngestion();
    setupEventDelegation();
    renderAllViews();
});
