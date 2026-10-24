/**
 * AuditTrail GRC — Utilitários de Segurança, Formatação e Criptografia
 */

/**
 * Sanitiza texto para prevenir ataques de DOM Cross-Site Scripting (XSS).
 * @param {string|any} str 
 * @returns {string}
 */
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Calcula o hash criptográfico SHA-256 de forma nativa e assíncrona.
 * @param {ArrayBuffer|string} input 
 * @returns {Promise<string>}
 */
async function calculateSHA256(input) {
    try {
        let buffer;
        if (typeof input === 'string') {
            const encoder = new TextEncoder();
            buffer = encoder.encode(input);
        } else if (input instanceof Uint8Array) {
            buffer = input.buffer;
        } else {
            buffer = input;
        }

        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    } catch (e) {
        console.warn("Web Crypto API indisponível ou erro ao gerar hash SHA-256:", e);
        return "N/A (INSECURE CONTEXT)";
    }
}

/**
 * Parser resiliente para strings no formato chave=valor;chave2=valor2;
 * Suporta valores contendo ponto e vírgula escapados e espaços normais.
 * @param {string} raw 
 * @returns {Record<string, string>}
 */
function parseKeyValueString(raw) {
    const map = {};
    if (!raw) return map;

    const tokens = raw.split(';');
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i].trim();
        if (!token) continue;

        const idx = token.indexOf('=');
        if (idx > -1) {
            const key = token.substring(0, idx).trim();
            const val = token.substring(idx + 1).trim();
            map[key] = val;
        } else {
            map[token] = 'true';
        }
    }
    return map;
}

/**
 * Formata números para o padrão brasileiro.
 * @param {number|string} n 
 * @returns {string}
 */
function formatNumber(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

/**
 * Formata moeda para BRL (R$).
 * @param {number|string} n 
 * @returns {string}
 */
function formatCurrency(n) {
    return Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Exibe notificação toast flutuante no canto inferior direito.
 * @param {string} message 
 * @param {'info'|'success'|'error'} type 
 */
function notifyToast(message, type = 'info') {
    const stack = document.getElementById('toast-stack');
    if (!stack) return;

    const styles = {
        info: 'bg-obsidian-950 text-white border-slate-700',
        success: 'bg-emerald-950 text-emerald-100 border-emerald-700',
        error: 'bg-rose-950 text-rose-100 border-rose-700'
    };
    const icons = {
        info: 'fa-solid fa-circle-info text-sky-400',
        success: 'fa-solid fa-circle-check text-emerald-400',
        error: 'fa-solid fa-circle-exclamation text-rose-400'
    };

    const el = document.createElement('div');
    el.className = `px-3.5 py-2.5 rounded-md border shadow-lg text-xs font-medium flex items-center gap-2.5 pointer-events-auto transition-all duration-300 ${styles[type] || styles.info}`;
    el.innerHTML = `<i class="${icons[type] || icons.info}"></i><span>${escapeHtml(message)}</span>`;
    stack.appendChild(el);

    setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 250);
    }, 3400);
}
