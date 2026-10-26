/**
 * AuditTrail GRC — Motor de Ingestão e Processamento Dinâmico de Planilhas (SheetJS)
 * Extrai 100% dos dados, agregações, métricas e matriz de risco em tempo real.
 */

function setupFileIngestion() {
    ['xlsx-file-input', 'overview-file-input', 'replace-file-input'].forEach(id => {
        const fileInput = document.getElementById(id);
        if (fileInput) {
            fileInput.addEventListener('change', e => {
                if (e.target.files && e.target.files[0]) {
                    ingestSpreadsheetFile(e.target.files[0]);
                }
            });
        }
    });

    const dropzones = [
        { id: 'sidebar-dropzone', activeClass: ['border-sky-400', 'bg-obsidian-800'] },
        { id: 'overview-upload-cta', activeClass: ['border-sky-500', 'bg-sky-100/60'] }
    ];

    dropzones.forEach(({ id, activeClass }) => {
        const dropzone = document.getElementById(id);
        if (dropzone) {
            ['dragenter', 'dragover'].forEach(evt => {
                dropzone.addEventListener(evt, e => {
                    e.preventDefault();
                    dropzone.classList.add(...activeClass);
                });
            });

            ['dragleave', 'drop'].forEach(evt => {
                dropzone.addEventListener(evt, e => {
                    e.preventDefault();
                    dropzone.classList.remove(...activeClass);
                });
            });

            dropzone.addEventListener('drop', e => {
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    ingestSpreadsheetFile(e.dataTransfer.files[0]);
                }
            });
        }
    });
}

/**
 * Lê o arquivo selecionado usando SheetJS e reconstrói todos os dados da plataforma.
 * @param {File} file 
 */
function ingestSpreadsheetFile(file) {
    notifyToast(`Lendo e processando planilha "${file.name}"...`, 'info');
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
                raw: false
            });

            if (!rawRows || rawRows.length === 0) {
                notifyToast("A planilha está vazia ou sem linhas de dados.", "error");
                return;
            }

            rebuildFromUploadedSheet(rawRows, file.name);
            notifyToast(`Sucesso! ${formatNumber(rawRows.length)} registros extraídos e analisados em tempo real.`, "success");
        } catch (err) {
            console.error("Erro na leitura da planilha:", err);
            notifyToast("Erro ao processar o arquivo. Certifique-se de ser um .xlsx, .xls ou .csv válido.", "error");
        }
    };

    reader.readAsArrayBuffer(file);
}

/**
 * Carrega e processa uma planilha a partir de um caminho local (ex: pasta planilhas).
 * @param {string} path 
 */
async function loadLocalSpreadsheet(path = 'planilhas/LOG CELSO (2).xlsx') {
    try {
        notifyToast(`Buscando arquivo local "${path}"...`, 'info');
        const res = await fetch(path);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const filename = path.split('/').pop() || "planilha_auditoria.xlsx";
        const file = new File([blob], filename, { type: blob.type });
        ingestSpreadsheetFile(file);
    } catch (err) {
        console.warn("Erro ao buscar planilha local via fetch:", err);
        notifyToast("Não foi possível carregar automaticamente via navegador. Por favor, arraste o arquivo da pasta para a área de upload.", "error");
    }
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
 * Reconstrói 100% da telemetria, agregadores, indicadores e achados a partir da planilha fornecida.
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
    const stationsMap = {};

    let sessionCount = 0;
    let detectedUser = "";
    let detectedUserId = "";
    let detectedErpVersion = "";
    let detectedHostname = "";
    let detectedOsHash = "";
    let detectedMainStation = "";

    rawRows.forEach(row => {
        const normRow = {};
        for (const [k, v] of Object.entries(row)) {
            normRow[normalizeHeaderKey(k)] = v;
        }

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

        if (operacao.toLowerCase().startsWith('exc')) operacao = 'Exclusão';
        else if (operacao.toLowerCase().startsWith('edi')) operacao = 'Edição';
        else if (operacao.toLowerCase().startsWith('inc')) operacao = 'Inclusão';
        else if (!operacao) operacao = 'Edição';

        const valorPosterior = String(normRow['valorposterior'] || normRow['depois'] || normRow['novovalor'] || '');
        const valorAnterior = String(normRow['valoranterior'] || normRow['antes'] || normRow['valorantigo'] || '');
        const revisao = String(normRow['revisao'] || normRow['rev'] || '');
        const transacao = String(normRow['transacao'] || normRow['tx'] || normRow['transacaoid'] || '');
        const versao = String(normRow['versao'] || normRow['version'] || '');

        if (!dataHora && !entidade) return;
        if (!detectedUser && usuario) detectedUser = usuario;
        if (!detectedErpVersion && versao && versao !== '0') detectedErpVersion = versao;
        if (transacao) txSet.add(transacao);

        unitsMap[unNeg] = (unitsMap[unNeg] || 0) + 1;
        entitiesMap[entidade] = (entitiesMap[entidade] || 0) + 1;
        opsMap[operacao] = (opsMap[operacao] || 0) + 1;

        const kvPost = parseKeyValueString(valorPosterior);
        const kvAnt = parseKeyValueString(valorAnterior);

        if (!detectedUserId) {
            if (kvPost.usuario) detectedUserId = kvPost.usuario;
            else if (kvAnt.usuario) detectedUserId = kvAnt.usuario;
        }

        if (kvPost.estacao) {
            stationsMap[kvPost.estacao] = (stationsMap[kvPost.estacao] || 0) + 1;
        }

        if (entidade === 'Estacao') {
            if (kvPost.identificacao) detectedHostname = kvPost.identificacao;
            if (kvPost.identificacaoInstalacaoSO) detectedOsHash = kvPost.identificacaoInstalacaoSO;
            if (kvPost.id) stationsMap[kvPost.id] = (stationsMap[kvPost.id] || 0) + 1;
        }

        if (entidade === 'SessaoUsuario') sessionCount++;
        if (entidade === 'AcessoRecursoSistema') {
            if (kvPost.menu) menuMap[kvPost.menu] = (menuMap[kvPost.menu] || 0) + 1;
        }

        // Extração de hora
        const parts = dataHora.split(' ');
        const datePart = parts[0] || '';
        let timePart = parts[1] || '';

        // Suporte para datas ISO contendo T
        let cleanDate = datePart;
        if (dataHora.includes('T')) {
            const isoParts = dataHora.split('T');
            cleanDate = isoParts[0];
            timePart = (isoParts[1] || '').substring(0, 8);
        }

        if (timePart) {
            const hKey = timePart.substring(0, 2) + 'h';
            hourlyMap[hKey] = (hourlyMap[hKey] || 0) + 1;
        }

        if (cleanDate) {
            if (!dailyMap[cleanDate]) {
                const isSlash = cleanDate.includes('/');
                let displayLabel = cleanDate.substring(0, 5);
                let weekdayName = "Dia";
                
                try {
                    const parsedD = isSlash 
                        ? new Date(cleanDate.split('/')[2], cleanDate.split('/')[1] - 1, cleanDate.split('/')[0])
                        : new Date(cleanDate);
                    const daysWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                    weekdayName = daysWeek[parsedD.getDay()] || "Dia";
                } catch (e) {}

                dailyMap[cleanDate] = { 
                    date: cleanDate, 
                    label: displayLabel, 
                    weekday: weekdayName, 
                    start: timePart || '08:00:00', 
                    end: timePart || '17:00:00', 
                    span: "—", 
                    records: 0, 
                    txSet: new Set(), 
                    sessions: 0 
                };
            }
            dailyMap[cleanDate].records++;
            if (transacao) dailyMap[cleanDate].txSet.add(transacao);
            if (entidade === 'SessaoUsuario') dailyMap[cleanDate].sessions++;
            if (timePart && timePart < dailyMap[cleanDate].start) dailyMap[cleanDate].start = timePart;
            if (timePart && timePart > dailyMap[cleanDate].end) dailyMap[cleanDate].end = timePart;
        }

        newRecords.push({ dataHora, unNeg, usuario, entidade, operacao, valorPosterior, valorAnterior, revisao, transacao, versao });
    });

    const topStationEntry = Object.entries(stationsMap).sort((a,b)=>b[1]-a[1])[0];
    if (topStationEntry) detectedMainStation = topStationEntry[0];

    // Atualizar Objeto Global Telemetry 100% dinâmico
    telemetry.user = detectedUser || "Usuário não identificado";
    telemetry.userId = detectedUserId || "N/A";
    telemetry.erpVersion = detectedErpVersion || "3.x";
    telemetry.hostname = detectedHostname || (detectedMainStation ? `Host-${detectedMainStation}` : "N/A");
    telemetry.osHash = detectedOsHash || "N/A";
    telemetry.mainStation = detectedMainStation || "N/A";

    telemetry.totalRecords = newRecords.length;
    telemetry.totalTransactions = txSet.size || 1;
    telemetry.totalUnits = Object.keys(unitsMap).length;
    telemetry.totalEntities = Object.keys(entitiesMap).length;
    telemetry.totalSessions = sessionCount;
    telemetry.operations = opsMap;

    telemetry.units = Object.entries(unitsMap)
        .map(([unit, count]) => ({ unit, count }))
        .sort((a, b) => b.count - a.count);

    telemetry.entities = Object.entries(entitiesMap)
        .map(([entity, count]) => ({ entity, count }))
        .sort((a, b) => b.count - a.count);

    telemetry.menus = Object.entries(menuMap).map(([route, count]) => ({
        route, count, risk: route.toLowerCase().includes('log')
    })).sort((a, b) => b.count - a.count);
    telemetry.totalMenuAccess = telemetry.menus.reduce((acc, m) => acc + m.count, 0);

    // Curva horária 24h completa extraída dos dados
    const hoursArr = [];
    for (let h = 0; h < 24; h++) {
        const hKey = String(h).padStart(2, '0') + 'h';
        if (hourlyMap[hKey] || (h >= 7 && h <= 19)) {
            hoursArr.push({ hour: hKey, count: hourlyMap[hKey] || 0 });
        }
    }
    telemetry.hourly = hoursArr;

    // Cronologia diária extraída dos dados
    const daysArr = Object.values(dailyMap);
    if (daysArr.length > 0) {
        daysArr.forEach(d => {
            d.tx = d.txSet.size;
            delete d.txSet;
            const sH = parseInt(d.start.substring(0, 2)) || 8;
            const sM = parseInt(d.start.substring(3, 5)) || 0;
            const eH = parseInt(d.end.substring(0, 2)) || 17;
            const eM = parseInt(d.end.substring(3, 5)) || 0;
            const diffMin = Math.max(0, (eH * 60 + eM) - (sH * 60 + sM));
            const spH = Math.floor(diffMin / 60);
            const spM = diffMin % 60;
            d.span = `${String(spH).padStart(2, '0')}h ${String(spM).padStart(2, '0')}m`;
        });
        telemetry.daily = daysArr;
        telemetry.periodStart = daysArr[0].date + " " + daysArr[0].start;
        telemetry.periodEnd = daysArr[daysArr.length - 1].date + " " + daysArr[daysArr.length - 1].end;
    }

    // =========================================================================
    // GERAÇÃO DINÂMICA DA MATRIZ DE RISCO & ACHADOS FORENSES
    // =========================================================================
    const dynamicFindings = [];

    // 1. Autoauditoria no Log de Operações
    const logRecords = newRecords.filter(r => r.entidade === 'AcessoRecursoSistema' && r.valorPosterior.toLowerCase().includes('log de operações'));
    if (logRecords.length > 0) {
        dynamicFindings.push({
            id: "self_audit",
            title: "1. Autoauditoria no Módulo 'Log de Operações'",
            severity: "CRÍTICO",
            badgeClass: "pill-crimson",
            occurrences: `${logRecords.length} acessos`,
            entity: "AcessoRecursoSistema",
            searchKey: "Log de Operações",
            summary: `O usuário acessou diretamente a ferramenta de rastreamento de logs do ERP em ${logRecords.length} ocasiões, permitindo monitorar o que a própria auditoria rastreava.`,
            timestamps: logRecords.slice(0, 3).map(r => r.dataHora).join(' • '),
            controlRef: "Controle SOX ITGC-04 (Segregação de Monitoramento de Logs)"
        });
    }

    // 2. Bypass de Conferência de NFe em Fornecedor
    const bypassRecords = newRecords.filter(r => r.entidade === 'Fornecedor' && r.valorPosterior.includes('ignorarConferenciaAutomaticaNotaFiscal=true'));
    if (bypassRecords.length > 0) {
        dynamicFindings.push({
            id: "supplier_bypass",
            title: "2. Bypass de Conferência Automática de NFe em Fornecedor",
            severity: "CRÍTICO",
            badgeClass: "pill-crimson",
            occurrences: `${bypassRecords.length} registros`,
            entity: "Fornecedor",
            searchKey: "ignorarConferencia",
            summary: `Parâmetros definidos para ignorar conferência automática de notas fiscais em fornecedores, desabilitando conferência sistêmica (Three-Way Match).`,
            timestamps: bypassRecords.slice(0, 3).map(r => r.dataHora).join(' • '),
            controlRef: "Controle P2P-09 (Three-Way Match Fiscal & Recebimento)"
        });
    }

    // 3. Estornos de Recebimento Físico
    const reversalRecords = newRecords.filter(r => r.entidade === 'EstornoItemRecebimentoFisico');
    if (reversalRecords.length > 0) {
        dynamicFindings.push({
            id: "physical_reversal",
            title: "3. Estornos de Recebimento Físico de Mercadoria",
            severity: "ALTO",
            badgeClass: "pill-amber",
            occurrences: `${reversalRecords.length} estornos`,
            entity: "EstornoItemRecebimentoFisico",
            searchKey: "",
            summary: `Reversões manuais de mercadorias já recebidas fisicamente nas docas, alterando saldos de estoque contábil e de recebimento.`,
            timestamps: reversalRecords.slice(0, 3).map(r => `${r.dataHora} (${r.unNeg})`).join(' • '),
            controlRef: "Controle INV-03 (Estorno de Docas & Aprovação de Supervisão)"
        });
    }

    // 4. Liberações de Alçada
    const clearanceRecords = newRecords.filter(r => r.entidade === 'LiberacaoUsuario');
    if (clearanceRecords.length > 0) {
        dynamicFindings.push({
            id: "clearance",
            title: "4. Liberações de Alçada em Compras Suspensas",
            severity: "ALTO",
            badgeClass: "pill-indigo",
            occurrences: `${clearanceRecords.length} liberações`,
            entity: "LiberacaoUsuario",
            searchKey: "",
            summary: `Uso de credencial para liberação manual de compras e recebimentos com bloqueio ou suspensão sistêmica ativa.`,
            timestamps: clearanceRecords.slice(0, 3).map(r => `${r.dataHora} (${r.unNeg})`).join(' • '),
            controlRef: "Controle ALC-02 (Alçadas de Desbloqueio Comercial)"
        });
    }

    // 5. Alterações Manuais de Preço de Venda
    const priceRecords = newRecords.filter(r => r.entidade === 'AlteracaoPreco' || r.entidade === 'PrecoEmbalagemUnidadeNegocio');
    if (priceRecords.length > 0) {
        dynamicFindings.push({
            id: "manual_price",
            title: "5. Alterações Manuais de Preço de Venda (Origem = M)",
            severity: "MÉDIO",
            badgeClass: "pill-amber",
            occurrences: `${priceRecords.length} alterações`,
            entity: "AlteracaoPreco",
            searchKey: "",
            summary: `Modificações diretas de preço de venda e margens por filial em AlteracaoPreco e PrecoEmbalagemUnidadeNegocio.`,
            timestamps: `Distribuído entre ${telemetry.periodStart} e ${telemetry.periodEnd}`,
            controlRef: "Controle REV-06 (Governança de Pricing & Margem Bruta)"
        });
    }

    // 6. Edição Direta em NFe e Estoque
    const invoiceStockRecords = newRecords.filter(r => r.entidade === 'ItemNotaFiscal' || r.entidade === 'Estoque');
    if (invoiceStockRecords.length > 0) {
        dynamicFindings.push({
            id: "invoice_stock",
            title: "6. Edições Diretas de Itens de NFe e Estoque",
            severity: "MÉDIO",
            badgeClass: "pill-amber",
            occurrences: `${invoiceStockRecords.length} movimentações`,
            entity: "ItemNotaFiscal",
            searchKey: "",
            summary: `Edições em itens de notas fiscais com alteração de quantidade, substituição de embalagem e ajustes de saldos físicos.`,
            timestamps: invoiceStockRecords.slice(0, 3).map(r => r.dataHora).join(' • '),
            controlRef: "Controle FIS-01 (Integridade de Lançamento Fiscal de Entrada)"
        });
    }

    // 7. Cadastro e Conversão de Embalagens
    const packagingRecords = newRecords.filter(r => r.entidade === 'Embalagem' || r.entidade === 'ConversaoProdutoFornecedor');
    if (packagingRecords.length > 0) {
        dynamicFindings.push({
            id: "packaging_change",
            title: "7. Cadastro e Conversão de Embalagens (Fator CX/UN)",
            severity: "ALTO",
            badgeClass: "pill-indigo",
            occurrences: `${packagingRecords.length} embalagens`,
            entity: "Embalagem",
            searchKey: "Embalagem",
            summary: `Criação e edição de embalagens alterando quantidade por embalagem (fator de conversão 12 para 1), troca de embalagem contida e manipulação de códigos de barras EAN.`,
            timestamps: packagingRecords.slice(0, 3).map(r => r.dataHora).join(' • '),
            controlRef: "Controle CAD-04 (Rastreabilidade de Embalagens, EAN e Fator de Conversão)"
        });
    }

    // 8. Upload de Arquivos XML
    const xmlRecords = newRecords.filter(r => r.entidade === 'Arquivo' || r.valorPosterior.includes('.xml'));
    if (xmlRecords.length > 0) {
        dynamicFindings.push({
            id: "xml_upload",
            title: "8. Importação Manual de Arquivos XML de Nota Fiscal",
            severity: "INFORMATIVO",
            badgeClass: "pill-emerald",
            occurrences: `${xmlRecords.length} arquivos XML`,
            entity: "Arquivo",
            searchKey: ".xml",
            summary: `Envio e upload manual de arquivos XML de notas fiscais eletrônicas com chaves de 44 dígitos direto para o banco de dados.`,
            timestamps: xmlRecords.slice(0, 3).map(r => r.dataHora).join(' • '),
            controlRef: "Controle FIS-08 (Rastreabilidade de Ingestão de DF-e)"
        });
    }

    // Atribuir achados dinâmicos
    FORENSIC_FINDINGS = dynamicFindings;

    records = newRecords;
    filteredRecords = [...records];
    currentPage = 1;
    selectedRecord = records[0] || null;

    const sourceTag = document.getElementById('sidebar-source-tag');
    if (sourceTag) sourceTag.textContent = filename;

    const activeFileEl = document.getElementById('active-filename');
    if (activeFileEl) activeFileEl.textContent = filename;

    const bannerFile = document.getElementById('banner-loaded-file');
    if (bannerFile) {
        bannerFile.textContent = filename;
        bannerFile.classList.remove('hidden');
    }

    renderAllViews();
}

/**
 * Exporta a listagem forense atual em arquivo CSV enriquecido com BOM UTF-8.
 */
function exportEnrichedCSV() {
    if (filteredRecords.length === 0) {
        notifyToast("Nenhum registro para exportar. Carregue uma planilha primeiro.", "error");
        return;
    }

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
    if (filteredRecords.length === 0) {
        notifyToast("Nenhum registro para exportar. Carregue uma planilha primeiro.", "error");
        return;
    }

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
