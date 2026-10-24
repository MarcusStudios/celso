/**
 * AuditTrail GRC — Motor de Ingestão e Exportação de Planilhas (SheetJS)
 * Oferece leitura tolerante a variações regionais, datas seriais do Excel e normalização de cabeçalhos.
 */

function setupFileIngestion() {
    const fileInput = document.getElementById('xlsx-file-input');
    const dropzone = document.getElementById('sidebar-dropzone');

    if (fileInput) {
        fileInput.addEventListener('change', e => {
            if (e.target.files && e.target.files[0]) {
                ingestSpreadsheetFile(e.target.files[0]);
            }
        });
    }

    if (dropzone) {
        ['dragenter', 'dragover'].forEach(evt => {
            dropzone.addEventListener(evt, e => {
                e.preventDefault();
                dropzone.classList.add('border-sky-400', 'bg-obsidian-800');
            });
        });

        ['dragleave', 'drop'].forEach(evt => {
            dropzone.addEventListener(evt, e => {
                e.preventDefault();
                dropzone.classList.remove('border-sky-400', 'bg-obsidian-800');
            });
        });

        dropzone.addEventListener('drop', e => {
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                ingestSpreadsheetFile(e.dataTransfer.files[0]);
            }
        });
    }
}

/**
 * Lê o arquivo selecionado usando SheetJS com configuração tolerante a datas.
 * @param {File} file 
 */
function ingestSpreadsheetFile(file) {
    notifyToast(`Lendo planilha "${file.name}"...`, 'info');
    const reader = new FileReader();
    
    reader.onload = function(evt) {
        try {
            const bytes = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(bytes, { 
                type: 'array',
                cellDates: true,
                dateNF: 'dd/mm/yyyy hh:mm:ss'
            });

            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                notifyToast("O arquivo não contém planilhas legíveis.", "error");
                return;
            }

            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const rawRows = XLSX.utils.sheet_to_json(firstSheet, { 
                defval: "",
                raw: false // Garante que datas e números venham formatados como texto legível
            });

            if (!rawRows || rawRows.length === 0) {
                notifyToast("A planilha está vazia ou sem linhas de dados.", "error");
                return;
            }

            rebuildFromUploadedSheet(rawRows, file.name);
            notifyToast(`Sucesso! ${formatNumber(rawRows.length)} registros importados e analisados.`, "success");
        } catch (err) {
            console.error("Erro na leitura da planilha:", err);
            notifyToast("Erro ao processar o arquivo. Certifique-se de ser um .xlsx, .xls ou .csv válido.", "error");
        }
    };

    reader.readAsArrayBuffer(file);
}

/**
 * Normaliza uma string de cabeçalho removendo acentos e caracteres especiais.
 * @param {string} key 
 * @returns {string}
 */
function normalizeHeaderKey(key) {
    return String(key || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
}

/**
 * Reconstrói a telemetria, agregadores e registros a partir da planilha fornecida.
 * @param {Array<object>} rawRows 
 * @param {string} filename 
 */
function rebuildFromUploadedSheet(rawRows, filename) {
    const newRecords = [];
    const txSet = new Set();
    const unitsMap = {};
    const entitiesMap = {};
    const opsMap = { "Exclusão": 0, "Edição": 0, "Inclusão": 0 };
    const dailyMap = {};
    const hourlyMap = {};
    const menuMap = {};
    let sessionCount = 0;
    let detectedUser = "";

    rawRows.forEach(row => {
        // Criar dicionário de busca rápida normalizada para a linha
        const normRow = {};
        for (const [k, v] of Object.entries(row)) {
            normRow[normalizeHeaderKey(k)] = v;
        }

        // Mapeamento resiliente de sinônimos de colunas
        const dataHora = String(
            normRow['datahora'] || normRow['data'] || normRow['timestamp'] || ''
        ).trim();

        const unNeg = String(
            normRow['unneg'] || normRow['unidadenegocio'] || normRow['filial'] || normRow['unidade'] || 'ESC'
        ).trim();

        const usuario = String(
            normRow['usuario'] || normRow['user'] || normRow['colaborador'] || ''
        ).trim();

        const entidade = String(
            normRow['entidade'] || normRow['tabela'] || normRow['objeto'] || ''
        ).trim();

        let operacao = String(
            normRow['operacao'] || normRow['tipooperacao'] || normRow['acao'] || ''
        ).trim();

        // Normalização de operações comuns
        if (operacao.toLowerCase().startsWith('exc')) operacao = 'Exclusão';
        else if (operacao.toLowerCase().startsWith('edi')) operacao = 'Edição';
        else if (operacao.toLowerCase().startsWith('inc')) operacao = 'Inclusão';
        else if (!operacao) operacao = 'Edição';

        const valorPosterior = String(normRow['valorposterior'] || normRow['depois'] || normRow['novovalor'] || '');
        const valorAnterior = String(normRow['valoranterior'] || normRow['antes'] || normRow['valorantigo'] || '');
        const revisao = String(normRow['revisao'] || normRow['rev'] || '');
        const transacao = String(normRow['transacao'] || normRow['tx'] || normRow['transacaoid'] || '');
        const versao = String(normRow['versao'] || normRow['version'] || '0');

        if (!dataHora && !entidade) return;
        if (!detectedUser && usuario) detectedUser = usuario;
        if (transacao) txSet.add(transacao);

        unitsMap[unNeg] = (unitsMap[unNeg] || 0) + 1;
        entitiesMap[entidade] = (entitiesMap[entidade] || 0) + 1;
        opsMap[operacao] = (opsMap[operacao] || 0) + 1;

        if (entidade === 'SessaoUsuario') sessionCount++;
        if (entidade === 'AcessoRecursoSistema') {
            const kv = parseKeyValueString(valorPosterior);
            if (kv.menu) menuMap[kv.menu] = (menuMap[kv.menu] || 0) + 1;
        }

        // Parsing da data e hora
        const parts = dataHora.split(' ');
        const datePart = parts[0] || '';
        const timePart = parts[1] || '';

        if (timePart) {
            const hKey = timePart.substring(0, 2) + 'h';
            hourlyMap[hKey] = (hourlyMap[hKey] || 0) + 1;
        }

        if (datePart) {
            if (!dailyMap[datePart]) {
                dailyMap[datePart] = { 
                    date: datePart, 
                    label: datePart.substring(0, 5), 
                    weekday: "Dia", 
                    start: timePart || '08:00:00', 
                    end: timePart || '17:00:00', 
                    span: "—", 
                    records: 0, 
                    txSet: new Set(), 
                    sessions: 0 
                };
            }
            dailyMap[datePart].records++;
            if (transacao) dailyMap[datePart].txSet.add(transacao);
            if (entidade === 'SessaoUsuario') dailyMap[datePart].sessions++;
            if (timePart && timePart < dailyMap[datePart].start) dailyMap[datePart].start = timePart;
            if (timePart && timePart > dailyMap[datePart].end) dailyMap[datePart].end = timePart;
        }

        newRecords.push({ dataHora, unNeg, usuario, entidade, operacao, valorPosterior, valorAnterior, revisao, transacao, versao });
    });

    telemetry.user = detectedUser || telemetry.user;
    telemetry.totalRecords = newRecords.length;
    telemetry.totalTransactions = txSet.size || 1;
    telemetry.totalUnits = Object.keys(unitsMap).length;
    telemetry.totalEntities = Object.keys(entitiesMap).length;
    telemetry.totalSessions = sessionCount || telemetry.totalSessions;
    telemetry.operations = opsMap;

    telemetry.units = Object.entries(unitsMap)
        .map(([unit, count]) => ({ unit, count }))
        .sort((a, b) => b.count - a.count);

    telemetry.entities = Object.entries(entitiesMap)
        .map(([entity, count]) => ({ entity, count }))
        .sort((a, b) => b.count - a.count);

    if (Object.keys(menuMap).length > 0) {
        telemetry.menus = Object.entries(menuMap).map(([route, count]) => ({
            route, count, risk: route.toLowerCase().includes('log')
        })).sort((a, b) => b.count - a.count);
        telemetry.totalMenuAccess = telemetry.menus.reduce((acc, m) => acc + m.count, 0);
    }

    // Atualizar mapa de dias e horas
    const daysArr = Object.values(dailyMap);
    if (daysArr.length > 0) {
        daysArr.forEach(d => {
            d.tx = d.txSet.size;
            delete d.txSet;
        });
        telemetry.daily = daysArr;
        telemetry.periodStart = daysArr[0].date + " " + daysArr[0].start;
        telemetry.periodEnd = daysArr[daysArr.length - 1].date + " " + daysArr[daysArr.length - 1].end;
    }

    records = newRecords;
    const sourceTag = document.getElementById('sidebar-source-tag');
    if (sourceTag) sourceTag.textContent = filename;

    const btnRestore = document.getElementById('btn-restore-default');
    if (btnRestore) btnRestore.classList.remove('hidden');

    renderAllViews();
}

/**
 * Restaura o conjunto de dados oficial verificado de LOG CELSO.xlsx.
 */
function restoreDefaultDataset() {
    telemetry = JSON.parse(JSON.stringify(INITIAL_TELEMETRY));
    records = [...INITIAL_RECORDS];
    
    const sourceTag = document.getElementById('sidebar-source-tag');
    if (sourceTag) sourceTag.textContent = "LOG CELSO.xlsx";

    const btnRestore = document.getElementById('btn-restore-default');
    if (btnRestore) btnRestore.classList.add('hidden');

    renderAllViews();
    notifyToast("Base de dados oficial de LOG CELSO.xlsx restaurada.", "info");
}

/**
 * Exporta a listagem forense atual em arquivo CSV enriquecido com BOM UTF-8.
 */
function exportEnrichedCSV() {
    const headers = ["Data_Hora", "Unidade_Negocio", "Usuario", "Entidade", "Operacao", "Resumo_Forense", "Transacao", "Revisao", "Valor_Anterior", "Valor_Posterior"];
    const csvRows = [headers.join(';')];

    filteredRecords.forEach(r => {
        const row = [
            r.dataHora,
            r.unNeg,
            r.usuario,
            r.entidade,
            r.operacao,
            buildRecordSummary(r).replace(/;/g, ','),
            r.transacao,
            r.revisao,
            (r.valorAnterior || '').replace(/;/g, '|'),
            (r.valorPosterior || '').replace(/;/g, '|')
        ].map(v => `"${String(v).replace(/"/g, '""')}"`);
        csvRows.push(row.join(';'));
    });

    const blob = new Blob(["\uFEFF" + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Trilha_Forense_Enriquecida_${(telemetry.user || 'AUDITORIA').replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notifyToast(`CSV exportado com ${formatNumber(filteredRecords.length)} registros filtrados.`, "success");
}

/**
 * Exporta os registros filtrados diretamente em planilha Excel (.xlsx) nativa via SheetJS.
 */
function exportNativeXLSX() {
    try {
        if (!window.XLSX) {
            notifyToast("SheetJS não disponível. Tente novamente.", "error");
            return;
        }

        const dataRows = filteredRecords.map(r => ({
            "Data / Hora": r.dataHora,
            "Unidade": r.unNeg,
            "Usuário": r.usuario,
            "Entidade": r.entidade,
            "Operação": r.operacao,
            "Resumo da Alteração": buildRecordSummary(r),
            "ID Transação": r.transacao,
            "Revisão": r.revisao,
            "Valor Anterior": r.valorAnterior,
            "Valor Posterior": r.valorPosterior
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Evidências Forenses");

        const filename = `Trilha_Forense_${(telemetry.user || 'AUDITORIA').replace(/\s+/g, '_')}.xlsx`;
        XLSX.writeFile(workbook, filename);
        notifyToast(`Planilha Excel (.xlsx) baixada com ${formatNumber(filteredRecords.length)} registros!`, "success");
    } catch (err) {
        console.error("Erro na exportação XLSX:", err);
        notifyToast("Erro ao exportar planilha Excel.", "error");
    }
}
