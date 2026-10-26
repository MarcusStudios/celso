/**
 * AuditTrail GRC — Motor de Decomposição e Diff Forense (Antes vs. Depois)
 */

/**
 * Constrói um resumo contextual legível para a linha de evidência.
 * @param {object} rec 
 * @returns {string}
 */
function buildRecordSummary(rec) {
    const post = parseKeyValueString(rec.valorPosterior);
    const ant = parseKeyValueString(rec.valorAnterior);

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
            parts.push(`Preço: R$ ${ant.precoVenda} → R$ ${post.precoVenda}`);
        } else if (post.precoVenda) {
            parts.push(`Preço: R$ ${post.precoVenda}`);
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
        return `Preço Emb ${emb ? emb + ': ' : ''}R$ ${pAnt || '—'} → R$ ${pPost || '—'}${post.markup ? ` (Mk: ${parseFloat(post.markup).toFixed(1)}%)` : ''}`;
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
            diffs.push(`Unit: R$ ${ant.valorUnitario} → R$ ${post.valorUnitario}`);
        }
        if (diffs.length > 0) return diffs.slice(0, 3).join(' | ');
    }
    if (rec.entidade === 'AlteracaoPreco') {
        const emb = post.embalagem || ant.embalagem;
        const embStr = emb ? `Emb ${emb} | ` : '';
        return `${embStr}Preço Venda: R$ ${post.precoVendaAnterior || ant.precoVendaAnterior || '?'} → R$ ${post.precoVendaPosterior || '?'}`;
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
    return sampleKey ? `${sampleKey}=${post[sampleKey] || ant[sampleKey]}` : rec.operacao;
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
    if (k === 'quantidadePorEmbalagem' || k === 'quantidadeEmbalagem') {
        return `<span class="inline-flex items-center gap-1.5 font-bold text-amber-950"><i class="fa-solid fa-cubes-stacked text-amber-600 text-xs"></i><span>${escapeHtml(k)}</span><span class="px-1 py-0.2 text-[8px] rounded bg-amber-100 text-amber-800 border border-amber-300 font-mono font-medium">FATOR</span></span>`;
    }
    if (k === 'codigoBarras') {
        return `<span class="inline-flex items-center gap-1.5 font-bold text-slate-800"><i class="fa-solid fa-barcode text-slate-600 text-xs"></i><span>codigoBarras</span><span class="px-1 py-0.2 text-[8px] rounded bg-slate-100 text-slate-700 border border-slate-300 font-mono font-medium">EAN</span></span>`;
    }
    if (k === 'precoVenda' || k === 'precoVendaPosterior' || k === 'precoVendaAnterior') {
        return `<span class="inline-flex items-center gap-1.5 font-bold text-emerald-950"><i class="fa-solid fa-tag text-emerald-600 text-xs"></i><span>${escapeHtml(k)}</span></span>`;
    }
    if (k === 'precoReferencial' || k === 'precoReferencialPosterior' || k === 'precoReferencialAnterior') {
        return `<span class="inline-flex items-center gap-1.5 font-bold text-slate-800"><i class="fa-solid fa-calculator text-indigo-600 text-xs"></i><span>${escapeHtml(k)}</span></span>`;
    }
    if (k === 'produto') {
        return `<span class="inline-flex items-center gap-1.5 font-bold text-slate-900"><i class="fa-solid fa-cube text-slate-500 text-xs"></i><span>produto</span></span>`;
    }
    return escapeHtml(k);
}

/**
 * Renderiza o painel direito de inspeção detalhada de atributos lado a lado.
 * @param {object} rec 
 */
function renderDiffInspector(rec) {
    if (!rec) {
        const tbody = document.getElementById('diff-tbody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="3" class="p-8 text-center text-slate-400 font-sans">Nenhum registro selecionado. Carregue uma planilha e selecione uma linha.</td></tr>`;
        const diffTitle = document.getElementById('diff-title');
        if (diffTitle) diffTitle.textContent = '—';
        const diffTx = document.getElementById('diff-tx-btn-label');
        if (diffTx) diffTx.textContent = '—';
        const diffOp = document.getElementById('diff-op-badge');
        if (diffOp) { diffOp.className = 'pill-badge pill-slate'; diffOp.textContent = '—'; }
        return;
    }

    const opBadge = rec.operacao === 'Exclusão' ? 'pill-crimson' : rec.operacao === 'Edição' ? 'pill-amber' : 'pill-emerald';
    const badgeEl = document.getElementById('diff-op-badge');
    if (badgeEl) {
        badgeEl.className = `pill-badge ${opBadge}`;
        badgeEl.textContent = rec.operacao;
    }

    document.getElementById('diff-title').textContent = rec.entidade;
    document.getElementById('diff-tx-btn-label').textContent = rec.transacao;
    document.getElementById('diff-meta-dt').textContent = rec.dataHora;
    document.getElementById('diff-meta-un').textContent = rec.unNeg;
    document.getElementById('diff-meta-rev').textContent = rec.revisao || '—';
    document.getElementById('diff-meta-ver').textContent = rec.versao || '0';

    const ant = parseKeyValueString(rec.valorAnterior);
    const post = parseKeyValueString(rec.valorPosterior);
    const allKeys = Array.from(new Set([...Object.keys(ant), ...Object.keys(post)])).sort();

    let modCount = 0, addCount = 0, delCount = 0;

    const rowsHtml = allKeys.map(k => {
        const vA = ant[k];
        const vP = post[k];
        const labelHtml = formatAttributeLabel(k);
        const safeVA = escapeHtml(vA);
        const safeVP = escapeHtml(vP);

        if (vA !== undefined && vP !== undefined && vA !== vP) {
            modCount++;
            return `
                <tr class="bg-amber-50/70">
                    <td class="py-2 px-3">
                        <div class="flex items-center justify-between gap-1">
                            ${labelHtml}
                            <span class="px-1 py-0.2 text-[8px] rounded bg-amber-100 text-amber-800 border border-amber-300 font-semibold shrink-0">MOD</span>
                        </div>
                    </td>
                    <td class="py-2 px-2.5 text-rose-700 line-through break-all">${safeVA}</td>
                    <td class="py-2 px-2.5 text-emerald-800 font-bold break-all">${safeVP}</td>
                </tr>
            `;
        } else if (vA === undefined && vP !== undefined) {
            addCount++;
            return `
                <tr class="bg-emerald-50/40">
                    <td class="py-2 px-3">${labelHtml}</td>
                    <td class="py-2 px-2.5 text-slate-300">—</td>
                    <td class="py-2 px-2.5 text-emerald-800 font-medium break-all">${safeVP}</td>
                </tr>
            `;
        } else if (vA !== undefined && vP === undefined) {
            delCount++;
            return `
                <tr class="bg-rose-50/50">
                    <td class="py-2 px-3">${labelHtml}</td>
                    <td class="py-2 px-2.5 text-rose-700 line-through break-all">${safeVA}</td>
                    <td class="py-2 px-2.5 text-slate-300">—</td>
                </tr>
            `;
        } else {
            return `
                <tr>
                    <td class="py-1.5 px-3 text-slate-500">${labelHtml}</td>
                    <td class="py-1.5 px-2.5 text-slate-400 break-all">${safeVA}</td>
                    <td class="py-1.5 px-2.5 text-slate-600 break-all">${safeVP}</td>
                </tr>
            `;
        }
    }).join('');

    document.getElementById('diff-count-mod').textContent = modCount;
    document.getElementById('diff-count-add').textContent = addCount;
    document.getElementById('diff-count-del').textContent = delCount;

    document.getElementById('diff-tbody').innerHTML = rowsHtml || `<tr><td colspan="3" class="py-6 text-center text-slate-400">Sem atributos chave=valor estruturados.</td></tr>`;
}
