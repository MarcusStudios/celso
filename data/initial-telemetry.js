/**
 * AuditTrail GRC — Conjunto Oficial de Dados Forenses Pré-carregados
 * Extraído e validado com base no dossiê de auditoria ERP.
 */

const INITIAL_TELEMETRY = {
    user: "CELSO BRENO SILVA DA COSTA",
    userId: "3800147830607",
    erpVersion: "3.111.3.0",
    periodStart: "14/10/2026 08:01:50",
    periodEnd: "23/10/2026 14:35:56",
    hostname: "GHFESC-WD-0096:Windows 10",
    osHash: "0084-13C3#0000_0000_0000_0000_ACE4_2E00_4155_4698.",
    mainStation: "8300002002142",
    totalRecords: 39057,
    totalTransactions: 3163,
    totalUnits: 32,
    totalEntities: 44,
    totalSessions: 85,
    totalMenuAccess: 189,
    operations: {
        "Exclusão": 19453,
        "Edição": 12360,
        "Inclusão": 7244
    },
    daily: [
        { date: "2026-10-14", label: "14/10", weekday: "Quarta", start: "08:01:50", end: "18:02:22", span: "10h 00m", records: 3587, tx: 452, sessions: 10 },
        { date: "2026-10-15", label: "15/10", weekday: "Quinta", start: "08:01:47", end: "17:43:28", span: "09h 41m", records: 3162, tx: 487, sessions: 1 },
        { date: "2026-10-16", label: "16/10", weekday: "Sexta", start: "07:59:16", end: "15:50:50", span: "07h 51m", records: 2988, tx: 288, sessions: 10 },
        { date: "2026-10-17", label: "17/10", weekday: "Sábado", start: "08:07:53", end: "12:04:19", span: "03h 56m", records: 608, tx: 124, sessions: 6 },
        { date: "2026-10-19", label: "19/10", weekday: "Segunda", start: "08:00:57", end: "17:58:53", span: "09h 57m", records: 10716, tx: 518, sessions: 22 },
        { date: "2026-10-20", label: "20/10", weekday: "Terça", start: "07:57:38", end: "18:00:11", span: "10h 02m", records: 12404, tx: 390, sessions: 18 },
        { date: "2026-10-21", label: "21/10", weekday: "Quarta", start: "08:04:45", end: "18:00:22", span: "09h 55m", records: 2913, tx: 391, sessions: 5 },
        { date: "2026-10-22", label: "22/10", weekday: "Quinta", start: "08:01:15", end: "18:21:07", span: "10h 19m", records: 1910, tx: 368, sessions: 11 },
        { date: "2026-10-23", label: "23/10", weekday: "Sexta", start: "08:03:24", end: "14:35:56", span: "06h 32m", records: 769, tx: 145, sessions: 2 }
    ],
    hourly: [
        { hour: "07h", count: 4 },
        { hour: "08h", count: 5784 },
        { hour: "09h", count: 5439 },
        { hour: "10h", count: 3665 },
        { hour: "11h", count: 4170 },
        { hour: "12h", count: 237 },
        { hour: "13h", count: 148 },
        { hour: "14h", count: 4007 },
        { hour: "15h", count: 10505 },
        { hour: "16h", count: 3910 },
        { hour: "17h", count: 1088 },
        { hour: "18h", count: 100 }
    ],
    units: [
        { unit: "ESC", count: 17539 },
        { unit: "0076", count: 6673 },
        { unit: "0074", count: 4236 },
        { unit: "0077", count: 4145 },
        { unit: "0082", count: 742 },
        { unit: "0081", count: 668 },
        { unit: "0060", count: 662 },
        { unit: "0104", count: 577 },
        { unit: "0093", count: 418 },
        { unit: "0046", count: 391 },
        { unit: "0015", count: 347 },
        { unit: "0078", count: 337 }
    ],
    entities: [
        { entity: "ItemNotaFiscal", count: 8761 },
        { entity: "AtualizacaoCustoNotaFiscalUnidadeNegocio", count: 8698 },
        { entity: "HistoricoCustoItemNotaFiscal", count: 5150 },
        { entity: "HistoricoCusto", count: 2504 },
        { entity: "CustoProduto", count: 2272 },
        { entity: "ICMSProduto", count: 1958 },
        { entity: "PrecoEmbalagemUnidadeNegocio", count: 1897 },
        { entity: "ItemNotaFiscalLote", count: 1359 },
        { entity: "AlteracaoPreco", count: 943 },
        { entity: "ClassificacaoProduto", count: 881 },
        { entity: "Embalagem", count: 824 },
        { entity: "SuspendeCompraProdutoUnidadeNegocio", count: 704 }
    ],
    menus: [
        { route: "Fiscal -> Nota Fiscal -> Nota Fiscal de Entrada", count: 51, risk: false },
        { route: "Cadastro Básico -> Produto -> Produto", count: 39, risk: false },
        { route: "Estoque -> Movimentação de Estoque", count: 18, risk: false },
        { route: "Compra -> Recebimento Físico", count: 16, risk: false },
        { route: "Ferramentas -> Alteração em Massa -> Produto", count: 15, risk: false },
        { route: "Fiscal -> Nota Fiscal -> Dicionário Fiscal de Produtos", count: 7, risk: false },
        { route: "Cadastro Básico -> Pessoa", count: 6, risk: false },
        { route: "Compra -> Custo de Produto", count: 6, risk: false },
        { route: "Compra -> Cadastros -> Fornecedor", count: 5, risk: false },
        { route: "Compra -> Sugestão de Compras", count: 4, risk: false },
        { route: "Cadastro Básico -> Produto -> Fabricante", count: 4, risk: false },
        { route: "Relatório -> Estoque -> Estoque", count: 4, risk: false },
        { route: "Ferramentas -> Guia de Medicamento", count: 3, risk: false },
        { route: "Ferramentas -> Log de Operações", count: 2, risk: true }
    ]
};

const FORENSIC_FINDINGS = [
    {
        id: "self_audit",
        title: "1. Autoauditoria no Módulo 'Log de Operações'",
        severity: "CRÍTICO",
        badgeClass: "pill-crimson",
        occurrences: "2 acessos",
        entity: "AcessoRecursoSistema",
        searchKey: "Log de Operações",
        summary: "O usuário auditado acessou diretamente a ferramenta de rastreamento de logs de operações do ERP em duas ocasiões distintas, sendo a última em 23/10/2026 às 14:33:06 (menos de 3 minutos antes do encerramento da trilha).",
        timestamps: "15/10/2026 09:41:12 • 23/10/2026 14:33:06",
        controlRef: "Controle SOX ITGC-04 (Segregação de Monitoramento de Logs)"
    },
    {
        id: "supplier_bypass",
        title: "2. Bypass de Conferência Automática de NFe em Fornecedor",
        severity: "CRÍTICO",
        badgeClass: "pill-crimson",
        occurrences: "9 registros",
        entity: "Fornecedor",
        searchKey: "ignorarConferencia",
        summary: "Inclusões e edições na entidade Fornecedor parametrizando ignorarConferenciaAutomaticaNotaFiscal=true e ignorarConferenciaAutomaticaNotaFiscalSequencial=true, desabilitando a trava sistêmica entre Pedido/Recebimento e NFe.",
        timestamps: "15/10/2026 10:42:18 • 16/10/2026 14:19:05 • 21/10/2026 11:08:44",
        controlRef: "Controle P2P-09 (Three-Way Match Fiscal & Recebimento)"
    },
    {
        id: "physical_reversal",
        title: "3. Estornos de Recebimento Físico de Mercadoria",
        severity: "ALTO",
        badgeClass: "pill-amber",
        occurrences: "8 estornos",
        entity: "EstornoItemRecebimentoFisico",
        searchKey: "",
        summary: "Reversão manual de itens já recebidos fisicamente nas filiais 0076 e 0023 sob as justificativas textuais 'RECEBIMENTO INCORRETO' e 'COD DIVERGENTE', impactando o saldo contábil-físico.",
        timestamps: "14/10/2026 15:22:11 (Filial 0076) • 19/10/2026 16:11:49 (Filial 0023)",
        controlRef: "Controle INV-03 (Estorno de Docas & Aprovação de Supervisão)"
    },
    {
        id: "clearance",
        title: "4. Liberações de Alçada em Compras Suspensas",
        severity: "ALTO",
        badgeClass: "pill-indigo",
        occurrences: "3 liberações",
        entity: "LiberacaoUsuario",
        searchKey: "",
        summary: "Uso de credencial para destravar recebimentos físicos de produtos com compra suspensa (liberacaoUsuarioRecebimentoFisicoSuspensoCompra) nas filiais 0039, 0077 e 0075.",
        timestamps: "14/10/2026 11:34:19 (0039) • 19/10/2026 14:22:08 (0077) • 20/10/2026 10:09:51 (0075)",
        controlRef: "Controle ALC-02 (Alçadas de Desbloqueio Comercial)"
    },
    {
        id: "manual_price",
        title: "5. Alterações Manuais de Preço de Venda (Origem = M)",
        severity: "MÉDIO",
        badgeClass: "pill-amber",
        occurrences: "943 alterações",
        entity: "AlteracaoPreco",
        searchKey: "",
        summary: "Modificações diretas de preço de venda (origem=M) e embalagens por filial (1.897 registros), incluindo reduções abaixo do preço referencial (ex: R$ 2,49 para R$ 2,25; R$ 18,90 para R$ 14,99).",
        timestamps: "Distribuído entre 14/10/2026 e 23/10/2026 em 32 unidades",
        controlRef: "Controle REV-06 (Governança de Pricing & Margem Bruta)"
    },
    {
        id: "invoice_stock",
        title: "6. Edição Direta de Quantidade em NFe e Saldos de Estoque",
        severity: "MÉDIO",
        badgeClass: "pill-amber",
        occurrences: "97 mov. estoque",
        entity: "ItemNotaFiscal",
        searchKey: "",
        summary: "Alterações em ItemNotaFiscal modificando quantidade de 12.0000 para 1.0000 com inversão proporcional de valorUnitario (26,6583 para 319,90), além de ajustes diretos na tabela Estoque (saldo 3 para 36).",
        timestamps: "14/10/2026 08:19:45 (Tx 560351332) • 14/10/2026 10:15:02",
        controlRef: "Controle FIS-01 (Integridade de Lançamento Fiscal de Entrada)"
    },
    {
        id: "xml_upload",
        title: "7. Importação Manual de Arquivos XML de Nota Fiscal",
        severity: "INFORMATIVO",
        badgeClass: "pill-emerald",
        occurrences: "3 arquivos XML",
        entity: "Arquivo",
        searchKey: ".xml",
        summary: "Upload manual de documentos fiscais eletrônicos XML com chaves de acesso de 44 dígitos diretamente para o repositório do banco de dados no Escritório Central (ESC).",
        timestamps: "15/10/2026 09:12:40 • 19/10/2026 11:04:19 • 21/10/2026 15:40:02",
        controlRef: "Controle FIS-08 (Rastreabilidade de Ingestão de DF-e)"
    }
];

const INITIAL_RECORDS = [
    // Autoauditoria de Log
    {
        dataHora: "23/10/2026 14:33:06", unNeg: "ESC", usuario: "CELSO BRENO SILVA DA COSTA",
        entidade: "AcessoRecursoSistema", operacao: "Inclusão",
        valorPosterior: "dataHora=23/10/2026 14:33:06.112;estacao=8300002002142;id=8300009941201;menu=Ferramentas -> Log de Operações;unidadeNegocio=3800000000001;usuario=3800147830607;",
        valorAnterior: "", revisao: "61982210", transacao: "565198440", versao: "0"
    },
    {
        dataHora: "15/10/2026 09:41:12", unNeg: "ESC", usuario: "CELSO BRENO SILVA DA COSTA",
        entidade: "AcessoRecursoSistema", operacao: "Inclusão",
        valorPosterior: "dataHora=15/10/2026 09:41:12.408;estacao=8300002002142;id=8300009890114;menu=Ferramentas -> Log de Operações;unidadeNegocio=3800000000001;usuario=3800147830607;",
        valorAnterior: "", revisao: "61480112", transacao: "561001290", versao: "0"
    },
    // Bypass NFe Fornecedor
    {
        dataHora: "15/10/2026 10:42:18", unNeg: "ESC", usuario: "CELSO BRENO SILVA DA COSTA",
        entidade: "Fornecedor", operacao: "Edição",
        valorPosterior: "id=3800159920144;pessoa=3800159920140;status=A;prazoEntrega=7;ignorarConferenciaAutomaticaNotaFiscal=true;ignorarConferenciaAutomaticaNotaFiscalSequencial=true;exigePedidoCompra=false;versao=2;",
        valorAnterior: "id=3800159920144;pessoa=3800159920140;status=A;prazoEntrega=7;ignorarConferenciaAutomaticaNotaFiscal=false;ignorarConferenciaAutomaticaNotaFiscalSequencial=false;exigePedidoCompra=true;versao=1;",
        revisao: "61488921", transacao: "561092341", versao: "2"
    },
    {
        dataHora: "16/10/2026 14:19:05", unNeg: "ESC", usuario: "CELSO BRENO SILVA DA COSTA",
        entidade: "Fornecedor", operacao: "Inclusão",
        valorPosterior: "id=3800160045112;pessoa=3800160045110;status=A;prazoEntrega=5;ignorarConferenciaAutomaticaNotaFiscal=true;ignorarConferenciaAutomaticaNotaFiscalSequencial=true;exigePedidoCompra=false;versao=0;",
        valorAnterior: "", revisao: "61541209", transacao: "561582910", versao: "0"
    },
    {
        dataHora: "21/10/2026 11:08:44", unNeg: "ESC", usuario: "CELSO BRENO SILVA DA COSTA",
        entidade: "Fornecedor", operacao: "Edição",
        valorPosterior: "id=3800160098231;pessoa=3800160098200;status=A;prazoEntrega=10;ignorarConferenciaAutomaticaNotaFiscal=true;ignorarConferenciaAutomaticaNotaFiscalSequencial=true;versao=4;",
        valorAnterior: "id=3800160098231;pessoa=3800160098200;status=A;prazoEntrega=10;ignorarConferenciaAutomaticaNotaFiscal=false;ignorarConferenciaAutomaticaNotaFiscalSequencial=false;versao=3;",
        revisao: "61812094", transacao: "563901122", versao: "4"
    },
    // Estornos de Recebimento Físico
    {
        dataHora: "14/10/2026 15:22:11", unNeg: "0076", usuario: "CELSO BRENO SILVA DA COSTA",
        entidade: "EstornoItemRecebimentoFisico", operacao: "Inclusão",
        valorPosterior: "dataHora=14/10/2026 15:22:11.309;id=7600018829101;itemRecebimentoFisico=7600018829055;motivo=RECEBIMENTO INCORRETO;quantidadeEstornada=24.0000;usuario=3800147830607;versao=0;",
        valorAnterior: "", revisao: "61439011", transacao: "560612980", versao: "0"
    },
    {
        dataHora: "19/10/2026 16:11:49", unNeg: "0023", usuario: "CELSO BRENO SILVA DA COSTA",
        entidade: "EstornoItemRecebimentoFisico", operacao: "Inclusão",
        valorPosterior: "dataHora=19/10/2026 16:11:49.772;id=2300029910441;itemRecebimentoFisico=2300029910400;motivo=COD DIVERGENTE;quantidadeEstornada=6.0000;usuario=3800147830607;versao=0;",
        valorAnterior: "", revisao: "61689201", transacao: "562781920", versao: "0"
    },
    {
        dataHora: "20/10/2026 11:48:03", unNeg: "0076", usuario: "CELSO BRENO SILVA DA COSTA",
        entidade: "EstornoItemRecebimentoFisico", operacao: "Inclusão",
        valorPosterior: "dataHora=20/10/2026 11:48:03.118;id=7600031120981;itemRecebimentoFisico=7600031120900;motivo=RECEBIMENTO INCORRETO;quantidadeEstornada=12.0000;usuario=3800147830607;versao=0;",
        valorAnterior: "", revisao: "61740129", transacao: "563109821", versao: "0"
    },
    // Liberações de Alçada
    {
        dataHora: "14/10/2026 11:34:19", unNeg: "0039", usuario: "CELSO BRENO SILVA DA COSTA",
        entidade: "LiberacaoUsuario", operacao: "Inclusão",
        valorPosterior: "dataHora=14/10/2026 11:34:19.044;id=3900009182311;regra=liberacaoUsuarioRecebimentoFisicoSuspensoCompra;unidadeNegocio=3900000000001;usuario=3800147830607;versao=0;",
        valorAnterior: "", revisao: "61420199", transacao: "560498211", versao: "0"
    },
    {
        dataHora: "19/10/2026 14:22:08", unNeg: "0077", usuario: "CELSO BRENO SILVA DA COSTA",
        entidade: "LiberacaoUsuario", operacao: "Inclusão",
        valorPosterior: "dataHora=19/10/2026 14:22:08.512;id=7700009184510;regra=liberacaoUsuarioRecebimentoFisicoSuspensoCompra;unidadeNegocio=7700000000001;usuario=3800147830607;versao=0;",
        valorAnterior: "", revisao: "61659012", transacao: "562519082", versao: "0"
    },
    {
        dataHora: "20/10/2026 10:09:51", unNeg: "0075", usuario: "CELSO BRENO SILVA DA COSTA",
        entidade: "LiberacaoUsuario", operacao: "Inclusão",
        valorPosterior: "dataHora=20/10/2026 10:09:51.890;id=7500009189920;regra=liberacaoUsuarioRecebimentoFisicoSuspensoCompra;unidadeNegocio=7500000000001;usuario=3800147830607;versao=0;",
        valorAnterior: "", revisao: "61729104", transacao: "563012944", versao: "0"
    },
    // Uploads XML
    {
        dataHora: "15/10/2026 09:12:40", unNeg: "ESC", usuario: "CELSO BRENO SILVA DA COSTA",
        entidade: "Arquivo", operacao: "Inclusão",
        valorPosterior: "id=3800991827361;nome=43261092762277000331550020000267181261903098.xml;tamanho=18492;tipoConteudo=text/xml;dataHoraUpload=15/10/2026 09:12:40;usuario=3800147830607;",
        valorAnterior: "", revisao: "61472011", transacao: "560981273", versao: "0"
    },
    {
        dataHora: "19/10/2026 11:04:19", unNeg: "ESC", usuario: "CELSO BRENO SILVA DA COSTA",
        entidade: "Arquivo", operacao: "Inclusão",
        valorPosterior: "id=3800991899102;nome=35260905075152000177550010012953791037428888.xml;tamanho=24110;tipoConteudo=text/xml;dataHoraUpload=19/10/2026 11:04:19;usuario=3800147830607;",
        valorAnterior: "", revisao: "61631099", transacao: "562301920", versao: "0"
    },
    // Preços Manuais (Origem = M)
    {
        dataHora: "14/10/2026 09:18:22", unNeg: "0076", usuario: "CELSO BRENO SILVA DA COSTA",
        entidade: "AlteracaoPreco", operacao: "Inclusão",
        valorPosterior: "dataHora=14/10/2026 09:18:22;embalagem=3800049182711;id=7600081920112;origem=M;precoReferencial=2.4900;precoVendaAnterior=2.4900;precoVendaPosterior=2.2500;produto=3800049182700;unidadeNegocio=7600000000001;usuario=3800147830607;",
        valorAnterior: "precoVendaAnterior=2.4900;origem=A;precoReferencial=2.4900;produto=3800049182700;",
        revisao: "61409821", transacao: "560398120", versao: "0"
    },
    {
        dataHora: "19/10/2026 15:12:44", unNeg: "0076", usuario: "CELSO BRENO SILVA DA COSTA",
        entidade: "AlteracaoPreco", operacao: "Inclusão",
        valorPosterior: "dataHora=19/10/2026 15:12:44;embalagem=3800019283741;id=7600082910445;origem=M;precoReferencial=18.9000;precoVendaAnterior=18.9000;precoVendaPosterior=14.9900;produto=3800019283700;unidadeNegocio=7600000000001;usuario=3800147830607;",
        valorAnterior: "precoVendaAnterior=18.9000;origem=A;precoReferencial=18.9000;produto=3800019283700;",
        revisao: "61670192", transacao: "562601928", versao: "0"
    },
    {
        dataHora: "20/10/2026 15:34:10", unNeg: "0074", usuario: "CELSO BRENO SILVA DA COSTA",
        entidade: "AlteracaoPreco", operacao: "Inclusão",
        valorPosterior: "dataHora=20/10/2026 15:34:10;embalagem=3800055192011;id=7400089120331;origem=M;precoReferencial=42.5000;precoVendaAnterior=42.5000;precoVendaPosterior=37.9000;produto=3800055192000;unidadeNegocio=7400000000001;usuario=3800147830607;",
        valorAnterior: "precoVendaAnterior=42.5000;origem=A;precoReferencial=42.5000;produto=3800055192000;",
        revisao: "61768210", transacao: "563409182", versao: "0"
    },
    // Exemplo de Cascata (#560351332)
    {
        dataHora: "14/10/2026 08:19:45", unNeg: "0076", usuario: "CELSO BRENO SILVA DA COSTA",
        entidade: "ItemNotaFiscal", operacao: "Edição",
        valorPosterior: "cfop=1102;embalagem=3800049182712;id=7600091827361;notaFiscal=7600019283711;produto=3800049182700;quantidade=1.0000;valorTotal=319.90;valorUnitario=319.9000;versao=2;",
        valorAnterior: "cfop=1102;embalagem=3800049182711;id=7600091827361;notaFiscal=7600019283711;produto=3800049182700;quantidade=12.0000;valorTotal=319.90;valorUnitario=26.6583;versao=1;",
        revisao: "61402190", transacao: "560351332", versao: "2"
    },
    {
        dataHora: "14/10/2026 08:19:45", unNeg: "0076", usuario: "CELSO BRENO SILVA DA COSTA",
        entidade: "CustoProduto", operacao: "Edição",
        valorPosterior: "custoMedio=319.9000;custoReposicao=319.9000;id=7600049182701;produto=3800049182700;unidadeNegocio=7600000000001;versao=14;",
        valorAnterior: "custoMedio=26.6583;custoReposicao=26.6583;id=7600049182701;produto=3800049182700;unidadeNegocio=7600000000001;versao=13;",
        revisao: "61402190", transacao: "560351332", versao: "14"
    },
    {
        dataHora: "14/10/2026 08:19:45", unNeg: "0076", usuario: "CELSO BRENO SILVA DA COSTA",
        entidade: "AtualizacaoCustoNotaFiscalUnidadeNegocio", operacao: "Exclusão",
        valorPosterior: "",
        valorAnterior: "custoAnterior=26.6583;id=7600088172610;notaFiscal=7600019283711;produto=3800049182700;unidadeNegocio=7600000000001;versao=1;",
        revisao: "61402190", transacao: "560351332", versao: "1"
    },
    {
        dataHora: "14/10/2026 10:15:02", unNeg: "0076", usuario: "CELSO BRENO SILVA DA COSTA",
        entidade: "Estoque", operacao: "Edição",
        valorPosterior: "estoque=36.0000;estoqueAnterior=3.0000;id=7600049182731;produto=3800049182700;tipoEstoque=1;unidadeNegocio=7600000000001;versao=19;",
        valorAnterior: "estoque=3.0000;estoqueAnterior=3.0000;id=7600049182731;produto=3800049182700;tipoEstoque=1;unidadeNegocio=7600000000001;versao=18;",
        revisao: "61412900", transacao: "560412901", versao: "19"
    },
    // Sessões e Terminais
    {
        dataHora: "14/10/2026 08:01:50", unNeg: "ESC", usuario: "CELSO BRENO SILVA DA COSTA",
        entidade: "SessaoUsuario", operacao: "Inclusão",
        valorPosterior: "IDSessao=492877715;dataHoraInicial=14/10/2026 08:01:50;estacao=8300002002142;id=8300009182100;unidadeNegocio=3800000000001;usuario=3800147830607;",
        valorAnterior: "", revisao: "61400001", transacao: "560340001", versao: "0"
    },
    {
        dataHora: "19/10/2026 08:00:57", unNeg: "0076", usuario: "CELSO BRENO SILVA DA COSTA",
        entidade: "SessaoUsuario", operacao: "Inclusão",
        valorPosterior: "IDSessao=1505801814;dataHoraInicial=19/10/2026 08:00:57;estacao=7600001004112;id=7600009512090;unidadeNegocio=7600000000001;usuario=3800147830607;",
        valorAnterior: "", revisao: "61600112", transacao: "562100491", versao: "0"
    },
    {
        dataHora: "20/10/2026 07:57:38", unNeg: "0074", usuario: "CELSO BRENO SILVA DA COSTA",
        entidade: "SessaoUsuario", operacao: "Inclusão",
        valorPosterior: "IDSessao=1698204119;dataHoraInicial=20/10/2026 07:57:38;estacao=7400001002091;id=7400009712300;unidadeNegocio=7400000000001;usuario=3800147830607;",
        valorAnterior: "", revisao: "61710004", transacao: "562900112", versao: "0"
    },
    {
        dataHora: "14/10/2026 08:01:51", unNeg: "ESC", usuario: "CELSO BRENO SILVA DA COSTA",
        entidade: "Estacao", operacao: "Edição",
        valorPosterior: "id=8300002002142;identificacao=GHFESC-WD-0096:Windows 10;identificacaoInstalacaoSO=0084-13C3#0000_0000_0000_0000_ACE4_2E00_4155_4698.;ultimoAcesso=14/10/2026 08:01:51;versao=412;",
        valorAnterior: "id=8300002002142;identificacao=GHFESC-WD-0096:Windows 10;identificacaoInstalacaoSO=0084-13C3#0000_0000_0000_0000_ACE4_2E00_4155_4698.;ultimoAcesso=13/10/2026 17:58:10;versao=411;",
        revisao: "61400002", transacao: "560340002", versao: "412"
    }
];
