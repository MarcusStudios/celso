# AuditTrail GRC — Plataforma de Perícia Forense & Governança ERP

Plataforma analítica client-side de alta performance para auditoria forense, governança, riscos e conformidade (GRC / SOX / ISO 27001) a partir de trilhas de auditoria e logs transacionais extraídos de bancos de dados de sistemas ERP.

---

## 🎯 Objetivo & Capacidades

- **Decomposição Forense de Mutações (Antes vs. Depois):** Análise comparativa campo a campo de alterações de preços, embalagens, fatores de conversão, regras fiscais e cadastros de fornecedores.
- **Detecção Automatizada de Exceções & Anomalias:**
  1. Autoauditoria no módulo de Logs de Operações (tentativa de monitorar a própria auditoria).
  2. *Bypass* de conferência automática de NFe de fornecedor (*Three-Way Match* desabilitado).
  3. Estornos manuais de recebimento físico de mercadorias em docas.
  4. Liberações manuais de alçada em compras/recebimentos suspensos.
  5. Alterações de preço de venda e margens por filial (*Origem manual*).
  6. Edição direta em itens de notas fiscais e saldos físicos de estoque.
  7. Alterações em embalagens, códigos de barras EAN e fatores de conversão.
  8. Importação manual de arquivos XML de notas fiscais eletrônicas.
  9. Atividades fora do horário comercial / fins de semana (operações noturnas anômalas).
  10. Exclusões de registros no banco de dados.
- **Rastreabilidade de Jornada & Sessões:** Linha do tempo de expediente diário (24h), estações de trabalho autenticadas e telemetria de navegação de menus do ERP.
- **Parecer Técnico Pericial (PDF):** Geração de laudo pericial formal para auditoria interna, comitês de ética ou judiciário, amostragem qualificada e conferência criptográfica SHA-256.
- **Exportação Segura:** Exportação em planilha nativa Excel (`.xlsx`) e CSV enriquecido com sanitização contra *CSV / Formula Injection*.

---

## 🔒 Arquitetura & Segurança Forense

- **Processamento 100% Local (Client-Side):** Nenhum dado ou planilha trafega para servidores externos, garantindo aderência estrita à **LGPD** e sigilo de investigação corporativa.
- **Cadeia de Custódia Criptográfica:**
  - Hash SHA-256 do arquivo original calculado via Web Crypto API no momento da ingestão.
  - Hash SHA-256 do conjunto canônico de evidências para atestar não-adulteração.
- **Proteção contra Injeção de Fórmulas e XSS:**
  - Manipulação segura do DOM via delegação de eventos (*Event Delegation*).
  - Sanitização de fórmulas (`=`, `+`, `-`, `@`) nas exportações CSV (RFC 4180).

---

## 📊 Formato Esperado da Planilha de Auditoria

A aplicação aceita arquivos `.xlsx`, `.xls` ou `.csv` contendo as seguintes colunas (a ordem é indiferente; os cabeçalhos são normalizados automaticamente):

| Cabeçalho Recomendado | Variações Aceitas | Descrição |
|---|---|---|
| `Data / Hora` | `DataHora`, `Data`, `Timestamp` | Data e hora do evento (ex: `14/10/2026 08:01:23` ou ISO `2026-10-14 08:01:23`) |
| `Unidade Negócio` | `UnNeg`, `Filial`, `Unidade` | Código ou sigla da unidade/filial (ex: `ESC`, `01`, `02`) |
| `Usuário` | `Usuario`, `User`, `Colaborador` | Nome ou login do colaborador auditado |
| `Entidade` | `Entidade`, `Tabela`, `Objeto` | Tabela ou objeto mutacionado no ERP (ex: `AlteracaoPreco`, `ItemNotaFiscal`) |
| `Operação` | `Operacao`, `TipoOperacao`, `Acao` | Tipo de operação: `Inclusão`, `Edição`, `Exclusão` |
| `Valor Anterior` | `ValorAnterior`, `Antes`, `ValorAntigo` | String estruturada `chave=valor;` com os dados antes da alteração |
| `Valor Posterior` | `ValorPosterior`, `Depois`, `NovoValor` | String estruturada `chave=valor;` com os dados após a alteração |
| `Transação` | `Transacao`, `Tx`, `TransacaoID` | Identificador único da transação de banco de dados |
| `Revisão` | `Revisao`, `Rev` | Número sequencial de revisão do registro |
| `Versão` | `Versao`, `Version` | Versão de schema ou build do ERP |

---

## 🚀 Como Executar

Por ser uma aplicação web puramente client-side, basta abrir o arquivo `index.html` em qualquer navegador web moderno:

1. **Opção 1 — Servidor Local (Recomendado):**
   ```bash
   # Com Python:
   python -m http.server 8080

   # Com Node.js / npx:
   npx serve .
   ```
   Acesse: `http://localhost:8080`

2. **Opção 2 — Execução Direta:**
   Abra diretamente o arquivo `index.html` no seu navegador (Edge, Chrome, Firefox, Safari).

---

## 📁 Estrutura de Arquivos

```
celso/
├── index.html                 # Interface unificada da aplicação
├── css/
│   └── styles.css             # Design system corporativo e utilitários visuais
├── js/
│   ├── utils.js               # Segurança (XSS, SHA-256), debounce e parsers
│   ├── diff-engine.js         # Decomposição de atributos antes vs. depois
│   ├── charts.js              # Gráficos Chart.js (Volume, Curva 24h, Filiais, Tabelas)
│   ├── pdf-report.js          # Gerador pericial de PDF com cadeia de custódia
│   ├── ingestion.js           # Motor de leitura SheetJS, hashing e regras de risco
│   └── app.js                 # Controlador principal e delegação de eventos
├── data/
│   └── initial-telemetry.js   # Estado inicial e contratos de modelo de dados
└── .gitignore                 # Exclusão estrita de planilhas locais confidenciais
```

---

## ⚖️ Conformidade e Normas Suportadas

- **SOX (Sarbanes-Oxley):** Controles de acesso a logs (*ITGC-04*), segregação de funções (*SoD*) e conciliação *Three-Way Match* (*P2P-09*).
- **ISO/IEC 27001:** Trilha de auditoria inalterável (A.12.4 - Registro e Monitoramento).
- **LGPD (Lei 13.709/2018):** Minimização de dados, tratamento em ambiente estritamente local e confidencialidade pericial.
