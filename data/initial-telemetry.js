/**
 * AuditTrail GRC — Modelo Inicial de Telemetria e Registros
 * Configurado sem dados pré-renderizados: todos os dados, gráficos,
 * indicadores e achados de auditoria são extraídos dinamicamente da planilha enviada.
 */

const INITIAL_TELEMETRY = {
    user: "Aguardando upload de planilha...",
    userId: "—",
    erpVersion: "—",
    periodStart: "",
    periodEnd: "",
    hostname: "—",
    osHash: "—",
    mainStation: "—",
    totalRecords: 0,
    totalTransactions: 0,
    totalUnits: 0,
    totalEntities: 0,
    totalSessions: 0,
    totalMenuAccess: 0,
    operations: {
        "Exclusão": 0,
        "Edição": 0,
        "Inclusão": 0
    },
    daily: [],
    hourly: [],
    units: [],
    entities: [],
    menus: []
};

let FORENSIC_FINDINGS = [];
const INITIAL_RECORDS = [];

// Estado Global da Aplicação (compartilhado entre todos os módulos)
let telemetry = JSON.parse(JSON.stringify(INITIAL_TELEMETRY));
let records = [...INITIAL_RECORDS];
let filteredRecords = [...records];
let selectedRecord = null;
let currentPage = 1;
const PAGE_SIZE = 18;
let activeTxFilter = "";
