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
    if (rec.entidade === 'AlteracaoPreco') {
        return `Preço Venda: R$ ${post.precoVendaAnterior || ant.precoVendaAnterior || '?'} → R$ ${post.precoVendaPosterior || '?'}`;
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
 * Renderiza o painel direito de inspeção detalhada de atributos lado a lado.
 * @param {object} rec 
 */
function renderDiffInspector(rec) {
    if (!rec) return;

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
        const safeK = escapeHtml(k);
        const safeVA = escapeHtml(vA);
        const safeVP = escapeHtml(vP);

        if (vA !== undefined && vP !== undefined && vA !== vP) {
            modCount++;
            return `
                <tr class="bg-amber-50/70">
                    <td class="py-2 px-3 font-semibold text-amber-900">
                        ${safeK}
                        <span class="ml-1 px-1 py-0.2 text-[9px] rounded bg-amber-100 text-amber-800 border border-amber-300">ALTERADO</span>
                    </td>
                    <td class="py-2 px-2.5 text-rose-700 line-through break-all">${safeVA}</td>
                    <td class="py-2 px-2.5 text-emerald-800 font-bold break-all">${safeVP}</td>
                </tr>
            `;
        } else if (vA === undefined && vP !== undefined) {
            addCount++;
            return `
                <tr class="bg-emerald-50/40">
                    <td class="py-2 px-3 font-medium text-slate-800">${safeK}</td>
                    <td class="py-2 px-2.5 text-slate-300">—</td>
                    <td class="py-2 px-2.5 text-emerald-800 font-medium break-all">${safeVP}</td>
                </tr>
            `;
        } else if (vA !== undefined && vP === undefined) {
            delCount++;
            return `
                <tr class="bg-rose-50/50">
                    <td class="py-2 px-3 font-medium text-rose-900">${safeK}</td>
                    <td class="py-2 px-2.5 text-rose-700 line-through break-all">${safeVA}</td>
                    <td class="py-2 px-2.5 text-slate-300">—</td>
                </tr>
            `;
        } else {
            return `
                <tr>
                    <td class="py-1.5 px-3 text-slate-500">${safeK}</td>
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
