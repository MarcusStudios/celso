/**
 * AuditTrail GRC — Motor de Ingestão e Processamento Dinâmico de Planilhas (SheetJS)
 * Extrai 100% dos dados, agregações, métricas, hashes criptográficos e matriz de risco em tempo real.
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
 * Calcula o hash SHA-256 do arquivo original para custódia pericial.
 * @param {File} file 
 */
async function ingestSpreadsheetFile(file) {
    notifyToast(`Lendo e processando planilha "${file.name}"...`, 'info');
    const reader = new FileReader();
    
    reader.onload = async function(evt) {
        try {
            const bytes = new Uint8Array(evt.target.result);
            
            // 1. Cálculo do Hash SHA-256 do Arquivo Original (Cadeia de Custódia)
            const fileHash = await calculateSHA256(bytes);

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

            await rebuildFromUploadedSheet(rawRows, file.name, fileHash);
            notifyToast(`Sucesso! ${formatNumber(rawRows.length)} registros extraídos. Hash SHA-256 gerado.`, "success");
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
 * Converte data em string para objeto Date local (sem desvio de fuso horário UTC).
 * @param {string} dateStr 
 * @returns {Date|null}
 */
function parseDateComponents(dateStr) {
    if (!dateStr) return null;
    let clean = dateStr.trim();
    if (clean.includes('T')) clean = clean.split('T')[0];
    if (clean.includes(' ')) clean = clean.split(' ')[0];

    if (clean.includes('/')) {
        const parts = clean.split('/');
        if (parts.length === 3) {
            const d = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const y = parseInt(parts[2], 10);
            return new Date(y, m, d);
        }
    } else if (clean.includes('-')) {
        const parts = clean.split('-');
        if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            return new Date(y, m, d);
        }
    }
    return null;
}

/**
 * Reconstrói 100% da telemetria, agregadores, indicadores e achados a partir da planilha fornecida.
 * @param {Array<object>} rawRows 
 * @param {string} filename 
 * @param {string} fileHash 
 */
async function rebuildFromUploadedSheet(rawRows, filename, fileHash = "—") {
    // 1. Limpeza de estado: reset integral garantindo sem herança da planilha anterior
    telemetry = JSON.parse(JSON.stringify(INITIAL_TELEMETRY));
    telemetry.sourceFileName = filename;
    telemetry.sourceFileHash = fileHash;

    const newRecords = [];
    const txSet = new Set();
    const unitsMap = {};
    const entitiesMap = {};
    const opsMap = { "Exclusão": 0, "Edição": 0, "Inclusão": 0, "Indefinida": 0 };
    const dailyMap = {};
    const hourlyMap = {};
    const menuMap = {};
    const stationsMap = {};
    const usersSet = new Set();

    let sessionCount = 0;
    let detectedUser = "";
    let detectedUserId = "";
    let detectedErpVersion = "";
    let detectedHostname = "";
    let detectedOsHash = "";
    let detectedMainStation = "";

    // Inicializar mapa de 24 horas (00h a 23h)
    for (let h = 0; h < 24; h++) {
        hourlyMap[String(h).padStart(2, '0') + 'h'] = 0;
    }

    rawRows.forEach(row => {
        const normRow = {};
        for (const [k, v] of Object.entries(row)) {
            normRow[normalizeHeaderKey(k)] = v;
        }

        const dataHora = String(
            normRow['datahora'] || normRow['data'] || normRow['timestamp'] || ''
        ).trim();

        const unNeg = String(
            normRow['unneg'] || normRow['unidadenegocio'] || normRow['filial'] || normRow['unidade'] || ''
        ).trim() || 'Não identificada';

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
        else operacao = operacao || 'Indefinida';

        const valorPosterior = String(normRow['valorposterior'] || normRow['depois'] || normRow['novovalor'] || '');
        const valorAnterior = String(normRow['valoranterior'] || normRow['antes'] || normRow['valorantigo'] || '');
        const revisao = String(normRow['revisao'] || normRow['rev'] || '');
        const transacao = String(normRow['transacao'] || normRow['tx'] || normRow['transacaoid'] || '');
        const versao = String(normRow['versao'] || normRow['version'] || '');

        if (!dataHora && !entidade) return;

        if (usuario) {
            usersSet.add(usuario);
            if (!detectedUser) detectedUser = usuario;
        }

        if (!detectedErpVersion && versao && versao !== '0') detectedErpVersion = versao;
        if (transacao) txSet.add(transacao);

        unitsMap[unNeg] = (unitsMap[unNeg] || 0) + 1;
        if (entidade) entitiesMap[entidade] = (entitiesMap[entidade] || 0) + 1;
        opsMap[operacao] = (opsMap[operacao] || 0) + 1;

        // Pré-parse das strings de atributos estruturados (otimização massiva de memória/CPU)
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

        // Extração de hora e normalização segura
        let datePart = '';
        let timePart = '';
        if (dataHora.includes('T')) {
            const isoParts = dataHora.split('T');
            datePart = isoParts[0] || '';
            timePart = (isoParts[1] || '').substring(0, 8);
        } else {
            const parts = dataHora.split(' ');
            datePart = parts[0] || '';
            timePart = parts[1] || '';
        }

        const normTime = normalizeTimeStr(timePart);
        const hourNum = parseInt(normTime.substring(0, 2), 10) || 0;
        const hKey = String(hourNum).padStart(2, '0') + 'h';
        hourlyMap[hKey] = (hourlyMap[hKey] || 0) + 1;

        // Data canônica e dia da semana
        if (datePart) {
            if (!dailyMap[datePart]) {
                const parsedDateObj = parseDateComponents(datePart);
                let weekdayName = "Dia";
                let sortTimestamp = 0;
                let displayLabel = datePart.substring(0, 5);

                if (parsedDateObj && !isNaN(parsedDateObj.getTime())) {
                    const daysWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                    weekdayName = daysWeek[parsedDateObj.getDay()] || "Dia";
                    sortTimestamp = parsedDateObj.getTime();
                    const dPad = String(parsedDateObj.getDate()).padStart(2, '0');
                    const mPad = String(parsedDateObj.getMonth() + 1).padStart(2, '0');
                    displayLabel = `${dPad}/${mPad}`;
                }

                dailyMap[datePart] = { 
                    date: datePart, 
                    sortTimestamp,
                    label: displayLabel, 
                    weekday: weekdayName, 
                    start: normTime, 
                    end: normTime, 
                    span: "—", 
                    records: 0, 
                    txSet: new Set(), 
                    sessions: 0 
                };
            }

            dailyMap[datePart].records++;
            if (transacao) dailyMap[datePart].txSet.add(transacao);
            if (entidade === 'SessaoUsuario') dailyMap[datePart].sessions++;
            if (normTime < dailyMap[datePart].start) dailyMap[datePart].start = normTime;
            if (normTime > dailyMap[datePart].end) dailyMap[datePart].end = normTime;
        }

        // Criar registro enriquecido com cache embutido
        const rec = { 
            dataHora, 
            unNeg, 
            usuario, 
            entidade, 
            operacao, 
            valorPosterior, 
            valorAnterior, 
            revisao, 
            transacao, 
            versao,
            kvPost,
            kvAnt
        };
        rec.summary = buildRecordSummary(rec);
        rec.searchText = `${dataHora} ${unNeg} ${usuario} ${entidade} ${operacao} ${rec.summary} ${transacao} ${valorPosterior} ${valorAnterior}`.toLowerCase();

        newRecords.push(rec);
    });

    const topStationEntry = Object.entries(stationsMap).sort((a,b)=>b[1]-a[1])[0];
    if (topStationEntry) detectedMainStation = topStationEntry[0];

    // Atualizar Objeto Global Telemetry (sem dados fictícios inventados)
    telemetry.user = detectedUser || (usersSet.size > 0 ? Array.from(usersSet).join(', ') : "Usuário não identificado");
    telemetry.userId = detectedUserId || "N/A";
    telemetry.erpVersion = detectedErpVersion || "Não informada";
    telemetry.hostname = detectedHostname || (detectedMainStation ? `Estação-${detectedMainStation}` : "Não identificado");
    telemetry.osHash = detectedOsHash || "Não informado";
    telemetry.mainStation = detectedMainStation || "N/A";
    telemetry.detectedUsers = Array.from(usersSet);

    telemetry.totalRecords = newRecords.length;
    telemetry.totalTransactions = txSet.size;
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

    // Módulos com alerta para rotas sensíveis (logs, auditoria, trilha)
    const sensitiveRouteRegex = /log\s*de\s*opera|auditoria|trilha|seguran[çc]a|perfil|permiss/i;
    telemetry.menus = Object.entries(menuMap).map(([route, count]) => ({
        route, 
        count, 
        risk: sensitiveRouteRegex.test(route)
    })).sort((a, b) => b.count - a.count);
    telemetry.totalMenuAccess = telemetry.menus.reduce((acc, m) => acc + m.count, 0);

    // Curva horária 24h completa
    const hoursArr = [];
    for (let h = 0; h < 24; h++) {
        const hKey = String(h).padStart(2, '0') + 'h';
        hoursArr.push({ hour: hKey, count: hourlyMap[hKey] || 0 });
    }
    telemetry.hourly = hoursArr;

    // Cronologia diária ordenada cronologicamente
    const daysArr = Object.values(dailyMap).sort((a, b) => a.sortTimestamp - b.sortTimestamp);
    if (daysArr.length > 0) {
        daysArr.forEach(d => {
            d.tx = d.txSet.size;
            delete d.txSet;
            const sParts = d.start.split(':').map(Number);
            const eParts = d.end.split(':').map(Number);
            const sMin = (sParts[0] || 0) * 60 + (sParts[1] || 0);
            const eMin = (eParts[0] || 0) * 60 + (eParts[1] || 0);
            const diffMin = Math.max(0, eMin - sMin);
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
    const logRecords = newRecords.filter(r => r.entidade === 'AcessoRecursoSistema' && /log\s*de\s*opera/i.test(r.valorPosterior));
    if (logRecords.length > 0) {
        dynamicFindings.push({
            id: "self_audit",
            title: "1. Autoauditoria no Módulo 'Log de Operações'",
            severity: "CRÍTICO",
            badgeClass: "pill-crimson",
            count: logRecords.length,
            occurrences: `${logRecords.length} acessos`,
            entities: ["AcessoRecursoSistema"],
            searchKey: "Log de Operações",
            summary: `O usuário realizou ${logRecords.length} acessos à funcionalidade de consulta e rastreamento de logs do ERP, permitindo acompanhar o monitoramento de auditoria.`,
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
            count: bypassRecords.length,
            occurrences: `${bypassRecords.length} registros`,
            entities: ["Fornecedor"],
            searchKey: "ignorarConferencia",
            summary: `Desativação da conferência automática de notas fiscais identificada em cadastros de fornecedores (${bypassRecords.length} eventos), suspendendo validações sistêmicas (Three-Way Match).`,
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
            count: reversalRecords.length,
            occurrences: `${reversalRecords.length} estornos`,
            entities: ["EstornoItemRecebimentoFisico"],
            searchKey: "",
            summary: `Registradas ${reversalRecords.length} reversões manuais de mercadorias após recebimento físico nas docas, alterando saldos de conferência e estoque.`,
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
            count: clearanceRecords.length,
            occurrences: `${clearanceRecords.length} liberações`,
            entities: ["LiberacaoUsuario"],
            searchKey: "",
            summary: `Uso de credencial para liberação manual de pedidos de compra ou recebimentos retidos por regras de controle (${clearanceRecords.length} ocorrências).`,
            timestamps: clearanceRecords.slice(0, 3).map(r => `${r.dataHora} (${r.unNeg})`).join(' • '),
            controlRef: "Controle ALC-02 (Alçadas de Desbloqueio Comercial)"
        });
    }

    // 5. Alterações de Preço de Venda
    const priceRecords = newRecords.filter(r => r.entidade === 'AlteracaoPreco' || r.entidade === 'PrecoEmbalagemUnidadeNegocio');
    if (priceRecords.length > 0) {
        dynamicFindings.push({
            id: "manual_price",
            title: "5. Alterações de Preço de Venda e Margem",
            severity: "MÉDIO",
            badgeClass: "pill-amber",
            count: priceRecords.length,
            occurrences: `${priceRecords.length} alterações`,
            entities: ["AlteracaoPreco", "PrecoEmbalagemUnidadeNegocio"],
            searchKey: "",
            summary: `Identificadas ${priceRecords.length} alterações diretas de preço de venda e margens por filial nas entidades AlteracaoPreco e PrecoEmbalagemUnidadeNegocio.`,
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
            count: invoiceStockRecords.length,
            occurrences: `${invoiceStockRecords.length} movimentações`,
            entities: ["ItemNotaFiscal", "Estoque"],
            searchKey: "",
            summary: `Foram detectadas ${invoiceStockRecords.length} modificações em itens de notas fiscais e saldos físicos de estoque (quantidades, substituição de embalagem e saldos).`,
            timestamps: invoiceStockRecords.slice(0, 3).map(r => r.dataHora).join(' • '),
            controlRef: "Controle FIS-01 (Integridade de Lançamento Fiscal de Entrada)"
        });
    }

    // 7. Cadastro e Conversão de Embalagens
    const packagingRecords = newRecords.filter(r => r.entidade === 'Embalagem' || r.entidade === 'ConversaoProdutoFornecedor');
    if (packagingRecords.length > 0) {
        dynamicFindings.push({
            id: "packaging_change",
            title: "7. Cadastro e Conversão de Embalagens (Fator / EAN)",
            severity: "ALTO",
            badgeClass: "pill-indigo",
            count: packagingRecords.length,
            occurrences: `${packagingRecords.length} embalagens`,
            entities: ["Embalagem", "ConversaoProdutoFornecedor"],
            searchKey: "",
            summary: `Modificações em ${packagingRecords.length} registros de embalagens envolvendo fatores de conversão, vínculo de embalagem contida e códigos de barras EAN.`,
            timestamps: packagingRecords.slice(0, 3).map(r => r.dataHora).join(' • '),
            controlRef: "Controle CAD-04 (Rastreabilidade de Embalagens, EAN e Fator de Conversão)"
        });
    }

    // 8. Upload de Arquivos XML
    const xmlRecords = newRecords.filter(r => r.entidade === 'Arquivo' || (r.valorPosterior && r.valorPosterior.includes('.xml')));
    if (xmlRecords.length > 0) {
        dynamicFindings.push({
            id: "xml_upload",
            title: "8. Importação Manual de Arquivos XML de Nota Fiscal",
            severity: "INFORMATIVO",
            badgeClass: "pill-emerald",
            count: xmlRecords.length,
            occurrences: `${xmlRecords.length} arquivos XML`,
            entities: ["Arquivo"],
            searchKey: ".xml",
            summary: `Upload de ${xmlRecords.length} arquivos XML de documentos fiscais eletrônicos diretamente no ERP.`,
            timestamps: xmlRecords.slice(0, 3).map(r => r.dataHora).join(' • '),
            controlRef: "Controle FIS-08 (Rastreabilidade de Ingestão de DF-e)"
        });
    }

    // 9. NOVO ACHADO: Operações Noturnas ou em Fins de Semana (Horário Não Comercial)
    const afterHoursRecords = newRecords.filter(r => {
        let time = '';
        if (r.dataHora.includes('T')) time = (r.dataHora.split('T')[1] || '').substring(0, 8);
        else time = (r.dataHora.split(' ')[1] || '').substring(0, 8);
        const h = parseInt(time.substring(0, 2), 10);
        const parsedD = parseDateComponents(r.dataHora);
        const isWeekend = parsedD ? (parsedD.getDay() === 0 || parsedD.getDay() === 6) : false;
        const isNight = (!isNaN(h) && (h >= 22 || h < 6));
        return isNight || isWeekend;
    });

    if (afterHoursRecords.length > 0) {
        dynamicFindings.push({
            id: "after_hours",
            title: "9. Atividades Fora do Horário Comercial / Fins de Semana",
            severity: "ALTO",
            badgeClass: "pill-amber",
            count: afterHoursRecords.length,
            occurrences: `${afterHoursRecords.length} registros`,
            entities: Array.from(new Set(afterHoursRecords.map(r => r.entidade))).slice(0, 5),
            searchKey: "",
            summary: `Identificadas ${afterHoursRecords.length} operações registradas no período noturno (22h às 06h) ou aos fins de semana, constituindo potencial anomalia operacional.`,
            timestamps: afterHoursRecords.slice(0, 3).map(r => `${r.dataHora} (${r.entidade})`).join(' • '),
            controlRef: "Controle SEC-05 (Monitoramento de Atividades Extra-Expediente)"
        });
    }

    // 10. NOVO ACHADO: Exclusões de Registros no Banco
    const deletionRecords = newRecords.filter(r => r.operacao === 'Exclusão');
    if (deletionRecords.length > 0) {
        dynamicFindings.push({
            id: "deletions",
            title: "10. Exclusões de Registros na Base do ERP",
            severity: "CRÍTICO",
            badgeClass: "pill-crimson",
            count: deletionRecords.length,
            occurrences: `${deletionRecords.length} exclusões`,
            entities: Array.from(new Set(deletionRecords.map(r => r.entidade))).slice(0, 5),
            searchKey: "",
            summary: `Detecção de ${deletionRecords.length} exclusões definitivas de registros no banco de dados, afetando a trilha contínua de integridade.`,
            timestamps: deletionRecords.slice(0, 3).map(r => `${r.dataHora} (${r.entidade})`).join(' • '),
            controlRef: "Controle ITGC-02 (Governança e Restrição a Comandos de Exclusão)"
        });
    }

    FORENSIC_FINDINGS = dynamicFindings;

    // Calcular Hash Canônico do Dataset de Registros
    const canonicalPayload = newRecords.slice(0, 200).map(r => `${r.dataHora}|${r.unNeg}|${r.entidade}|${r.operacao}|${r.transacao}`).join(';');
    telemetry.canonicalDataHash = await calculateSHA256(canonicalPayload);

    records = newRecords;
    filteredRecords = [...records];
    currentPage = 1;
    selectedRecord = records[0] || null;
    activeTxFilter = "";
    activeEntitiesFilter = [];
    activeFindingFilter = "";

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
 * Exporta a listagem forense atual em arquivo CSV enriquecido com BOM UTF-8 e proteção contra CSV Injection.
 */
function exportEnrichedCSV() {
    if (filteredRecords.length === 0) {
        notifyToast("Nenhum registro para exportar. Carregue uma planilha primeiro.", "error");
        return;
    }

    const headers = [
        "Data_Hora", 
        "Unidade_Negocio", 
        "Usuario", 
        "Entidade", 
        "Operacao", 
        "Resumo_Forense", 
        "Transacao", 
        "Revisao", 
        "Valor_Anterior", 
        "Valor_Posterior"
    ];
    
    const csvRows = [headers.map(sanitizeCSVField).join(';')];

    filteredRecords.forEach(r => {
        const row = [
            r.dataHora,
            r.unNeg,
            r.usuario,
            r.entidade,
            r.operacao,
            r.summary || buildRecordSummary(r),
            r.transacao,
            r.revisao,
            r.valorAnterior || '',
            r.valorPosterior || ''
        ].map(sanitizeCSVField);
        csvRows.push(row.join(';'));
    });

    const blob = new Blob(["\uFEFF" + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Trilha_Forense_Enriquecida_${(telemetry.user || 'AUDITORIA').replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notifyToast(`CSV exportado com ${formatNumber(filteredRecords.length)} registros filtrados e sanitizados.`, "success");
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
            "Resumo da Alteração": r.summary || buildRecordSummary(r),
            "ID Transação": r.transacao,
            "Revisão": r.revisao,
            "Valor Anterior": r.valorAnterior,
            "Valor Posterior": r.valorPosterior
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Evidências Forenses");

        const filename = `Trilha_Forense_${(telemetry.user || 'AUDITORIA').replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`;
        XLSX.writeFile(workbook, filename);
        notifyToast(`Planilha Excel (.xlsx) baixada com ${formatNumber(filteredRecords.length)} registros!`, "success");
    } catch (err) {
        console.error("Erro na exportação XLSX:", err);
        notifyToast("Erro ao exportar planilha Excel.", "error");
    }
}
