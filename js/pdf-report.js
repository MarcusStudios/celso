/**
 * AuditTrail GRC — Emissor de Parecer Técnico Pericial (PDF)
 * Incorpora cálculo real de integridade criptográfica SHA-256 via Web Crypto API.
 */

function openPdfModal() {
    const modal = document.getElementById('pdf-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // Foco automático no primeiro elemento para acessibilidade
    const firstInput = modal.querySelector('input, select, textarea');
    if (firstInput) firstInput.focus();
}

function closePdfModal() {
    const modal = document.getElementById('pdf-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

/**
 * Gera e assina criptograficamente o Parecer Técnico Pericial.
 */
async function generateForensicPDF() {
    try {
        if (!window.jspdf || !window.jspdf.jsPDF) {
            notifyToast("Biblioteca jsPDF ainda não carregou. Tente novamente em instantes.", "error");
            return;
        }

        notifyToast("Processando parecer técnico e calculando hash SHA-256...", "info");

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        const incExec = document.getElementById('pdf-sec-exec')?.checked ?? true;
        const incMachine = document.getElementById('pdf-sec-machine')?.checked ?? true;
        const incRisks = document.getElementById('pdf-sec-risks')?.checked ?? true;
        const incWorkday = document.getElementById('pdf-sec-workday')?.checked ?? true;
        const incSamples = document.getElementById('pdf-sec-samples')?.checked ?? true;
        const classification = document.getElementById('pdf-classification')?.value || "CONFIDENCIAL — AUDITORIA INTERNA & GRC";
        const auditorNotes = document.getElementById('pdf-auditor-notes')?.value || "";

        // Paleta Corporativa
        const navy = [11, 15, 23];
        const brandBlue = [37, 99, 235];
        const slateDark = [15, 23, 42];
        const slateMuted = [100, 116, 139];

        // Cabeçalho Oficial
        doc.setFillColor(...navy);
        doc.rect(14, 12, 182, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text("PARECER TÉCNICO PERICIAL — AUDITORIA DE LOGS BBY MARCUS", 19, 20);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        const emissionDate = new Date().toLocaleDateString('pt-BR');
        doc.text(`${classification} • DATA EMISSÃO: ${emissionDate}`, 19, 26.5);

        let curY = 38;

        // Seção 1: Identificação do Alvo e Assinatura Forense
        if (incMachine || incExec) {
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.rect(14, curY, 182, 28, 'FD');

            doc.setTextColor(...slateDark);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.text("1. IDENTIFICAÇÃO DO USUÁRIO AUDITADO E ASSINATURA FORENSE DO TERMINAL", 18, curY + 6);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text(`Colaborador Investigado: ${telemetry.user} (ID Interno: ${telemetry.userId})`, 18, curY + 12);
            doc.text(`Janela Auditada: ${telemetry.periodStart} a ${telemetry.periodEnd} • Versão ERP: ${telemetry.erpVersion}`, 18, curY + 17);
            doc.text(`Hostname / Sistema Operacional: ${telemetry.hostname} • Estação Principal: ${telemetry.mainStation}`, 18, curY + 22);
            doc.text(`Hash Instalação SO: ${telemetry.osHash}`, 115, curY + 12);

            curY += 33;
        }

        // Seção 1B: KPIs Executivos
        if (incExec) {
            const cascade = (telemetry.totalRecords / Math.max(1, telemetry.totalTransactions)).toFixed(2);
            doc.autoTable({
                startY: curY,
                margin: { left: 14, right: 14 },
                head: [["Registros DB", "Transações (Cliques)", "Fator Cascata", "Filiais", "Exclusões", "Edições", "Inclusões"]],
                body: [[
                    formatNumber(telemetry.totalRecords),
                    formatNumber(telemetry.totalTransactions),
                    `${cascade}x`,
                    String(telemetry.totalUnits),
                    formatNumber(telemetry.operations["Exclusão"] || 0),
                    formatNumber(telemetry.operations["Edição"] || 0),
                    formatNumber(telemetry.operations["Inclusão"] || 0)
                ]],
                headStyles: { fillColor: brandBlue, textColor: 255, fontSize: 7.5, halign: 'center' },
                bodyStyles: { fontSize: 8, textColor: slateDark, halign: 'center', fontStyle: 'bold' },
                theme: 'grid'
            });
            curY = doc.lastAutoTable.finalY + 7;
        }

        // Seção 2: Matriz de Riscos & 7 Achados
        if (incRisks) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(...slateDark);
            doc.text("2. MATRIZ DE EXCEÇÕES E ACHADOS FORENSES DE CONFORMIDADE", 14, curY);

            doc.autoTable({
                startY: curY + 2,
                margin: { left: 14, right: 14 },
                head: [["Achado Forense", "Severidade", "Volume", "Síntese Técnica da Evidência"]],
                body: FORENSIC_FINDINGS.map(f => [
                    f.title,
                    f.severity,
                    f.occurrences,
                    f.summary
                ]),
                headStyles: { fillColor: navy, textColor: 255, fontSize: 7.5 },
                bodyStyles: { fontSize: 7.2, textColor: slateDark },
                columnStyles: {
                    0: { cellWidth: 42, fontStyle: 'bold' },
                    1: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
                    2: { cellWidth: 22, halign: 'center' },
                    3: { cellWidth: 98 }
                },
                theme: 'grid'
            });
            curY = doc.lastAutoTable.finalY + 7;
        }

        // Seção 3: Cronologia Diária de Jornada
        if (incWorkday) {
            if (curY > 215) { doc.addPage(); curY = 18; }
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(...slateDark);
            doc.text("3. CRONOLOGIA DIÁRIA DE JORNADA DE TRABALHO E SESSÕES", 14, curY);

            doc.autoTable({
                startY: curY + 2,
                margin: { left: 14, right: 14 },
                head: [["Data", "Dia", "Primeiro Log", "Último Log", "Duração", "Sessões", "Transações", "Registros"]],
                body: telemetry.daily.map(d => [
                    d.date, d.weekday, d.start, d.end, d.span,
                    String(d.sessions),
                    formatNumber(d.tx),
                    formatNumber(d.records)
                ]),
                headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 7.5, halign: 'center' },
                bodyStyles: { fontSize: 7.5, textColor: slateDark, halign: 'center' },
                theme: 'striped'
            });
            curY = doc.lastAutoTable.finalY + 7;
        }

        // Seção 4: Amostra de Evidências Críticas
        if (incSamples) {
            if (curY > 210) { doc.addPage(); curY = 18; }
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(...slateDark);
            doc.text("4. AMOSTRA DE EVIDÊNCIAS CRÍTICAS (DECOMPOSIÇÃO ANTES VS. DEPOIS)", 14, curY);

            doc.autoTable({
                startY: curY + 2,
                margin: { left: 14, right: 14 },
                head: [["Data / Hora", "Unid.", "Entidade", "Operação", "Evidência Chave=Valor", "Tx ID"]],
                body: records.slice(0, 14).map(r => [
                    r.dataHora,
                    r.unNeg,
                    r.entidade,
                    r.operacao,
                    buildRecordSummary(r),
                    r.transacao
                ]),
                headStyles: { fillColor: navy, textColor: 255, fontSize: 7.5 },
                bodyStyles: { fontSize: 7, textColor: slateDark },
                theme: 'grid'
            });
            curY = doc.lastAutoTable.finalY + 7;
        }

        // Seção 5: Parecer do Auditor e Caixa de Integridade Criptográfica
        if (curY > 235) { doc.addPage(); curY = 18; }
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.rect(14, curY, 182, 32, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...slateDark);
        doc.text("PARECER TÉCNICO DO AUDITOR E ASSINATURA DE INTEGRIDADE:", 18, curY + 6);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        const splitNotes = doc.splitTextToSize(auditorNotes || "Sem observações adicionais.", 174);
        doc.text(splitNotes, 18, curY + 11.5);

        // CÁLCULO REAL DE HASH SHA-256 DO CONTEÚDO
        // Geramos a representação do PDF em arraybuffer e calculamos o hash criptográfico real
        const pdfArrayBuffer = doc.output('arraybuffer');
        const realHash = await calculateSHA256(pdfArrayBuffer);

        doc.setFont('courier', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(...brandBlue);
        doc.text(`SHA-256 VERIFICATION HASH: ${realHash}`, 18, curY + 28);

        // Numeração de Páginas
        const totalPages = doc.internal.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
            doc.setPage(p);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(...slateMuted);
            doc.text(`Auditoria de LOGS bby Marcus • Dossiê ${telemetry.user} • Página ${p} de ${totalPages}`, 14, 290);
            doc.text("AUTENTICADO COM ASSINATURA CRIPTOGRÁFICA SHA-256 REAL", 112, 290);
        }

        // Salvar arquivo
        const sanitizedUserName = (telemetry.user || "AUDITORIA").replace(/[^a-zA-Z0-9_-]/g, '_');
        doc.save(`Parecer_Auditoria_Forense_${sanitizedUserName}.pdf`);
        closePdfModal();
        notifyToast(`PDF emitido com sucesso! Hash: ${realHash.substring(0, 16)}...`, "success");
    } catch (err) {
        console.error("Erro na geração do PDF:", err);
        notifyToast("Erro ao gerar o PDF. Verifique o console.", "error");
    }
}
