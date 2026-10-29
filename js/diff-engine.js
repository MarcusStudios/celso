/**
 * AuditTrail GRC — Motor de Decomposição, Resumo Visual e Diff Forense (Antes vs. Depois)
 */

let diffFilterMode = 'all'; // 'all' | 'changes' | 'raw'

/**
 * Retorna metadados visuais (ícone e cor semântica) para cada entidade do ERP.
 * @param {string} entidade 
 * @returns {{ icon: string, colorClass: string, bgClass: string }}
 */
function getEntityVisualMeta(entidade) {
    const e = String(entidade || '');
    if (e === 'Embalagem' || e === 'ConversaoProdutoFornecedor') {
        return { icon: 'fa-solid fa-boxes-stacked', colorClass: 'text-sky-600', bgClass: 'bg-sky-50 border-sky-200 text-sky-900' };
    }
    if (e === 'AlteracaoPreco' || e === 'PrecoEmbalagemUnidadeNegocio') {
        return { icon: 'fa-solid fa-tags', colorClass: 'text-emerald-600', bgClass: 'bg-emerald-50 border-emerald-200 text-emerald-900' };
    }
    if (e === 'ItemNotaFiscal' || e === 'NotaFiscal') {
        return { icon: 'fa-solid fa-file-invoice-dollar', colorClass: 'text-indigo-600', bgClass: 'bg-indigo-50 border-indigo-200 text-indigo-900' };
    }
    if (e === 'Fornecedor') {
        return { icon: 'fa-solid fa-building-shield', colorClass: 'text-rose-600', bgClass: 'bg-rose-50 border-rose-200 text-rose-900' };
    }
    if (e === 'EstornoItemRecebimentoFisico') {
        return { icon: 'fa-solid fa-truck-ramp-box', colorClass: 'text-amber-600', bgClass: 'bg-amber-50 border-amber-200 text-amber-900' };
    }
    if (e === 'LiberacaoUsuario') {
        return { icon: 'fa-solid fa-key', colorClass: 'text-violet-600', bgClass: 'bg-violet-50 border-violet-200 text-violet-900' };
    }
    if (e === 'AcessoRecursoSistema') {
        return { icon: 'fa-solid fa-window-maximize', colorClass: 'text-slate-600', bgClass: 'bg-slate-100 border-slate-200 text-slate-800' };
    }
    if (e === 'SessaoUsuario' || e === 'Estacao') {
        return { icon: 'fa-solid fa-desktop', colorClass: 'text-blue-600', bgClass: 'bg-blue-50 border-blue-200 text-blue-900' };
    }
    if (e === 'Estoque' || e === 'CustoProduto') {
        return { icon: 'fa-solid fa-warehouse', colorClass: 'text-amber-700', bgClass: 'bg-amber-50 border-amber-200 text-amber-900' };
    }
    if (e === 'Arquivo') {
        return { icon: 'fa-solid fa-file-code', colorClass: 'text-teal-600', bgClass: 'bg-teal-50 border-teal-200 text-teal-900' };
    }
    if (e === 'Produto') {
        return { icon: 'fa-solid fa-cube', colorClass: 'text-slate-600', bgClass: 'bg-slate-100 border-slate-200 text-slate-800' };
    }
    return { icon: 'fa-solid fa-database', colorClass: 'text-slate-400', bgClass: 'bg-slate-50 border-slate-200 text-slate-700' };
}

/**
 * Formata o carimbo de data/hora para exibição rica em tabelas de logs,
 * destacando visualmente horários noturnos (22h-06h) ou fins de semana.
 * @param {string} dataHora 
 * @returns {string} HTML seguro
 */
function formatLogTimestampHtml(dataHora) {
    if (!dataHora) return '<span class="text-slate-400">—</span>';
    const raw = String(dataHora).trim();
    let dateStr = raw;
    let timeStr = '';

    if (raw.includes('T')) {
        const parts = raw.split('T');
        dateStr = parts[0] || '';
        timeStr = (parts[1] || '').substring(0, 8);
    } else if (raw.includes(' ')) {
        const parts = raw.split(' ');
        dateStr = parts[0] || '';
        timeStr = parts[1] || '';
    }

    const h = parseInt((timeStr || '').substring(0, 2), 10);
    const isNight = !isNaN(h) && (h >= 22 || h < 6);
    let isWeekend = false;
    if (typeof parseDateComponents === 'function') {
        const dObj = parseDateComponents(dateStr);
        if (dObj && (dObj.getDay() === 0 || dObj.getDay() === 6)) {
            isWeekend = true;
        }
    }

    const alertBadge = isNight
        ? `<i class="fa-solid fa-moon text-amber-500 text-[9px] ml-1" title="Horário Noturno (Extra-Expediente)"></i>`
        : isWeekend
            ? `<i class="fa-regular fa-calendar-xmark text-amber-600 text-[9px] ml-1" title="Fim de Semana"></i>`
            : '';

    return `
        <div class="leading-tight">
            <div class="font-semibold text-slate-800 text-[11px]">${escapeHtml(dateStr)}${alertBadge}</div>
            ${timeStr ? `<div class="text-[10px] ${isNight || isWeekend ? 'text-amber-700 font-semibold' : 'text-slate-400'}">${escapeHtml(timeStr)}</div>` : ''}
        </div>
    `;
}

/**
 * Constrói um resumo contextual legível em texto puro (usado para busca, CSV, XLSX e PDF).
 * Reutiliza os mapas kvAnt e kvPost pré-processados para máxima performance.
 * @param {object} rec 
 * @returns {string}
 */
function buildRecordSummary(rec) {
    const post = rec.kvPost || parseKeyValueString(rec.valorPosterior);
    const ant = rec.kvAnt || parseKeyValueString(rec.valorAnterior);

    if (rec.entidade === 'AcessoRecursoSistema' && post.menu) {
        return `Tela: ${post.menu}`;
    }
    if (rec.entidade === 'Fornecedor' && post.ignorarConferenciaAutomaticaNotaFiscal) {
        return `ignorarConferenciaNFe: ${ant.ignorarConferenciaAutomaticaNotaFiscal || 'false'} → ${post.ignorarConferenciaAutomaticaNotaFiscal}`;
    }
    if (rec.entidade === 'EstornoItemRecebimentoFisico') {
        return `Motivo: "${post.motivo || '—'}" (Qtd: ${post.quantidadeEstornada || '—'})`;
    }
    if (rec.entidade === 'LiberacaoUsuario') {
        return `Regra: ${post.regra || 'Liberação de Alçada'}`;
    }
    if (rec.entidade === 'Embalagem') {
        const parts = [];
        const desc = post.descricao || ant.descricao;
        if (desc) parts.push(`"${desc}"`);
        if (ant.precoVenda && post.precoVenda && ant.precoVenda !== post.precoVenda) {
            parts.push(`Preço: ${formatCurrency(parseBRNumber(ant.precoVenda))} → ${formatCurrency(parseBRNumber(post.precoVenda))}`);
        } else if (post.precoVenda) {
            parts.push(`Preço: ${formatCurrency(parseBRNumber(post.precoVenda))}`);
        }
        if (ant.apresentacao && post.apresentacao && ant.apresentacao !== post.apresentacao) {
            parts.push(`Apres: ${ant.apresentacao} → ${post.apresentacao}`);
        } else if (post.apresentacao) {
            parts.push(`Apres: ${post.apresentacao}`);
        }
        if (post.quantidadePorEmbalagem || post.quantidadeEmbalagem) {
            parts.push(`Fator: ${post.quantidadePorEmbalagem || post.quantidadeEmbalagem}x`);
        }
        if (post.codigoBarras) {
            parts.push(`EAN: ${post.codigoBarras}`);
        }
        if (parts.length > 0) return parts.slice(0, 3).join(' | ');
    }
    if (rec.entidade === 'PrecoEmbalagemUnidadeNegocio') {
        const pAnt = ant.precoVenda || ant.precoReferencial;
        const pPost = post.precoVenda || post.precoReferencial;
        const emb = post.embalagem || ant.embalagem || '';
        const vAntFormatted = pAnt ? formatCurrency(parseBRNumber(pAnt)) : '—';
        const vPostFormatted = pPost ? formatCurrency(parseBRNumber(pPost)) : '—';
        return `Preço Emb ${emb ? emb + ': ' : ''}${vAntFormatted} → ${vPostFormatted}${post.markup ? ` (Mk: ${parseFloat(post.markup).toFixed(1)}%)` : ''}`;
    }
    if (rec.entidade === 'ConversaoProdutoFornecedor') {
        return `Conversão NFe: Emb ${post.embalagem || ant.embalagem || '—'} (Fator: ${post.quantidadeConversao || ant.quantidadeConversao || '1'}x, Cód: ${post.codigo || ant.codigo || '—'})`;
    }
    if (rec.entidade === 'ItemNotaFiscal') {
        const diffs = [];
        if (ant.embalagem && post.embalagem && ant.embalagem !== post.embalagem) {
            diffs.push(`Emb: ${ant.embalagem} → ${post.embalagem}`);
        } else if (post.embalagem || ant.embalagem) {
            diffs.push(`Emb: ${post.embalagem || ant.embalagem}`);
        }
        if (ant.quantidade && post.quantidade && ant.quantidade !== post.quantidade) {
            diffs.push(`Qtd: ${ant.quantidade} → ${post.quantidade}`);
        }
        if (ant.valorUnitario && post.valorUnitario && ant.valorUnitario !== post.valorUnitario) {
            diffs.push(`Unit: ${formatCurrency(parseBRNumber(ant.valorUnitario))} → ${formatCurrency(parseBRNumber(post.valorUnitario))}`);
        }
        if (diffs.length > 0) return diffs.slice(0, 3).join(' | ');
    }
    if (rec.entidade === 'AlteracaoPreco') {
        const emb = post.embalagem || ant.embalagem;
        const embStr = emb ? `Emb ${emb} | ` : '';
        const vAnt = post.precoVendaAnterior || ant.precoVendaAnterior;
        const vPost = post.precoVendaPosterior || post.precoVenda;
        const vAntFormatted = vAnt ? formatCurrency(parseBRNumber(vAnt)) : '?';
        const vPostFormatted = vPost ? formatCurrency(parseBRNumber(vPost)) : '?';
        return `${embStr}Preço Venda: ${vAntFormatted} → ${vPostFormatted}`;
    }
    if (rec.entidade === 'Produto') {
        if (ant.descricao && post.descricao && ant.descricao !== post.descricao) {
            return `Desc: "${ant.descricao}" → "${post.descricao}"`;
        }
        if (post.descricao) return `Produto: "${post.descricao}"`;
        if (ant.status && post.status && ant.status !== post.status) {
            return `Status: ${ant.status} → ${post.status}`;
        }
    }
    if (rec.entidade === 'Arquivo') {
        return `XML: ${post.nome || 'arquivo.xml'}`;
    }

    // Detecção genérica de atributos alterados
    const keys = Array.from(new Set([...Object.keys(ant), ...Object.keys(post)]));
    const diffs = [];
    for (const k of keys) {
        if (k === 'versao' || k === 'ultimoAcesso') continue;
        if (ant[k] !== undefined && post[k] !== undefined && ant[k] !== post[k]) {
            diffs.push(`${k}: ${ant[k]} → ${post[k]}`);
        }
    }
    if (diffs.length > 0) return diffs.slice(0, 2).join(' | ');

    const sampleKey = Object.keys(post)[0] || Object.keys(ant)[0];
    return sampleKey ? `${sampleKey}=${post[sampleKey] || ant[sampleKey]}` : (rec.operacao || 'Mutação');
}

/**
 * Constrói um resumo visual rico em HTML com pílulas Antes -> Depois e contadores de mutação
 * para exibição nas linhas de resultado de logs.
 * @param {object} rec 
 * @returns {string} HTML seguro
 */
function buildRecordSummaryHtml(rec) {
    const post = rec.kvPost || parseKeyValueString(rec.valorPosterior);
    const ant = rec.kvAnt || parseKeyValueString(rec.valorAnterior);

    // Contar quantos campos realmente mudaram
    const allKeys = Array.from(new Set([...Object.keys(ant), ...Object.keys(post)]));
    let changedFields = 0;
    for (const k of allKeys) {
        if (k === 'versao' || k === 'ultimoAcesso') continue;
        if (ant[k] !== undefined && post[k] !== undefined && ant[k] !== post[k]) {
            changedFields++;
        }
    }
    const modChip = changedFields > 1
        ? `<span class="ml-1.5 px-1 py-0.2 text-[9px] rounded bg-amber-100/80 text-amber-800 border border-amber-300/80 font-mono font-semibold shrink-0" title="${changedFields} atributos modificados neste registro">${changedFields} alt</span>`
        : '';

    if (rec.entidade === 'AcessoRecursoSistema' && post.menu) {
        const isRisk = /log\s*de\s*opera|auditoria|trilha|seguran[çc]a|permiss/i.test(post.menu);
        return `
            <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-[10px] uppercase text-slate-400 font-semibold">Menu:</span>
                <span class="px-1.5 py-0.5 rounded text-[11px] font-medium ${isRisk ? 'bg-rose-100 text-rose-800 border border-rose-300 font-bold' : 'bg-slate-100 text-slate-800 border border-slate-200'}">
                    ${isRisk ? '<i class="fa-solid fa-triangle-exclamation text-rose-600 mr-1 text-[10px]"></i>' : ''}${escapeHtml(post.menu)}
                </span>
            </div>
        `;
    }

    if (rec.entidade === 'Fornecedor' && post.ignorarConferenciaAutomaticaNotaFiscal) {
        const vOld = ant.ignorarConferenciaAutomaticaNotaFiscal || 'false';
        const vNew = post.ignorarConferenciaAutomaticaNotaFiscal;
        return `
            <div class="flex items-center gap-1 flex-wrap">
                <span class="text-[10px] font-bold text-rose-700">ignorarConferenciaNFe:</span>
                <span class="diff-val-old text-[10px]">${escapeHtml(vOld)}</span>
                <span class="diff-chip-arrow">&rarr;</span>
                <span class="px-1.5 py-0.2 rounded bg-rose-600 text-white font-bold text-[10px]">${escapeHtml(vNew)}</span>
                ${modChip}
            </div>
        `;
    }

    if (rec.entidade === 'EstornoItemRecebimentoFisico') {
        return `
            <div class="flex items-center gap-1.5 flex-wrap">
                <span class="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">Qtd: ${escapeHtml(post.quantidadeEstornada || '—')}</span>
                <span class="text-slate-700 truncate max-w-[220px]" title="${escapeHtml(post.motivo || '')}">"${escapeHtml(post.motivo || 'Sem motivo')}"</span>
            </div>
        `;
    }

    if (rec.entidade === 'LiberacaoUsuario') {
        return `
            <div class="flex items-center gap-1.5 flex-wrap">
                <span class="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10px] font-semibold">
                    <i class="fa-solid fa-unlock-keyhole mr-1 text-[9px]"></i>${escapeHtml(post.regra || 'Liberação de Alçada')}
                </span>
                ${post.observacao ? `<span class="text-slate-500 text-[10px] truncate max-w-[160px]">${escapeHtml(post.observacao)}</span>` : ''}
            </div>
        `;
    }

    if (rec.entidade === 'AlteracaoPreco' || rec.entidade === 'PrecoEmbalagemUnidadeNegocio') {
        const emb = post.embalagem || ant.embalagem || '';
        const rawAnt = post.precoVendaAnterior || ant.precoVendaAnterior || ant.precoVenda || ant.precoReferencial;
        const rawPost = post.precoVendaPosterior || post.precoVenda || post.precoReferencial;
        const nAnt = parseBRNumber(rawAnt);
        const nPost = parseBRNumber(rawPost);
        const vAntStr = rawAnt ? formatCurrency(nAnt) : '—';
        const vPostStr = rawPost ? formatCurrency(nPost) : '—';

        let deltaChip = '';
        if (nAnt > 0 && nPost > 0 && nAnt !== nPost) {
            const pct = (((nPost - nAnt) / nAnt) * 100).toFixed(1);
            const sign = nPost > nAnt ? '+' : '';
            const cls = nPost > nAnt ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
            deltaChip = `<span class="px-1 py-0.2 rounded border text-[9px] font-bold ${cls}">${sign}${pct}%</span>`;
        }

        return `
            <div class="flex items-center gap-1 flex-wrap">
                ${emb ? `<span class="px-1 py-0.2 rounded bg-sky-50 text-sky-800 border border-sky-200 text-[10px] font-semibold">Emb ${escapeHtml(emb)}</span>` : ''}
                <span class="diff-val-old text-[10px]">${escapeHtml(vAntStr)}</span>
                <span class="diff-chip-arrow">&rarr;</span>
                <span class="diff-val-new text-[10px]">${escapeHtml(vPostStr)}</span>
                ${deltaChip}
                ${modChip}
            </div>
        `;
    }

    if (rec.entidade === 'ItemNotaFiscal') {
        const chips = [];
        if (ant.embalagem && post.embalagem && ant.embalagem !== post.embalagem) {
            chips.push(`<span class="text-[10px] text-sky-900 font-semibold">Emb: <span class="diff-val-old">${escapeHtml(ant.embalagem)}</span> &rarr; <span class="diff-val-new">${escapeHtml(post.embalagem)}</span></span>`);
        } else if (post.embalagem || ant.embalagem) {
            chips.push(`<span class="px-1 py-0.2 rounded bg-sky-50 text-sky-800 border border-sky-200 text-[10px]">Emb ${escapeHtml(post.embalagem || ant.embalagem)}</span>`);
        }
        if (ant.quantidade && post.quantidade && ant.quantidade !== post.quantidade) {
            chips.push(`<span class="text-[10px]">Qtd: <span class="diff-val-old">${escapeHtml(ant.quantidade)}</span> &rarr; <span class="diff-val-new">${escapeHtml(post.quantidade)}</span></span>`);
        }
        if (ant.valorUnitario && post.valorUnitario && ant.valorUnitario !== post.valorUnitario) {
            chips.push(`<span class="text-[10px]">Unit: <span class="diff-val-old">${escapeHtml(formatCurrency(parseBRNumber(ant.valorUnitario)))}</span> &rarr; <span class="diff-val-new">${escapeHtml(formatCurrency(parseBRNumber(post.valorUnitario)))}</span></span>`);
        }
        if (chips.length > 0) {
            return `<div class="flex items-center gap-1.5 flex-wrap">${chips.slice(0, 2).join('')}${modChip}</div>`;
        }
    }

    if (rec.entidade === 'Embalagem') {
        const desc = post.descricao || ant.descricao;
        const factor = post.quantidadePorEmbalagem || post.quantidadeEmbalagem;
        const priceChanged = ant.precoVenda && post.precoVenda && ant.precoVenda !== post.precoVenda;
        return `
            <div class="flex items-center gap-1.5 flex-wrap">
                ${desc ? `<span class="text-slate-800 font-semibold truncate max-w-[150px]" title="${escapeHtml(desc)}">"${escapeHtml(desc)}"</span>` : ''}
                ${factor ? `<span class="px-1 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">Fator ${escapeHtml(factor)}x</span>` : ''}
                ${priceChanged ? `<span class="diff-val-old text-[10px]">${escapeHtml(formatCurrency(parseBRNumber(ant.precoVenda)))}</span><span class="diff-chip-arrow">&rarr;</span><span class="diff-val-new text-[10px]">${escapeHtml(formatCurrency(parseBRNumber(post.precoVenda)))}</span>` : ''}
                ${modChip}
            </div>
        `;
    }

    // Caso genérico com destaque para o primeiro campo modificado
    for (const k of allKeys) {
        if (k === 'versao' || k === 'ultimoAcesso') continue;
        if (ant[k] !== undefined && post[k] !== undefined && ant[k] !== post[k]) {
            const vA = String(ant[k]).length > 24 ? String(ant[k]).substring(0, 22) + '…' : String(ant[k]);
            const vP = String(post[k]).length > 24 ? String(post[k]).substring(0, 22) + '…' : String(post[k]);
            return `
                <div class="flex items-center gap-1 flex-wrap">
                    <span class="text-slate-600 font-semibold text-[11px]">${escapeHtml(k)}:</span>
                    <span class="diff-val-old text-[10px]">${escapeHtml(vA)}</span>
                    <span class="diff-chip-arrow">&rarr;</span>
                    <span class="diff-val-new text-[10px]">${escapeHtml(vP)}</span>
                    ${modChip}
                </div>
            `;
        }
    }

    const fallbackText = rec.summary || buildRecordSummary(rec);
    return `<span class="text-slate-600 truncate block max-w-[290px]" title="${escapeHtml(fallbackText)}">${escapeHtml(fallbackText)}</span>`;
}

/**
 * Retorna representação HTML estilizada para rótulos de atributos no diff.
 * @param {string} key 
 * @returns {string}
 */
function formatAttributeLabel(key) {
    const k = String(key || '');
    if (k === 'embalagem') {
        return `<span class="inline-flex items-center gap-1.5 font-bold text-sky-950"><i class="fa-solid fa-box text-sky-600 text-xs"></i><span>embalagem</span><span class="px-1 py-0.2 text-[8px] rounded bg-sky-100 text-sky-800 border border-sky-300 font-mono font-medium">EMBALAGEM</span></span>`;
    }
    if (k === 'embalagemContida') {
        return `<span class="inline-flex items-center gap-1.5 font-bold text-indigo-950"><i class="fa-solid fa-boxes-stacked text-indigo-600 text-xs"></i><span>embalagemContida</span><span class="px-1 py-0.2 text-[8px] rounded bg-indigo-100 text-indigo-800 border border-indigo-300 font-mono font-medium">EMB PAI</span></span>`;
    }
    if (k === 'quantidadePorEmbalagem' || k === 'quantidadeEmbalagem' || k === 'quantidadeConversao') {
        return `<span class="inline-flex items-center gap-1.5 font-bold text-amber-950"><i class="fa-solid fa-cubes-stacked text-amber-600 text-xs"></i><span>${escapeHtml(k)}</span><span class="px-1 py-0.2 text-[8px] rounded bg-amber-100 text-amber-800 border border-amber-300 font-mono font-medium">FATOR</span></span>`;
    }
    if (k === 'codigoBarras') {
        return `<span class="inline-flex items-center gap-1.5 font-bold text-slate-800"><i class="fa-solid fa-barcode text-slate-600 text-xs"></i><span>codigoBarras</span><span class="px-1 py-0.2 text-[8px] rounded bg-slate-100 text-slate-700 border border-slate-300 font-mono font-medium">EAN</span></span>`;
    }
    if (k === 'precoVenda' || k === 'precoVendaPosterior' || k === 'precoVendaAnterior' || k === 'valorUnitario') {
        return `<span class="inline-flex items-center gap-1.5 font-bold text-emerald-950"><i class="fa-solid fa-tag text-emerald-600 text-xs"></i><span>${escapeHtml(k)}</span></span>`;
    }
    if (k === 'precoReferencial' || k === 'precoReferencialPosterior' || k === 'precoReferencialAnterior' || k === 'custoMedio') {
        return `<span class="inline-flex items-center gap-1.5 font-bold text-slate-800"><i class="fa-solid fa-calculator text-indigo-600 text-xs"></i><span>${escapeHtml(k)}</span></span>`;
    }
    if (k === 'ignorarConferenciaAutomaticaNotaFiscal') {
        return `<span class="inline-flex items-center gap-1.5 font-bold text-rose-900"><i class="fa-solid fa-shield-halved text-rose-600 text-xs"></i><span>${escapeHtml(k)}</span><span class="px-1 py-0.2 text-[8px] rounded bg-rose-100 text-rose-800 border border-rose-300 font-mono font-bold">CRÍTICO</span></span>`;
    }
    if (k === 'produto') {
        return `<span class="inline-flex items-center gap-1.5 font-bold text-slate-900"><i class="fa-solid fa-cube text-slate-500 text-xs"></i><span>produto</span></span>`;
    }
    return `<span class="font-medium text-slate-700">${escapeHtml(k)}</span>`;
}

/**
 * Alterna o modo de visualização do Inspetor de Diff ('all' | 'changes' | 'raw').
 * @param {'all'|'changes'|'raw'} mode 
 */
function setDiffFilterMode(mode) {
    diffFilterMode = mode;

    const tabs = {
        all: document.getElementById('diff-tab-all'),
        changes: document.getElementById('diff-tab-changes'),
        raw: document.getElementById('diff-tab-raw')
    };

    Object.entries(tabs).forEach(([k, btn]) => {
        if (!btn) return;
        if (k === mode) {
            btn.className = 'px-2 py-0.5 rounded text-[10px] font-semibold bg-white text-slate-900 shadow-2xs transition cursor-pointer';
        } else {
            btn.className = 'px-2 py-0.5 rounded text-[10px] font-medium text-slate-600 hover:text-slate-900 transition cursor-pointer';
        }
    });

    const tableContainer = document.getElementById('diff-table-container');
    const rawContainer = document.getElementById('diff-raw-container');
    const searchBar = document.getElementById('diff-attr-search-bar');

    if (mode === 'raw') {
        if (tableContainer) tableContainer.classList.add('hidden');
        if (searchBar) searchBar.classList.add('hidden');
        if (rawContainer) rawContainer.classList.remove('hidden');
    } else {
        if (tableContainer) tableContainer.classList.remove('hidden');
        if (searchBar) searchBar.classList.remove('hidden');
        if (rawContainer) rawContainer.classList.add('hidden');
    }

    renderDiffInspector(selectedRecord);
}

/**
 * Copia os dados forenses do registro selecionado para a área de transferência.
 */
function copySelectedRecordEvidence() {
    if (!selectedRecord) {
        notifyToast("Selecione um registro de log primeiro.", "error");
        return;
    }

    const r = selectedRecord;
    const ant = r.kvAnt || parseKeyValueString(r.valorAnterior);
    const post = r.kvPost || parseKeyValueString(r.valorPosterior);
    const allKeys = Array.from(new Set([...Object.keys(ant), ...Object.keys(post)]));

    const diffLines = [];
    allKeys.forEach(k => {
        const vA = ant[k];
        const vP = post[k];
        if (vA !== undefined && vP !== undefined && vA !== vP) {
            diffLines.push(`  [MOD] ${k}: ${vA} -> ${vP}`);
        } else if (vA === undefined && vP !== undefined) {
            diffLines.push(`  [ADD] ${k}: ${vP}`);
        } else if (vA !== undefined && vP === undefined) {
            diffLines.push(`  [DEL] ${k}: ${vA}`);
        }
    });

    const text = [
        `=== EVIDÊNCIA FORENSE DE AUDITORIA ===`,
        `Data/Hora: ${r.dataHora}`,
        `Unidade:   ${r.unNeg} | Usuário: ${r.usuario}`,
        `Entidade:  ${r.entidade} | Operação: ${r.operacao}`,
        `Transação: #${r.transacao} | Revisão: ${r.revisao} | Versão: ${r.versao}`,
        `Resumo:    ${r.summary || buildRecordSummary(r)}`,
        diffLines.length > 0 ? `\nAtributos Alterados:\n${diffLines.join('\n')}` : `\nValor Posterior: ${r.valorPosterior}`
    ].join('\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            notifyToast("Evidência forense copiada para a área de transferência!", "success");
        }).catch(() => {
            notifyToast("Não foi possível copiar automaticamente.", "error");
        });
    }
}

/**
 * Renderiza o painel direito de inspeção detalhada de atributos lado a lado,
 * ordenando campos alterados no topo e calculando variações automaticamente.
 * @param {object} rec 
 */
function renderDiffInspector(rec) {
    if (!rec) {
        const tbody = document.getElementById('diff-tbody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="3" class="p-8 text-center text-slate-400 font-sans">Nenhum registro selecionado. Carregue uma planilha e selecione uma linha.</td></tr>`;
        const diffTitle = document.getElementById('diff-title');
        if (diffTitle) diffTitle.textContent = 'Selecione um registro';
        const diffSub = document.getElementById('diff-subtitle-summary');
        if (diffSub) diffSub.textContent = 'Clique em qualquer linha da tabela para decompor os atributos';
        const diffTx = document.getElementById('diff-tx-btn-label');
        if (diffTx) diffTx.textContent = '—';
        const diffOp = document.getElementById('diff-op-badge');
        if (diffOp) { diffOp.className = 'pill-badge pill-slate'; diffOp.textContent = '—'; }
        return;
    }

    const opBadge = rec.operacao === 'Exclusão' ? 'pill-crimson' : rec.operacao === 'Edição' ? 'pill-amber' : rec.operacao === 'Inclusão' ? 'pill-emerald' : 'pill-slate';
    const badgeEl = document.getElementById('diff-op-badge');
    if (badgeEl) {
        badgeEl.className = `pill-badge ${opBadge}`;
        badgeEl.textContent = rec.operacao || 'Mutação';
    }

    const entityMeta = getEntityVisualMeta(rec.entidade);
    const titleEl = document.getElementById('diff-title');
    if (titleEl) {
        titleEl.innerHTML = `<i class="${entityMeta.icon} text-sky-400 mr-1.5 text-xs"></i>${escapeHtml(rec.entidade || 'Registro')}`;
    }

    const subEl = document.getElementById('diff-subtitle-summary');
    if (subEl) {
        subEl.textContent = rec.summary || buildRecordSummary(rec);
    }

    // Mostrar quantidade de registros na mesma transação no botão de cascata
    const sameTxCount = (typeof records !== 'undefined' && rec.transacao)
        ? records.filter(x => String(x.transacao) === String(rec.transacao)).length
        : 0;
    const txLabelEl = document.getElementById('diff-tx-btn-label');
    if (txLabelEl) {
        txLabelEl.textContent = rec.transacao
            ? `${rec.transacao}${sameTxCount > 1 ? ` (${sameTxCount})` : ''}`
            : '—';
    }

    document.getElementById('diff-meta-dt').textContent = rec.dataHora || '—';
    document.getElementById('diff-meta-un').textContent = rec.unNeg || '—';
    document.getElementById('diff-meta-rev').textContent = rec.revisao || '—';
    document.getElementById('diff-meta-ver').textContent = rec.versao || '0';

    // Preencher aba Raw
    const rawAntEl = document.getElementById('diff-raw-ant');
    const rawPostEl = document.getElementById('diff-raw-post');
    if (rawAntEl) rawAntEl.textContent = (rec.valorAnterior || '(vazio)').replace(/;/g, ';\n');
    if (rawPostEl) rawPostEl.textContent = (rec.valorPosterior || '(vazio)').replace(/;/g, ';\n');

    const ant = rec.kvAnt || parseKeyValueString(rec.valorAnterior);
    const post = rec.kvPost || parseKeyValueString(rec.valorPosterior);
    const allKeys = Array.from(new Set([...Object.keys(ant), ...Object.keys(post)]));

    let modCount = 0, addCount = 0, delCount = 0;

    // Classificar cada atributo para ordenar: 1. MOD, 2. ADD, 3. DEL, 4. SAME
    const items = allKeys.map(k => {
        const vA = ant[k];
        const vP = post[k];
        let status = 'same';
        let priority = 4;

        if (vA !== undefined && vP !== undefined && vA !== vP) {
            status = 'mod';
            priority = 1;
            modCount++;
        } else if (vA === undefined && vP !== undefined) {
            status = 'add';
            priority = 2;
            addCount++;
        } else if (vA !== undefined && vP === undefined) {
            status = 'del';
            priority = 3;
            delCount++;
        }

        return { key: k, vA, vP, status, priority };
    });

    items.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.key.localeCompare(b.key);
    });

    const totalEl = document.getElementById('diff-count-total');
    if (totalEl) totalEl.textContent = items.length;
    document.getElementById('diff-count-mod').textContent = modCount;
    document.getElementById('diff-count-add').textContent = addCount;
    document.getElementById('diff-count-del').textContent = delCount;

    // Aplicar filtro de modo ('changes') e busca interna de atributo
    const attrQuery = (document.getElementById('diff-attr-filter')?.value || '').toLowerCase().trim();
    const visibleItems = items.filter(item => {
        if (diffFilterMode === 'changes' && item.status === 'same') return false;
        if (attrQuery) {
            const hay = `${item.key} ${item.vA || ''} ${item.vP || ''}`.toLowerCase();
            if (!hay.includes(attrQuery)) return false;
        }
        return true;
    });

    const rowsHtml = visibleItems.map(item => {
        const { key: k, vA, vP, status } = item;
        const labelHtml = formatAttributeLabel(k);
        const safeVA = escapeHtml(vA);
        const safeVP = escapeHtml(vP);

        if (status === 'mod') {
            // Calcular delta numérico se ambos forem números válidos (ex: preços, fatores, quantidades)
            let deltaHtml = '';
            const isNumericLooking = /preco|valor|custo|quantidade|estoque|markup|margem|aliquota|fator/i.test(k);
            if (isNumericLooking) {
                const nA = parseBRNumber(vA);
                const nP = parseBRNumber(vP);
                if (!isNaN(nA) && !isNaN(nP) && nA > 0 && nA !== nP) {
                    const pct = (((nP - nA) / nA) * 100).toFixed(1);
                    const sign = nP > nA ? '+' : '';
                    const badgeCls = nP > nA ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300';
                    deltaHtml = `<span class="ml-1 px-1 py-0.2 text-[9px] rounded border font-bold ${badgeCls}">${sign}${pct}%</span>`;
                }
            }

            return `
                <tr class="bg-amber-50/80 border-l-2 border-l-amber-500">
                    <td class="py-2 px-3">
                        <div class="flex items-center justify-between gap-1">
                            ${labelHtml}
                            <span class="px-1 py-0.2 text-[8px] rounded bg-amber-200/80 text-amber-950 border border-amber-400 font-bold shrink-0">ALT</span>
                        </div>
                    </td>
                    <td class="py-2 px-2.5"><span class="diff-val-old">${safeVA}</span></td>
                    <td class="py-2 px-2.5"><span class="diff-val-new">${safeVP}</span>${deltaHtml}</td>
                </tr>
            `;
        } else if (status === 'add') {
            return `
                <tr class="bg-emerald-50/40">
                    <td class="py-2 px-3">
                        <div class="flex items-center justify-between gap-1">
                            ${labelHtml}
                            <span class="px-1 py-0.2 text-[8px] rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold shrink-0">NOVO</span>
                        </div>
                    </td>
                    <td class="py-2 px-2.5 text-slate-300">—</td>
                    <td class="py-2 px-2.5 text-emerald-900 font-semibold break-all">${safeVP}</td>
                </tr>
            `;
        } else if (status === 'del') {
            return `
                <tr class="bg-rose-50/50">
                    <td class="py-2 px-3">
                        <div class="flex items-center justify-between gap-1">
                            ${labelHtml}
                            <span class="px-1 py-0.2 text-[8px] rounded bg-rose-100 text-rose-800 border border-rose-300 font-semibold shrink-0">REM</span>
                        </div>
                    </td>
                    <td class="py-2 px-2.5"><span class="diff-val-old">${safeVA}</span></td>
                    <td class="py-2 px-2.5 text-slate-300">—</td>
                </tr>
            `;
        } else {
            return `
                <tr class="hover:bg-slate-50/80">
                    <td class="py-1.5 px-3 text-slate-500">${labelHtml}</td>
                    <td class="py-1.5 px-2.5 text-slate-400 break-all">${safeVA}</td>
                    <td class="py-1.5 px-2.5 text-slate-600 break-all">${safeVP}</td>
                </tr>
            `;
        }
    }).join('');

    document.getElementById('diff-tbody').innerHTML = rowsHtml || `<tr><td colspan="3" class="py-6 text-center text-slate-400 font-sans">Nenhum atributo correspondente ao filtro selecionado.</td></tr>`;
}
