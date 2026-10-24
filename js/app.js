/**
 * AuditTrail GRC — Aplicação Principal, Roteamento e Interatividade
 */

// Estado da Aplicação
let telemetry = JSON.parse(JSON.stringify(INITIAL_TELEMETRY));
let records = [...INITIAL_RECORDS];
let filteredRecords = [...records];
let activeTxFilter = "";
let currentPage = 1;
const PAGE_SIZE = 18;
let selectedRecord = null;

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
    const cascade = (telemetry.totalRecords / Math.max(1, telemetry.totalTransactions)).toFixed(2).replace('.', ',');

    document.getElementById('sidebar-user-name').textContent = telemetry.user;
    document.getElementById('sidebar-user-id').textContent = `ID: ${telemetry.userId}`;
    document.getElementById('nav-badge-total').textContent = (telemetry.totalRecords / 1000).toFixed(1).replace('.', ',') + 'k';
    
    if (telemetry.periodStart && telemetry.periodEnd) {
        document.getElementById('topbar-period').textContent = `${telemetry.periodStart.substring(0, 16)} — ${telemetry.periodEnd.substring(0, 16)}`;
    }

    document.getElementById('banner-user-id').textContent = `ID ${telemetry.userId}`;
    document.getElementById('banner-user-name').textContent = telemetry.user;
    document.getElementById('banner-units-count').textContent = telemetry.totalUnits;
    document.getElementById('banner-erp-ver').textContent = telemetry.erpVersion;
    document.getElementById('banner-hostname').textContent = telemetry.hostname;
    document.getElementById('banner-station').textContent = telemetry.mainStation;
    document.getElementById('banner-os-hash').textContent = telemetry.osHash;
    document.getElementById('banner-cascade').textContent = cascade;
    document.getElementById('banner-sessions').textContent = formatNumber(telemetry.totalSessions);
    document.getElementById('banner-menus').textContent = formatNumber(telemetry.totalMenuAccess);

    document.getElementById('kpi-total-records').textContent = formatNumber(telemetry.totalRecords);
    document.getElementById('kpi-total-tx').textContent = `${formatNumber(telemetry.totalTransactions)} cliques`;
    document.getElementById('kpi-cascade-pill').textContent = `${cascade}x cascata`;
    document.getElementById('kpi-units-total').textContent = `${telemetry.totalUnits} Filiais`;

    const del = telemetry.operations["Exclusão"] || 0;
    const edit = telemetry.operations["Edição"] || 0;
    const add = telemetry.operations["Inclusão"] || 0;
    const tot = Math.max(1, del + edit + add);

    document.getElementById('kpi-del-num').textContent = formatNumber(del);
    document.getElementById('kpi-edit-num').textContent = formatNumber(edit);
    document.getElementById('kpi-add-num').textContent = formatNumber(add);

    document.getElementById('bar-op-del').style.width = `${((del / tot) * 100).toFixed(2)}%`;
    document.getElementById('bar-op-edit').style.width = `${((edit / tot) * 100).toFixed(2)}%`;
    document.getElementById('bar-op-add').style.width = `${((add / tot) * 100).toFixed(2)}%`;
}

// =========================================================================
// VIEW 2: MATRIZ DE RISCOS & ACHADOS FORENSES
// =========================================================================
function renderRiskMatrixView() {
    const grid = document.getElementById('forensic-cards-grid');
    if (grid) {
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

    // Tabela de Preços Manuais
    const priceTable = document.getElementById('table-risk-prices');
    if (priceTable) {
        const priceRows = records.filter(r => r.entidade === 'AlteracaoPreco');
        priceTable.innerHTML = priceRows.map(r => {
            const kv = parseKeyValueString(r.valorPosterior);
            const ant = parseFloat(kv.precoVendaAnterior || 0);
            const post = parseFloat(kv.precoVendaPosterior || 0);
            const pct = ant > 0 ? (((post - ant) / ant) * 100).toFixed(1) : '0.0';
            return `
                <tr tabindex="0" role="button" aria-label="Ver transação ${escapeHtml(r.transacao)}" onclick="jumpToTransaction('${escapeHtml(r.transacao)}')" onkeydown="handleRowKeydown(event, '${escapeHtml(r.transacao)}')" class="clickable-row hover:bg-slate-50">
                    <td class="py-2 px-3 text-slate-600">${escapeHtml(r.dataHora)}</td>
                    <td class="py-2 px-2.5 font-semibold text-slate-800">${escapeHtml(r.unNeg)}</td>
                    <td class="py-2 px-2.5 text-slate-700">${escapeHtml(kv.produto || '—')}</td>
                    <td class="py-2 px-2.5 text-right text-slate-500">R$ ${ant.toFixed(2)}</td>
                    <td class="py-2 px-2.5 text-right font-semibold text-slate-900">R$ ${post.toFixed(2)}</td>
                    <td class="py-2 px-3 text-right"><span class="pill-badge pill-crimson">${pct}%</span></td>
                </tr>
            `;
        }).join('');
    }

    // Tabela de Ajuste de Estoque e NFe
    const stockTable = document.getElementById('table-risk-stock');
    if (stockTable) {
        const stockRows = records.filter(r => ['ItemNotaFiscal', 'CustoProduto', 'Estoque'].includes(r.entidade));
        stockTable.innerHTML = stockRows.map(r => {
            const ant = parseKeyValueString(r.valorAnterior);
            const post = parseKeyValueString(r.valorPosterior);
            let attr = 'quantidade';
            let pair = `${ant.quantidade || '—'} → ${post.quantidade || '—'}`;
            if (r.entidade === 'CustoProduto') {
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
                    <td class="py-2 px-2.5 text-slate-800">${escapeHtml(r.entidade)}</td>
                    <td class="py-2 px-2.5 text-slate-500">${escapeHtml(attr)}</td>
                    <td class="py-2 px-2.5 text-right font-semibold text-amber-800">${escapeHtml(pair)}</td>
                </tr>
            `;
        }).join('');
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
    const tbody = document.getElementById('footprint-daily-tbody');
    if (tbody) {
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

    // 2. Rotas de Menus
    const menuEl = document.getElementById('footprint-menus-list');
    if (menuEl) {
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

    // 3. Sessões Autenticadas
    const sessTbody = document.getElementById('footprint-sessions-tbody');
    if (sessTbody) {
        const sessionRows = records.filter(r => r.entidade === 'SessaoUsuario' || r.entidade === 'Estacao');
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

