/*
 * download-handler.js (v2 - CORRIGIDO Paginação e Centralização)
 * Lógica para os botões de download na sidebar.
 * Requer jsPDF e html2canvas carregados.
 * Inclui lógica para expandir conteúdo com scroll para captura.
 * Refina impressão de títulos e paginação no PDF.
 * Centraliza gráficos horizontalmente.
 */

const DownloadHandler = (() => {

    // --- Referências aos Elementos da Sidebar ---
    let sidebar = null; let btnPdfAll = null; let btnPdfDim = null;
    let inputPdfDim = null; let btnPng = null; let btnJson = null;

    // --- Funções Auxiliares ---

    const triggerDownload = (blob, filename) => { /* ... (código anterior sem mudanças) ... */
        if (!blob) { console.error("triggerDownload: Blob inválido para", filename); alert(`Erro ao criar ${filename}.`); return; } try { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.style.display = 'none'; a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); console.log(`Download iniciado: ${filename}`); } catch (error) { console.error("Erro download:", error); alert(`Falha download ${filename}.`); }
     };

    const getVisibleSquares = (dimensionNumber = null) => { /* ... (código anterior sem mudanças) ... */
        const selector = dimensionNumber ? `.grid-container .square[data-dimension-number="${dimensionNumber}"]` : '.grid-container .square'; const squaresNodeList = document.querySelectorAll(selector); const squaresArray = Array.from(squaresNodeList);
        return squaresArray.filter(el => window.getComputedStyle(el).display !== 'none').sort((a, b) => {
             const idA = a.dataset.id || ''; const idB = b.dataset.id || ''; const partsA = idA.split('_'); const partsB = idB.split('_'); const numericPartA = partsA[0]; const numericPartB = partsB[0];
             if (numericPartA !== numericPartB) { const numPartsA = numericPartA.split('.').map(n => parseInt(n, 10)); const numPartsB = numericPartB.split('.').map(n => parseInt(n, 10)); for (let i = 0; i < Math.max(numPartsA.length, numPartsB.length); i++) { let valA = numPartsA[i]; let valB = numPartsB[i]; if (isNaN(valA) || isNaN(valB)) { const strNumA = String(numericPartA).split('.')[i] || ''; const strNumB = String(numericPartB).split('.')[i] || ''; if (isNaN(valA) && isNaN(valB)){ if (strNumA !== strNumB) return strNumA.localeCompare(strNumB); } else return isNaN(valA) ? 1 : -1; } else if (valA !== valB) { return valA - valB; } } }
             const categoryA = partsA.slice(1).join('_') || ''; const categoryB = partsB.slice(1).join('_') || ''; if (categoryA !== categoryB) { return categoryA.localeCompare(categoryB); } return 0; });
     };

    const prepareForCapture = (element) => { /* ... (código anterior sem mudanças) ... */ if (!element) return; element.classList.add('capture-full-content'); };
    const cleanupAfterCapture = (element) => { /* ... (código anterior sem mudanças) ... */ if (!element) return; element.classList.remove('capture-full-content'); };
    const createLoadingOverlay = (text) => { /* ... (código anterior sem mudanças) ... */
         const overlay = document.createElement('div'); overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(255, 255, 255, 0.85); display: flex; justify-content: center; align-items: center; z-index: 10000; font-size: 1.5em; color: #333;'; overlay.innerHTML = `<span style="padding: 20px 30px; background: #fff; border-radius: 5px; box-shadow: 0 3px 8px rgba(0,0,0,0.2); text-align: center;">${text}</span>`; overlay.classList.add('capture-overlay'); document.body.appendChild(overlay); return overlay;
     };

    // --- Lógica dos Downloads ---

    // 1. Download JSON Completo (SEM MUDANÇAS)
    const downloadCompleteJson = () => { /* ... (código anterior sem mudanças) ... */
        console.log("Iniciando download do JSON completo..."); try { const dadosCompletos = JSON.parse(localStorage.getItem("dadosCompletos")) || {}; const currentChartInstances = window.charts || {}; const storedSchoolInfo = localStorage.getItem("schoolInfo"); let schoolInfo = null; if (storedSchoolInfo) { try { schoolInfo = JSON.parse(storedSchoolInfo); } catch (e) { console.error("Erro parse schoolInfo:", e); } } const dataToSave = { originalData: { TabelaConsulta: dadosCompletos.TabelaConsulta || [], DemaisTabelas: dadosCompletos.DemaisTabelas || {} }, schoolInfo: schoolInfo || {}, chartConfigs: {} }; for (const key in currentChartInstances) { if (Object.hasOwnProperty.call(currentChartInstances, key)) { const instance = currentChartInstances[key]; let configToSave = null; if (instance instanceof Chart && instance.currentOptions) { try { configToSave = JSON.parse(JSON.stringify(instance.currentOptions)); } catch (e) { console.warn(`Erro serializar currentOptions ${key}. Tentando fallback...`, e); try { configToSave = JSON.parse(JSON.stringify(instance.config.options || {})); configToSave.error_fallback = "Usando config.options"; } catch (e2) { console.error(`Erro fallback ${key}:`, e2); configToSave = { error: "Falha ao serializar opções" }; } } } else if (instance.options && instance.type && instance.type.includes('table')) { try { configToSave = JSON.parse(JSON.stringify(instance.options)); if (instance.type === 'response-table' && instance.data) { configToSave._currentData = JSON.parse(JSON.stringify(instance.data)); } } catch (e) { console.warn(`Erro serializar tabela ${key}:`, e); configToSave = { error: "Falha ao serializar tabela" }; } } else { console.warn(`Instância desconhecida ${key}.`); } if (configToSave) { dataToSave.chartConfigs[key] = configToSave; } } } const jsonString = JSON.stringify(dataToSave, null, 2); const blob = new Blob([jsonString], { type: 'application/json' }); triggerDownload(blob, 'visualizacao_completa_config.json'); } catch (error) { console.error("Erro gerar JSON:", error); alert("Erro ao gerar o arquivo JSON."); }
     };

    // 2. Download PNGs (SEM MUDANÇAS)
    const downloadPngs = async () => { /* ... (código anterior sem mudanças) ... */
        console.log("Iniciando download PNGs..."); if (typeof html2canvas === 'undefined') { alert("Erro: html2canvas não carregada."); return; } const squares = getVisibleSquares(); if (squares.length === 0) { alert("Nenhuma visualização visível."); return; } alert(`Preparando ${squares.length} imagem(ns) PNG...`); const loadingOverlay = createLoadingOverlay('Gerando Imagens...'); try { for (const square of squares) { const dataId = square.dataset.id || `imagem_${squares.indexOf(square) + 1}`; const filename = `grafico_${dataId}.png`; console.log(`Gerando PNG para ${dataId}...`); prepareForCapture(square); try { const canvas = await html2canvas(square, { scale: 1.5, useCORS: true, logging: false, backgroundColor: '#ffffff' }); const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png')); triggerDownload(blob, filename); } catch (err) { console.error(`Erro PNG ${dataId}:`, err); alert(`Falha imagem ${dataId}.`); } finally { cleanupAfterCapture(square); } await new Promise(resolve => setTimeout(resolve, 300)); } console.log("Downloads PNG concluídos."); alert("Geração PNG concluída."); } catch (error) { console.error("Erro PNG:", error); alert("Erro geral ao gerar PNGs."); } finally { if (loadingOverlay && loadingOverlay.parentNode) { document.body.removeChild(loadingOverlay); } }
     };

    // 3. Download PDF (REFINADO)
    const downloadPdf = async (dimensionNumber = null) => {
        const context = dimensionNumber ? `Dimensão ${dimensionNumber}` : "Todas as Dimensões";
        console.log(`Iniciando geração do PDF para: ${context}...`);

        if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') { alert("Erro: Bibliotecas jsPDF ou html2canvas não carregadas."); return; }

        const squares = getVisibleSquares(dimensionNumber);
        if (squares.length === 0) { alert(`Nenhuma visualização encontrada para ${context}.`); return; }
        alert(`Gerando PDF com ${squares.length} visualização(ões) para ${context}. Isso pode levar um momento...`);

        const loadingOverlay = createLoadingOverlay(`Gerando PDF (${context})...`);

        const { jsPDF } = jspdf;
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const pageMargin = 15;
        const pageWidth = pdf.internal.pageSize.getWidth() - (pageMargin * 2);
        const pageHeight = pdf.internal.pageSize.getHeight();
        const pageContentHeight = pageHeight - (pageMargin * 2);
        let currentY = pageMargin; // Usar variável local simples
        const titleFontSize = 14;
        const subtitleFontSize = 12;
        const titleMarginBottom = 6;
        const subtitleMarginBottom = 4;
        const itemMarginTop = 8;
        // Estimativa de altura razoável para uma imagem de square (ajuste se necessário)
        // Usar uma fração da altura útil da página pode ser mais robusto que adivinhar pixels
        const estimatedImageHeight = pageContentHeight * 0.6; // Ex: 60% da altura útil

        const addNewPage = () => {
            pdf.addPage();
            currentY = pageMargin;
            console.log("  -> Nova página adicionada.");
            return true; // Indica que a página foi adicionada
        };

        // --- Função para CALCULAR altura dos títulos SEM adicionar ao PDF ---
        const calculateTitlesHeight = (pdfInstance, itemData, lastDim, lastInd) => {
             let height = 0;
             const itemDim = itemData.dimensionNumber;
             const itemInd = itemData.indicatorNumber;
             const itemIndFullId = itemInd ? `${itemDim}.${itemInd}` : null;
             const needsDimTitle = itemDim && itemDim !== 'none' && itemDim !== lastDim;
             const needsIndTitle = itemIndFullId && (itemIndFullId !== lastInd || needsDimTitle); // Add Ind se Dim mudou

             if (needsDimTitle) {
                 const dimTitle = itemData.dimensionName || `Dimensão ${itemDim}`;
                 height += pdfInstance.getTextDimensions(dimTitle, { fontSize: titleFontSize, maxWidth: pageWidth }).h + titleMarginBottom;
             }
             if (needsIndTitle) {
                 const indTitle = itemData.indicatorName || `Indicador ${itemInd}`;
                 height += pdfInstance.getTextDimensions(indTitle, { fontSize: subtitleFontSize, maxWidth: pageWidth }).h + subtitleMarginBottom;
             }
             return height;
         };

        let currentDimensionNumber = '';
        let currentIndicatorNumber = '';

         // --- Função para ADICIONAR títulos e atualizar Y ---
         const addTitlesAndUpdateY = (pdfInstance, itemData, lastDim, lastInd) => {
             let addedHeight = 0;
             let dimensionChanged = false;
             let lastDimWritten = lastDim; // Usa cópias locais para retornar o estado atualizado
             let lastIndWritten = lastInd;
             const itemDim = itemData.dimensionNumber;
             const itemInd = itemData.indicatorNumber;
             const itemIndFullId = itemInd ? `${itemDim}.${itemInd}` : null;
             const needsDimTitle = itemDim && itemDim !== 'none' && currentDimensionNumber !== itemDim;
             const needsIndTitle = itemIndFullId && (currentIndicatorNumber !== itemIndFullId || needsDimTitle); // Add Ind se Dim mudou

             pdfInstance.setFont(undefined, 'normal'); // Reset font
             console.log(itemIndFullId);
             console.log(currentIndicatorNumber);
             console.log(needsIndTitle)
             if (needsDimTitle) {
                 const dimTitle = itemData.dimensionName || `Dimensão ${itemDim}`;
                 const titleHeight = pdfInstance.getTextDimensions(dimTitle, { fontSize: titleFontSize, maxWidth: pageWidth }).h;
                 pdfInstance.setFontSize(titleFontSize).setTextColor(50, 50, 50).setFont(undefined, 'bold');
                 pdfInstance.text(dimTitle, pdfInstance.internal.pageSize.getWidth() / 2, currentY, { align: 'center', maxWidth: pageWidth });
                 currentY += titleHeight + titleMarginBottom;
                 addedHeight += titleHeight + titleMarginBottom;
                 lastDimWritten = itemDim; // Atualiza o último escrito
                 dimensionChanged = true;
                 currentDimensionNumber = lastDimWritten;
             }
             if (needsIndTitle) {
                 const indTitle = itemData.indicatorName || `Indicador ${itemInd}`;
                 const subtitleHeight = pdfInstance.getTextDimensions(indTitle, { fontSize: subtitleFontSize, maxWidth: pageWidth }).h;
                 pdfInstance.setFontSize(subtitleFontSize).setTextColor(80, 80, 80).setFont(undefined, 'normal');
                 pdfInstance.text(indTitle, pdfInstance.internal.pageSize.getWidth() / 2, currentY, { align: 'center', maxWidth: pageWidth });
                 currentY += subtitleHeight + subtitleMarginBottom;
                 addedHeight += subtitleHeight + subtitleMarginBottom;
                 lastIndWritten = itemIndFullId; // Atualiza o último escrito
                 currentIndicatorNumber = lastIndWritten;
             }
             return { addedHeight, newLastDim: lastDimWritten, newLastInd: lastIndWritten }; // Retorna altura e estado atualizado
         };


        // --- Capa do PDF ---
        try { /* ... (código da capa igual ao anterior) ... */
            let schoolInfo = { name: 'N/A', city: 'N/A', state: 'N/A', responsible: 'N/A' }; const storedSchoolInfo = localStorage.getItem("schoolInfo"); if (storedSchoolInfo) { try { schoolInfo = JSON.parse(storedSchoolInfo); } catch (e) {} } const respondentCounts = {}; const dadosCompletos = JSON.parse(localStorage.getItem("dadosCompletos")); if (dadosCompletos && dadosCompletos.DemaisTabelas) { for (const [fileName, table] of Object.entries(dadosCompletos.DemaisTabelas)) { const groupName = fileName.replace(/\.(xlsx?|csv)$/i, ""); const count = (table || []).slice(1).filter(row => row?.some(cell => cell != null && String(cell).trim() !== '')).length; respondentCounts[groupName] = count; } } const explanatoryText = "Este documento apresenta os resultados consolidados..."; pdf.setFontSize(18).setFont(undefined, 'bold'); pdf.text("Relatório dos Indicadores", pdf.internal.pageSize.getWidth() / 2, currentY + 10, { align: 'center' }); currentY += 30; pdf.setFontSize(12).setFont(undefined, 'bold'); pdf.text("Escola:", pageMargin, currentY); pdf.setFont(undefined, 'normal'); pdf.text(schoolInfo.name || 'N/A', pageMargin + 35, currentY); currentY += 7; pdf.setFont(undefined, 'bold'); pdf.text("Local:", pageMargin, currentY); pdf.setFont(undefined, 'normal'); pdf.text(`${schoolInfo.city || 'N/A'} / ${schoolInfo.state || 'N/A'}`, pageMargin + 35, currentY); currentY += 7; pdf.setFont(undefined, 'bold'); pdf.text("Responsável:", pageMargin, currentY); pdf.setFont(undefined, 'normal'); pdf.text(schoolInfo.responsible || 'N/A', pageMargin + 35, currentY); currentY += 14; pdf.setFontSize(11).setFont(undefined, 'bold'); pdf.text("Total de Respondentes por Grupo:", pageMargin, currentY); currentY += 6; pdf.setFont(undefined, 'normal'); for (const [group, count] of Object.entries(respondentCounts)) { pdf.text(`${group}: ${count}`, pageMargin + 5, currentY); currentY += 5; } currentY += 10; pdf.setFontSize(10).setFont(undefined, 'normal'); const splitText = pdf.splitTextToSize(explanatoryText, pageWidth); pdf.text(splitText, pageMargin, currentY); currentY += (splitText.length * 4) + 10;
        } catch (coverError) { /* ... (tratamento de erro da capa) ... */ console.error("Erro capa PDF:", coverError); pdf.setTextColor(255,0,0).setFontSize(10); pdf.text("Erro capa.", pageMargin, currentY); pdf.setTextColor(0,0,0); currentY += 10; }

        // --- Adiciona Conteúdo (Gráficos) ---
        addNewPage(); // Sempre começa os gráficos em uma nova página após a capa
        let lastDimWritten = null;
        let lastIndWritten = null;

        try {
            for (let i = 0; i < squares.length; i++) {
                const square = squares[i];
                const dataId = square.dataset.id;
                const itemData = window.visualizacaoData?.[dataId];
                if (!itemData) continue;

                console.log(`Processando ${dataId}... Start Y:${currentY.toFixed(1)}`);

                // 1. Calcular altura *potencial* dos títulos
                const potentialTitlesHeight = calculateTitlesHeight(pdf, itemData, lastDimWritten, lastIndWritten);

                // 2. Calcular altura total estimada para o próximo item
                const topMargin = (currentY > pageMargin) ? itemMarginTop : 0; // Adiciona margem se não for o primeiro da página
                const totalNeededHeight = topMargin + potentialTitlesHeight + estimatedImageHeight;

                // 3. Verificar se cabe na página ATUAL
                let needsNewPage = (currentY + totalNeededHeight) > (pageHeight - pageMargin);

                // 4. Adicionar nova página SE necessário
                if (needsNewPage) {
                    addNewPage(); // Reseta currentY para pageMargin
                    // Se adicionou nova página, reseta os últimos títulos escritos para forçar reescrita
                    lastDimWritten = null;
                    lastIndWritten = null;
                     console.log(` -> Nova página ANTES de ${dataId}`);
                } else if (currentY > pageMargin) {
                    // Adiciona margem superior se não for o primeiro item e não pulou página
                    currentY += itemMarginTop;
                }

                // 5. Adicionar Títulos (agora que sabemos que há espaço ou estamos em nova página)
                //    Atualiza currentY e lastDim/IndWritten
                const { newLastDim, newLastInd } = addTitlesAndUpdateY(
                    pdf, itemData, lastDimWritten, lastIndWritten
                );
                lastDimWritten = newLastDim;
                lastIndWritten = newLastInd;

                // 6. Adicionar Imagem
                prepareForCapture(square);
                let imgHeightPDF = 0;
                let imgWidthPDF = pageWidth; // Começa com largura total

                try {
                    const canvas = await html2canvas(square, { scale: 3, useCORS: true, logging: false, backgroundColor: '#ffffff' });
                    const imgData = canvas.toDataURL('image/jpeg', 0.8);
                    const imgProps = pdf.getImageProperties(imgData);
                    const imgRatio = imgProps.height / imgProps.width;
                    imgHeightPDF = imgWidthPDF * imgRatio;

                    // Verifica se a imagem *ainda assim* estoura a página (mesmo após a checagem inicial)
                    // Isso pode acontecer se a estimativa foi muito baixa ou títulos ocuparam mais que o esperado
                    const spaceLeftAfterTitles = pageHeight - pageMargin - currentY;
                    if (imgHeightPDF > spaceLeftAfterTitles) {
                         console.warn(` -> Imagem ${dataId} ainda estoura após títulos (${imgHeightPDF.toFixed(1)}mm > ${spaceLeftAfterTitles.toFixed(1)}mm). Limitando altura.`);
                         imgHeightPDF = spaceLeftAfterTitles; // Limita a altura ao espaço restante
                         imgWidthPDF = imgHeightPDF / imgRatio; // Recalcula largura
                         imgWidthPDF = Math.min(pageWidth, imgWidthPDF); // Garante que não exceda a largura da página
                    }

                    // *** CORREÇÃO: Calcular X para centralizar ***
                    const imageX = (pdf.internal.pageSize.getWidth() - imgWidthPDF) / 2;

                    pdf.addImage(imgData, 'JPEG', imageX, currentY, imgWidthPDF, imgHeightPDF);
                    currentY += imgHeightPDF;

                } catch (err) {
                    console.error(`Erro ao adicionar imagem ${dataId}:`, err);
                    // Adiciona espaço para mensagem de erro mesmo se a imagem falhar
                    if (currentY + 15 > pageHeight - pageMargin && currentY > pageMargin) addNewPage();
                    if (currentY > pageMargin) currentY += itemMarginTop;
                    pdf.setTextColor(255, 0, 0).setFontSize(10);
                    pdf.text(`Erro ao renderizar gráfico ${dataId}`, pageMargin, currentY + 5, { maxWidth: pageWidth });
                    pdf.setTextColor(0, 0, 0);
                    currentY += 10;
                } finally {
                    cleanupAfterCapture(square);
                }
                await new Promise(resolve => setTimeout(resolve, 150)); // Delay
            } // Fim do loop for squares

            const filename = dimensionNumber ? `visualizacao_dimensao_${dimensionNumber}.pdf` : `visualizacao_completa.pdf`;
            pdf.save(filename);
            console.log(`PDF ${filename} gerado.`);
            alert("Geração do PDF concluída.");

        } catch (error) {
             console.error("Erro durante a geração do PDF:", error);
             alert("Ocorreu um erro ao gerar o arquivo PDF.");
        } finally {
             if (loadingOverlay && loadingOverlay.parentNode) {
                document.body.removeChild(loadingOverlay);
             }
        }
    };


    // --- Inicialização ---
    const init = () => { /* ... (código anterior sem mudanças) ... */
        sidebar = document.getElementById('download-sidebar'); btnPdfAll = document.getElementById('download-pdf-all-btn'); btnPdfDim = document.getElementById('download-pdf-dim-btn'); inputPdfDim = document.getElementById('download-dimension-input'); btnPng = document.getElementById('download-png-btn'); btnJson = document.getElementById('download-json-btn'); if (!sidebar || !btnJson || !btnPng || !btnPdfAll || !btnPdfDim || !inputPdfDim ) { console.error("DownloadHandler: Elementos não encontrados."); return; } console.log("DownloadHandler: Initializing listeners..."); btnJson.addEventListener('click', downloadCompleteJson); btnPng.addEventListener('click', downloadPngs); btnPdfAll.addEventListener('click', () => downloadPdf(null)); btnPdfDim.addEventListener('click', () => { const dimValue = inputPdfDim?.value; const dimNumber = parseInt(dimValue, 10); if (dimValue && !isNaN(dimNumber) && dimNumber > 0) { downloadPdf(dimNumber); } else { alert("Digite um número de dimensão válido."); inputPdfDim?.focus(); } });
    };

    return { init };

})();

// Inicialização (deve ser chamada após DOM ready)
// Se este script for carregado antes do DOMContentLoaded, mova a chamada para dentro
// document.addEventListener('DOMContentLoaded', DownloadHandler.init);
// Assumindo que main-init.js já chama DownloadHandler.init() no final do seu DOMContentLoaded