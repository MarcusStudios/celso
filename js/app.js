/**
 * AuditTrail GRC — Aplicação Principal, Roteamento e Interatividade
 */

// O Estado Global da Aplicação (telemetry, records, filteredRecords, etc.) é inicializado em data/initial-telemetry.js

// =========================================================================
// RENDERIZADOR MESTRE
// =========================================================================
function renderAllViews() {
    renderTopBannersAndKPIs();
    renderOverviewCharts();
    renderRiskMatrixView();
    renderFootprintView();
    populateExplorerDropdowns();
    applyExplorerFilters();
    if (filteredRecords.length > 0) {
        selectExplorerRow(0);
    }
}

/**
 * Atualiza indicadores de cabeçalho, cartões de KPI e barra lateral.
 */
function renderTopBannersAndKPIs() {
    const hasData = telemetry.totalRecords > 0;
    const cascade = hasData 
        ? (telemetry.totalRecords / Math.max(1, telemetry.totalTransactions)).toFixed(2).replace('.', ',')
        : '0,00';

    const initials = telemetry.user && telemetry.user !== "Aguardando Upload" && telemetry.user !== "Usuário não identificado"
        ? telemetry.user.split(' ').filter(p => p.length > 0).slice(0, 2).map(p => p[0].toUpperCase()).join('')
        : '—';
    const initialsEl = document.getElementById('banner-user-initials');
    if (initialsEl) initialsEl.textContent = initials;

    document.getElementById('sidebar-user-name').textContent = telemetry.user || "Aguardando Upload";
    document.getElementById('sidebar-user-id').textContent = `ID: ${telemetry.userId || '—'}`;
    document.getElementById('nav-badge-total').textContent = hasData 
        ? (telemetry.totalRecords / 1000).toFixed(1).replace('.', ',') + 'k'
        : '0';
    
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
    // Atualização de contadores da barra lateral
    const badgeMap = {
        'self_audit': 'side-badge-self-audit',
        'supplier_bypass': 'side-badge-supplier-bypass',
        'physical_reversal': 'side-badge-physical-reversal',
        'manual_price': 'side-badge-manual-price',
        'clearance': 'side-badge-clearance',
        'packaging_change': 'side-badge-packaging'
    };
    Object.entries(badgeMap).forEach(([fId, elId]) => {
        const el = document.getElementById(elId);
        if (el) {
            const finding = (FORENSIC_FINDINGS || []).find(f => f.id === fId);
            el.textContent = finding ? (finding.occurrences.replace(/[^0-9]/g, '') || '0') : '0';
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
            grid.innerHTML = FORENSIC_FINDINGS.map(f => `
                <div class="surface-card surface-card-interactive p-4 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between gap-2 mb-2">
                            <span class="pill-badge ${escapeHtml(f.badgeClass)}">${escapeHtml(f.severity)}</span>
                            <span class="font-mono text-xs font-semibold text-slate-700 tabular-nums">${escapeHtml(f.occurrences)}</span>
                        </div>
                        <h4 class="text-sm font-bold text-slate-900">${escapeHtml(f.title)}</h4>
                        <p class="text-xs text-slate-600 mt-1.5 leading-relaxed">${escapeHtml(f.summary)}</p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div class="text-[11px] font-mono text-slate-500 truncate" title="${escapeHtml(f.controlRef)}">
                            <i class="fa-solid fa-scale-balanced text-slate-400 mr-1"></i>${escapeHtml(f.controlRef)}
                        </div>
                        <button onclick="inspectAnomaly('${escapeHtml(f.id)}')" class="px-3 py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-brand-600 text-white transition inline-flex items-center gap-1.5 shrink-0 cursor-pointer">
                            <span>Inspecionar Evidências</span>
                            <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                        </button>
                    </div>
                </div>
            `).join('');
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
                const kv = parseKeyValueString(r.valorPosterior);
                const antKv = parseKeyValueString(r.valorAnterior);
                const ant = parseFloat(kv.precoVendaAnterior || antKv.precoVenda || antKv.precoReferencial || 0);
                const post = parseFloat(kv.precoVendaPosterior || kv.precoVenda || 0);
                const pct = ant > 0 ? (((post - ant) / ant) * 100).toFixed(1) : '0.0';
                const embId = kv.embalagem || antKv.embalagem || '';
                const prodId = kv.produto || antKv.produto || '';

                return `
                    <tr tabindex="0" role="button" aria-label="Ver transação ${escapeHtml(r.transacao)}" onclick="jumpToTransaction('${escapeHtml(r.transacao)}')" onkeydown="handleRowKeydown(event, '${escapeHtml(r.transacao)}')" class="clickable-row hover:bg-slate-50">
                        <td class="py-2 px-3 text-slate-600">${escapeHtml(r.dataHora)}</td>
                        <td class="py-2 px-2.5 font-semibold text-slate-800">${escapeHtml(r.unNeg)}</td>
                        <td class="py-2 px-2.5 text-slate-700">
                            <div class="flex items-center gap-1.5">
                                <i class="fa-solid fa-box text-sky-600 text-[10px]" title="ID da Embalagem"></i>
                                <span class="font-mono font-bold text-slate-900">${escapeHtml(embId || prodId || '—')}</span>
                            </div>
                            ${prodId && embId && prodId !== embId ? `<div class="text-[10px] text-slate-400 font-mono">Prod: ${escapeHtml(prodId)}</div>` : ''}
                        </td>
                        <td class="py-2 px-2.5 text-right text-slate-500">R$ ${ant.toFixed(2)}</td>
                        <td class="py-2 px-2.5 text-right font-semibold text-slate-900">R$ ${post.toFixed(2)}</td>
                        <td class="py-2 px-3 text-right"><span class="pill-badge pill-crimson">${pct}%</span></td>
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
                const ant = parseKeyValueString(r.valorAnterior);
                const post = parseKeyValueString(r.valorPosterior);
                let attr = 'quantidade';
                let pair = `${ant.quantidade || '—'} → ${post.quantidade || '—'}`;

                if (r.entidade === 'ItemNotaFiscal') {
                    if (ant.embalagem && post.embalagem && ant.embalagem !== post.embalagem) {
                        attr = 'embalagem + qtd';
                        pair = `<span class="text-sky-800 font-mono font-bold text-[11px]"><i class="fa-solid fa-box text-sky-600 mr-1 text-[10px]"></i>${escapeHtml(ant.embalagem)} → ${escapeHtml(post.embalagem)}</span><div class="text-[10px] text-slate-500">Qtd: ${escapeHtml(ant.quantidade || '—')} → ${escapeHtml(post.quantidade || '—')}</div>`;
                    } else if (post.embalagem || ant.embalagem) {
                        attr = 'quantidade';
                        pair = `<span class="font-mono font-bold">${escapeHtml(ant.quantidade || '—')} → ${escapeHtml(post.quantidade || '—')}</span><div class="text-[10px] text-slate-500 font-mono"><i class="fa-solid fa-box text-sky-600 mr-1 text-[9px]"></i>Emb: ${escapeHtml(post.embalagem || ant.embalagem)}</div>`;
                    }
                } else if (r.entidade === 'Embalagem') {
                    attr = 'embalagem (fator/desc)';
                    const desc = post.descricao || ant.descricao || 'Embalagem';
                    const pA = ant.precoVenda ? `R$ ${ant.precoVenda}` : '';
                    const pP = post.precoVenda ? `R$ ${post.precoVenda}` : '';
                    const fat = post.quantidadePorEmbalagem || post.quantidadeEmbalagem ? ` (Fator ${post.quantidadePorEmbalagem || post.quantidadeEmbalagem}x)` : '';
                    pair = `<div class="truncate max-w-[210px] text-slate-800 font-medium" title="${escapeHtml(desc)}">${escapeHtml(desc)}</div><div class="text-[10px] text-slate-500">${pA && pP ? `${pA} → ${pP}` : ''}${fat}</div>`;
                } else if (r.entidade === 'CustoProduto') {
                    attr = 'custoMedio';
                    pair = `R$ ${ant.custoMedio || '—'} → R$ ${post.custoMedio || '—'}`;
                } else if (r.entidade === 'Estoque') {
                    attr = 'estoque';
                    pair = `${ant.estoque || post.estoqueAnterior || '—'} → ${post.estoque || '—'}`;
                }

                return `
                    <tr tabindex="0" role="button" aria-label="Ver transação ${escapeHtml(r.transacao)}" onclick="jumpToTransaction('${escapeHtml(r.transacao)}')" onkeydown="handleRowKeydown(event, '${escapeHtml(r.transacao)}')" class="clickable-row hover:bg-slate-50">
                        <td class="py-2 px-3 text-slate-600">${escapeHtml(r.dataHora)}</td>
                        <td class="py-2 px-2 font-semibold text-slate-800">${escapeHtml(r.unNeg)}</td>
                        <td class="py-2 px-2.5 text-slate-800">
                            <span class="inline-flex items-center gap-1 font-medium">
                                ${r.entidade === 'Embalagem' ? '<i class="fa-solid fa-box text-sky-600 text-xs"></i>' : ''}
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
    const parts = (tStr || "08:00:00").split(':').map(Number);
    return (parts[0] || 8) + ((parts[1] || 0) / 60);
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
            ? `Mapeamento do primeiro ao último registro em ${telemetry.daily.length} dias de atividade na planilha`
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
                const leftPct = Math.max(0, Math.min(100, ((startH - 7) / 12) * 100));
                const widthPct = Math.max(4, Math.min(100 - leftPct, ((endH - startH) / 12) * 100));

                return `
                    <tr class="hover:bg-slate-50">
                        <td class="py-2.5 px-3 font-semibold text-slate-900">${escapeHtml(d.date)}</td>
                        <td class="py-2.5 px-2.5 font-sans text-slate-600">${escapeHtml(d.weekday)}</td>
                        <td class="py-2.5 px-2.5 text-emerald-700 font-medium">${escapeHtml(d.start)}</td>
                        <td class="py-2.5 px-2.5 text-slate-700">${escapeHtml(d.end)}</td>
                        <td class="py-2.5 px-2.5 text-slate-500">${escapeHtml(d.span)}</td>
                        <td class="py-2.5 px-3">
                            <div class="w-full h-2.5 rounded-full bg-slate-100 relative overflow-hidden border border-slate-200/70">
                                <div class="h-full bg-brand-600 rounded-full absolute top-0" style="left: ${leftPct.toFixed(1)}%; width: ${widthPct.toFixed(1)}%"></div>
                            </div>
                        </td>
                        <td class="py-2.5 px-2.5 text-right text-slate-600">${escapeHtml(d.sessions)}</td>
                        <td class="py-2.5 px-2.5 text-right text-slate-700 font-medium">${formatNumber(d.tx)}</td>
                        <td class="py-2.5 px-3 text-right font-bold text-slate-900">${formatNumber(d.records)}</td>
                    </tr>
                `;
            }).join('');
        }
    }

    // 2. Rotas de Menus
    const menuBadge = document.getElementById('footprint-menu-badge');
    if (menuBadge) menuBadge.textContent = `${(telemetry.menus || []).length} Telas`;
    const menuSub = document.getElementById('footprint-menu-sub');
    if (menuSub) menuSub.textContent = `${formatNumber(telemetry.totalMenuAccess || 0)} aberturas de módulos registradas pela telemetria de tela`;

    const menuEl = document.getElementById('footprint-menus-list');
    if (menuEl) {
        if (!telemetry.menus || telemetry.menus.length === 0) {
            menuEl.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs font-sans">Nenhum menu de operação rastreado na planilha.</div>`;
        } else {
            const maxMenu = Math.max(...telemetry.menus.map(m => m.count), 1);
            menuEl.innerHTML = telemetry.menus.map(m => {
                const pct = Math.round((m.count / maxMenu) * 100);
                return `
                    <div class="p-2.5 rounded-md border ${m.risk ? 'bg-rose-50/60 border-rose-200' : 'bg-slate-50/70 border-slate-200/80'}">
                        <div class="flex items-center justify-between text-xs font-mono">
                            <span class="${m.risk ? 'font-bold text-rose-800' : 'text-slate-800'} truncate">
                                ${m.risk ? '<i class="fa-solid fa-triangle-exclamation text-rose-600 mr-1.5"></i>' : ''}${escapeHtml(m.route)}
                            </span>
                            <span class="font-semibold ${m.risk ? 'text-rose-700' : 'text-slate-600'} ml-2 shrink-0 tabular-nums">${m.count}x</span>
                        </div>
                        <div class="w-full h-1 bg-slate-200/80 rounded-full mt-1.5 overflow-hidden">
                            <div class="h-full ${m.risk ? 'bg-rose-600' : 'bg-brand-600'}" style="width: ${pct}%"></div>
                        </div>
                    </div>
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
            sessTbody.innerHTML = sessionRows.map(r => {
                const kv = parseKeyValueString(r.valorPosterior);
                return `
                    <tr tabindex="0" role="button" aria-label="Ver transação ${escapeHtml(r.transacao)}" onclick="jumpToTransaction('${escapeHtml(r.transacao)}')" onkeydown="handleRowKeydown(event, '${escapeHtml(r.transacao)}')" class="clickable-row hover:bg-slate-50">
                        <td class="py-2 px-2.5 text-slate-700">${escapeHtml(r.dataHora)}</td>
                        <td class="py-2 px-2 font-semibold text-slate-800">${escapeHtml(r.unNeg)}</td>
                        <td class="py-2 px-2.5 text-brand-700 font-medium">${escapeHtml(kv.IDSessao || 'Host Edit')}</td>
                        <td class="py-2 px-2.5 text-slate-600">${escapeHtml(kv.estacao || kv.id || '—')}</td>
                        <td class="py-2 px-2.5 text-slate-500">${escapeHtml(r.transacao)}</td>
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

    const entities = Array.from(new Set(records.map(r => r.entidade))).sort();
    const units = Array.from(new Set(records.map(r => r.unNeg))).sort();

    if (entSel) {
        entSel.innerHTML = `<option value="">Todas as Entidades (${entities.length})</option>` +
            entities.map(e => `<option value="${escapeHtml(e)}">${escapeHtml(e)}</option>`).join('');
    }

    if (unitSel) {
        unitSel.innerHTML = `<option value="">Todas as Filiais (${units.length})</option>` +
            units.map(u => `<option value="${escapeHtml(u)}">${escapeHtml(u)}</option>`).join('');
    }
}

function applyExplorerFilters() {
    const q = (document.getElementById('exp-search')?.value || '').toLowerCase();
    const ent = document.getElementById('exp-entity')?.value || '';
    const unit = document.getElementById('exp-unit')?.value || '';
    const op = document.getElementById('exp-op')?.value || '';
    const dateStart = document.getElementById('exp-date-start')?.value || '';
    const dateEnd = document.getElementById('exp-date-end')?.value || '';

    filteredRecords = records.filter(r => {
        if (ent && r.entidade !== ent) return false;
        if (unit && r.unNeg !== unit) return false;
        if (op && r.operacao !== op) return false;
        if (activeTxFilter && String(r.transacao) !== String(activeTxFilter)) return false;

        // Filtro de intervalo de datas (espera formato YYYY-MM-DD no input e compara com dataHora)
        if (dateStart || dateEnd) {
            const rawDate = r.dataHora.split(' ')[0] || '';
            // Se vier em formato DD/MM/AAAA, converter para AAAA-MM-DD
            let isoDate = rawDate;
            if (rawDate.includes('/')) {
                const parts = rawDate.split('/');
                if (parts.length === 3) isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
            if (dateStart && isoDate < dateStart) return false;
            if (dateEnd && isoDate > dateEnd) return false;
        }

        if (q) {
            const hay = `${r.dataHora} ${r.unNeg} ${r.entidade} ${r.operacao} ${r.valorPosterior} ${r.valorAnterior} ${r.transacao}`.toLowerCase();
            if (!hay.includes(q)) return false;
        }
        return true;
    });

    currentPage = 1;
    renderExplorerTable();
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
        tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-400 font-sans">Nenhum registro encontrado para os critérios selecionados.</td></tr>`;
        return;
    }

    tbody.innerHTML = pageItems.map((r, idx) => {
        const absIndex = start + idx;
        const isSelected = selectedRecord === r;
        const opBadge = r.operacao === 'Exclusão' ? 'pill-crimson' : r.operacao === 'Edição' ? 'pill-amber' : 'pill-emerald';
        const summary = buildRecordSummary(r);

        return `
            <tr tabindex="0" role="button" aria-label="Inspecionar registro ${escapeHtml(r.entidade)}" onclick="selectExplorerRow(${absIndex})" onkeydown="handleRowSelectKeydown(event, ${absIndex})" class="clickable-row transition ${isSelected ? 'bg-brand-50/80 font-semibold' : 'hover:bg-slate-50'}">
                <td class="py-2 px-3 whitespace-nowrap text-slate-600">${escapeHtml(r.dataHora)}</td>
                <td class="py-2 px-2 font-semibold text-slate-800">${escapeHtml(r.unNeg)}</td>
                <td class="py-2 px-2.5 text-slate-900 truncate max-w-[140px]" title="${escapeHtml(r.entidade)}">${escapeHtml(r.entidade)}</td>
                <td class="py-2 px-2"><span class="pill-badge ${opBadge}">${escapeHtml(r.operacao)}</span></td>
                <td class="py-2 px-2.5 text-slate-600 truncate max-w-[210px]" title="${escapeHtml(summary)}">${escapeHtml(summary)}</td>
                <td class="py-2 px-2.5 text-right text-slate-500">${escapeHtml(r.transacao)}</td>
            </tr>
        `;
    }).join('');
}

function selectExplorerRow(absIndex) {
    const rec = filteredRecords[absIndex];
    if (!rec) return;
    selectedRecord = rec;
    renderExplorerTable();
    renderDiffInspector(rec);
}

function handleRowKeydown(evt, txId) {
    if (evt.key === 'Enter' || evt.key === ' ') {
        evt.preventDefault();
        jumpToTransaction(txId);
    }
}

function handleRowSelectKeydown(evt, absIndex) {
    if (evt.key === 'Enter' || evt.key === ' ') {
        evt.preventDefault();
        selectExplorerRow(absIndex);
    }
}

function filterByCurrentTx() {
    if (!selectedRecord) return;
    jumpToTransaction(selectedRecord.transacao);
}

function jumpToTransaction(txId) {
    switchView('view-explorer');
    activeTxFilter = txId;
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
    if (filteredRecords.length > 0) selectExplorerRow(0);
    notifyToast(`Filtrando cascata completa da Transação #${txId}`, 'info');
}

function filterByDate(dateStr) {
    switchView('view-explorer');
    const startInput = document.getElementById('exp-date-start');
    const endInput = document.getElementById('exp-date-end');
    if (startInput) startInput.value = dateStr;
    if (endInput) endInput.value = dateStr;
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

function setQuickFilter(entity, op, searchQuery) {
    switchView('view-explorer');
    activeTxFilter = "";
    const txPill = document.getElementById('active-tx-pill');
    if (txPill) txPill.classList.add('hidden');
    
    document.getElementById('exp-entity').value = entity || '';
    document.getElementById('exp-op').value = op || '';
    document.getElementById('exp-unit').value = '';
    document.getElementById('exp-search').value = searchQuery || '';
    
    const startInput = document.getElementById('exp-date-start');
    const endInput = document.getElementById('exp-date-end');
    if (startInput) startInput.value = '';
    if (endInput) endInput.value = '';

    applyExplorerFilters();
    if (filteredRecords.length > 0) selectExplorerRow(0);
}

function resetExplorerFilters() {
    setQuickFilter('', '', '');
}

function changeExplorerPage(delta) {
    currentPage += delta;
    renderExplorerTable();
}

function inspectAnomaly(anomalyId) {
    const f = FORENSIC_FINDINGS.find(x => x.id === anomalyId);
    if (!f) return;
    setQuickFilter(f.entity, '', f.searchKey);
    notifyToast(`Inspecionando evidências: ${f.title}`, 'info');
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
 * No desktop, recolhe a sidebar para a esquerda e expande a área principal.
 * No mobile, abre e fecha como drawer overlay.
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
    renderAllViews();
});

