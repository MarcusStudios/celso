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
 * Suporta String, ArrayBuffer ou Uint8Array.
 * @param {ArrayBuffer|Uint8Array|string} input 
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
 * @param {string} raw 
 * @returns {Record<string, string>}
 */
function parseKeyValueString(raw) {
    const map = {};
    if (!raw) return map;

    const str = String(raw).trim();
    if (!str) return map;

    const tokens = str.split(';');
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i].trim();
        if (!token) continue;

        const idx = token.indexOf('=');
        if (idx > -1) {
            const key = token.substring(0, idx).trim();
            let val = token.substring(idx + 1).trim();
            // Remover aspas envoltórias se presentes
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.substring(1, val.length - 1);
            }
            if (key) map[key] = val;
        } else {
            map[token] = 'true';
        }
    }
    return map;
}

/**
 * Converte valor numérico (brasileiro ou padrão internacional) para número de ponto flutuante.
 * Suporta formatos como "1.250,50", "49,90", "1250.50".
 * @param {any} val 
 * @returns {number}
 */
function parseBRNumber(val) {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    let s = String(val).trim();
    if (s.includes(',') && s.includes('.')) {
        // Ex: 1.250,50
        s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes(',')) {
        // Ex: 49,90
        s = s.replace(',', '.');
    }
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
}

/**
 * Normaliza carimbos de hora para formato canônico HH:mm:ss.
 * @param {string} timeStr 
 * @returns {string}
 */
function normalizeTimeStr(timeStr) {
    if (!timeStr) return "00:00:00";
    const parts = String(timeStr).trim().split(':').map(p => p.trim());
    const h = String(parseInt(parts[0], 10) || 0).padStart(2, '0');
    const m = String(parseInt(parts[1], 10) || 0).padStart(2, '0');
    const s = String(parseInt(parts[2], 10) || 0).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

/**
 * Sanitiza campos de texto para exportação CSV, preservando pontuação legítima
 * e prevenindo ataques de CSV / Formula Injection (quando o valor inicia com =, +, -, @, \t, \r).
 * @param {any} value 
 * @returns {string}
 */
function sanitizeCSVField(value) {
    if (value === null || value === undefined) return '""';
    let str = String(value);

    // Proteção contra Formula Injection (Excel / LibreOffice)
    if (/^[=+\-@\t\r]/.test(str)) {
        str = "'" + str;
    }

    // Escapar aspas duplas conforme RFC 4180
    return `"${str.replace(/"/g, '""')}"`;
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
 * Cria função debounced para otimização de eventos com alta frequência (ex: digitação de busca).
 * @param {Function} func 
 * @param {number} wait 
 * @returns {Function}
 */
function debounce(func, wait = 200) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
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
