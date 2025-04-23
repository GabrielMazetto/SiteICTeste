/*
 * download-handler.js (v4 - Correção PDF Paginação/Centralização/Escala v2)
 * Lógica para os botões de download na sidebar.
 * Requer jsPDF e html2canvas carregados.
 * CORRIGE: Paginação de títulos e centralização/escala de gráficos no PDF.
 */

const DownloadHandler = (() => {

    // --- Referências aos Elementos da Sidebar ---
    let sidebar = null; let btnPdfAll = null; let btnPdfDim = null;
    let inputPdfDim = null; let btnPng = null; let btnJson = null;

    // --- Funções Auxiliares ---
    const triggerDownload = (blob, filename) => { /* ... (código anterior sem mudanças) ... */
        if (!blob) { console.error("triggerDownload: Blob inválido:", filename); alert(`Erro: Falha ao criar ${filename}.`); return; } try { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.style.display = 'none'; a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); console.log(`Download iniciado: ${filename}`); } catch (error) { console.error("Erro download:", error); alert(`Falha download ${filename}.`); }
    };
    const getVisibleSquares = (dimensionNumber = null) => { /* ... (código anterior sem mudanças) ... */
        const selector = dimensionNumber ? `.grid-container .square[data-dimension-number="${dimensionNumber}"]` : '.grid-container .square'; const squaresNodeList = document.querySelectorAll(selector); return Array.from(squaresNodeList) .filter(el => window.getComputedStyle(el).display !== 'none') .sort((a, b) => { const idA = a.dataset.id || ''; const idB = b.dataset.id || ''; const partsA = idA.split('_'); const partsB = idB.split('_'); const numPartA = partsA[0]; const numPartB = partsB[0]; if (numPartA !== numPartB) { const numA = numPartA.split('.').map(n => parseInt(n, 10)); const numB = numPartB.split('.').map(n => parseInt(n, 10)); for (let i = 0; i < Math.max(numA.length, numB.length); i++) { let vA = numA[i], vB = numB[i]; if (isNaN(vA) || isNaN(vB)) { const sA = String(numPartA).split('.')[i] || ''; const sB = String(numPartB).split('.')[i] || ''; if (isNaN(vA) && isNaN(vB)){ if (sA !== sB) return sA.localeCompare(sB); } else return isNaN(vA) ? 1 : -1; } else if (vA !== vB) return vA - vB; } } const catA = partsA.slice(1).join('_') || ''; const catB = partsB.slice(1).join('_') || ''; if (catA !== catB) return catA.localeCompare(catB); return 0; });
    };
    const prepareForCapture = (element) => element?.classList.add('capture-full-content');
    const cleanupAfterCapture = (element) => element?.classList.remove('capture-full-content');
    const createLoadingOverlay = (text) => { /* ... (código anterior sem mudanças) ... */
         const overlay = document.createElement('div'); Object.assign(overlay.style, { position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', backgroundColor: 'rgba(255, 255, 255, 0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: '10000', fontSize: '1.5em', color: '#333' }); overlay.innerHTML = `<span style="padding: 20px 30px; background: #fff; border-radius: 5px; box-shadow: 0 3px 8px rgba(0,0,0,0.2); text-align: center;">${text}</span>`; overlay.classList.add('capture-overlay'); document.body.appendChild(overlay); return overlay;
     }

    // --- Lógica PDF Refinada v2 ---

    // Função interna para adicionar Títulos ao PDF (NÃO adiciona página)
    const addTitlesToPdfPage = (pdf, itemData, lastDimWritten, lastIndWritten, currentYRef, pageMargin, pageWidth, titleFontSize, subtitleFontSize, titleMarginBottom, subtitleMarginBottom) => {
        let titlesAddedNow = { dim: false, ind: false };
        const itemDim = itemData.dimensionNumber;
        const itemInd = itemData.indicatorNumber;
        const itemIndFullId = itemInd ? `${itemDim}.${itemInd}` : null;

        // Adiciona Título da Dimensão se mudou
        if (itemDim && itemDim !== 'none' && itemDim !== lastDimWritten) {
            const dimTitle = itemData.dimensionName || `Dimensão ${itemDim}`;
            pdf.setFontSize(titleFontSize).setTextColor(50, 50, 50).setFont(undefined, 'bold');
            pdf.text(dimTitle, pdf.internal.pageSize.getWidth() / 2, currentYRef.y, { align: 'center', maxWidth: pageWidth });
            currentYRef.y += pdf.getTextDimensions(dimTitle, { fontSize: titleFontSize, maxWidth: pageWidth }).h + titleMarginBottom;
            titlesAddedNow.dim = true;
        }

        // Adiciona Subtítulo do Indicador se mudou OU se a dimensão mudou
        if (itemIndFullId && (itemIndFullId !== lastIndWritten || titlesAddedNow.dim)) {
            const indTitle = itemData.indicatorName || `Indicador ${itemInd}`;
            pdf.setFontSize(subtitleFontSize).setTextColor(80, 80, 80).setFont(undefined, 'normal');
            pdf.text(indTitle, pdf.internal.pageSize.getWidth() / 2, currentYRef.y, { align: 'center', maxWidth: pageWidth });
            currentYRef.y += pdf.getTextDimensions(indTitle, { fontSize: subtitleFontSize, maxWidth: pageWidth }).h + subtitleMarginBottom;
            titlesAddedNow.ind = true;
        }
        return titlesAddedNow; // Retorna quais títulos foram adicionados NESTA chamada
    };

    // Função principal para gerar PDF
    const downloadPdf = async (dimensionNumber = null) => {
        const context = dimensionNumber ? `Dimensão ${dimensionNumber}` : "Todas as Dimensões";
        console.log(`Iniciando PDF: ${context}...`);
        if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') { alert("Erro: Bibliotecas jsPDF/html2canvas não carregadas."); return; }

        const squares = getVisibleSquares(dimensionNumber);
        if (squares.length === 0) { alert(`Nenhuma visualização encontrada para ${context}.`); return; }
        alert(`Gerando PDF com ${squares.length} visualização(ões) para ${context}. Aguarde...`);
        const loadingOverlay = createLoadingOverlay(`Gerando PDF (${context})...`);

        const { jsPDF } = jspdf;
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const pageMargin = 15;
        const pageWidth = pdf.internal.pageSize.getWidth() - (pageMargin * 2);
        const pageHeight = pdf.internal.pageSize.getHeight();
        const pageContentHeight = pageHeight - (pageMargin * 2);
        let currentYRef = { y: pageMargin }; // Objeto para passar por referência
        const titleFontSize = 14; const subtitleFontSize = 12;
        const titleMarginBottom = 6; const subtitleMarginBottom = 4;
        const itemMarginTop = 8;
        // Estimar altura MÍNIMA de um item (ajuste se necessário)
        const estimateItemHeight = 80; // Altura estimada para títulos + imagem pequena

        const addNewPage = () => {
            pdf.addPage();
            currentYRef.y = pageMargin; // Reseta Y para a nova página
            console.log("  -> Nova página adicionada no PDF.");
        };

        // Adiciona Capa
        try { /* ... (código da capa - igual anterior) ... */
            let schoolInfo={name:'N/A',city:'N/A',state:'N/A',responsible:'N/A'}; const storedSchoolInfo=localStorage.getItem("schoolInfo"); if(storedSchoolInfo){try{schoolInfo=JSON.parse(storedSchoolInfo);}catch(e){console.error("Erro parse schoolInfo:",e);}} const respondentCounts={}; const dadosCompletos=JSON.parse(localStorage.getItem("dadosCompletos")); if(dadosCompletos&&dadosCompletos.DemaisTabelas){for(const[fileName,table]of Object.entries(dadosCompletos.DemaisTabelas)){const groupName=fileName.replace(/\.(xlsx?|csv)$/i,""); const count=(table||[]).slice(1).filter(row=>row?.some(cell=>cell!=null&&String(cell).trim()!=='')).length; respondentCounts[groupName]=count;}} const explanatoryText="Este documento apresenta os resultados consolidados..."; pdf.setFontSize(18).setFont(undefined,'bold'); pdf.text("Relatório de Diagnóstico Participativo",pdf.internal.pageSize.getWidth()/2,currentYRef.y+10,{align:'center'}); currentYRef.y+=30; pdf.setFontSize(12).setFont(undefined,'bold'); pdf.text("Escola:",pageMargin,currentYRef.y); pdf.setFont(undefined,'normal'); pdf.text(schoolInfo.name||'N/A',pageMargin+35,currentYRef.y); currentYRef.y+=7; pdf.setFont(undefined,'bold'); pdf.text("Local:",pageMargin,currentYRef.y); pdf.setFont(undefined,'normal'); pdf.text(`${schoolInfo.city||'N/A'} / ${schoolInfo.state||'N/A'}`,pageMargin+35,currentYRef.y); currentYRef.y+=7; pdf.setFont(undefined,'bold'); pdf.text("Responsável:",pageMargin,currentYRef.y); pdf.setFont(undefined,'normal'); pdf.text(schoolInfo.responsible||'N/A',pageMargin+35,currentYRef.y); currentYRef.y+=14; pdf.setFontSize(11).setFont(undefined,'bold'); pdf.text("Total de Respondentes por Grupo:",pageMargin,currentYRef.y); currentYRef.y+=6; pdf.setFont(undefined,'normal'); for(const[group,count]of Object.entries(respondentCounts)){pdf.text(`${group}: ${count}`,pageMargin+5,currentYRef.y); currentYRef.y+=5;} currentYRef.y+=10; pdf.setFontSize(10).setFont(undefined,'normal'); const splitText=pdf.splitTextToSize(explanatoryText,pageWidth); pdf.text(splitText,pageMargin,currentYRef.y); currentYRef.y+=(splitText.length*4)+10;
        } catch (coverError) { /* ... (tratamento erro capa) ... */ console.error("Erro capa PDF:", coverError); pdf.setTextColor(255,0,0).setFontSize(10); pdf.text("Erro ao gerar capa.",pageMargin,currentYRef.y); pdf.setTextColor(0,0,0); currentYRef.y+=10; }

        // Inicia página para os gráficos
        addNewPage();

        try {
            let lastDimWritten = null;
            let lastIndWritten = null;
            let isFirstItemOnPage = true; // Flag para controlar margem superior

            for (let i = 0; i < squares.length; i++) {
                const square = squares[i];
                const dataId = square.dataset.id;
                const itemData = window.visualizacaoData?.[dataId];
                if (!itemData) { console.warn(`Dados não encontrados para ${dataId}`); continue; }

                console.log(`Processando ${dataId}... Pág: ${pdf.internal.getNumberOfPages()}, Y Início: ${currentYRef.y.toFixed(1)}`);

                const itemDim = itemData.dimensionNumber;
                const itemInd = itemData.indicatorNumber;
                const itemIndFullId = itemInd ? `${itemDim}.${itemInd}` : null;

                // --- Lógica de Paginação ---
                // 1. Calcular altura APENAS dos títulos que SERÃO adicionados
                let titlesHeightNeeded = 0;
                const needsDimTitle = itemDim && itemDim !== 'none' && itemDim !== lastDimWritten;
                const needsIndTitle = itemIndFullId && (itemIndFullId !== lastIndWritten || needsDimTitle); // Precisa se ind mudou OU dim mudou
                if (needsDimTitle) titlesHeightNeeded += pdf.getTextDimensions("D", { fontSize: titleFontSize }).h + titleMarginBottom;
                if (needsIndTitle) titlesHeightNeeded += pdf.getTextDimensions("I", { fontSize: subtitleFontSize }).h + subtitleMarginBottom;

                // 2. Verificar se TÍTULOS + MARGEM + ALTURA MÍNIMA cabem
                const spaceNeededBeforeImage = (isFirstItemOnPage ? 0 : itemMarginTop) + titlesHeightNeeded + estimateItemHeight;
                if (currentYRef.y + spaceNeededBeforeImage > (pageHeight - pageMargin)) {
                    console.log(` -> Espaço insuficiente ANTES da imagem para ${dataId}. Nova página.`);
                    addNewPage();
                    isFirstItemOnPage = true; // É o primeiro item da nova página
                    // Resetar lastWritten para forçar títulos na nova página
                    lastDimWritten = null;
                    lastIndWritten = null;
                }

                // 3. Adicionar margem se não for o primeiro da página
                if (!isFirstItemOnPage) {
                    currentYRef.y += itemMarginTop;
                }

                // 4. Adicionar Títulos (agora sabemos que cabem ou estamos em nova pág)
                const { titlesAddedNow } = addTitlesToPdfPage(
                    pdf, itemData, lastDimWritten, lastIndWritten, currentYRef,
                    pageMargin, pageWidth, pageHeight, titleFontSize, subtitleFontSize,
                    titleMarginBottom, subtitleMarginBottom, false, // Nunca força aqui
                    addNewPage // Passa a função (embora não deva ser chamada aqui)
                );
                // Atualiza o estado APENAS se os títulos foram realmente adicionados
                 if (titlesAddedNow.dim) lastDimWritten = itemDim;
                 if (titlesAddedNow.ind) lastIndWritten = itemIndFullId;

                // --- Captura e Adição da Imagem ---
                prepareForCapture(square);
                let imgHeightPDF = 0;
                let actualImageAdded = false;
                let imageRequiresNewPage = false;

                try {
                    const canvas = await html2canvas(square, { scale: 1.5, useCORS: true, logging: false, backgroundColor: '#ffffff', ignoreElements: (el) => el.classList.contains('edit-chart-btn') || el.classList.contains('edit-perguntas-btn') });
                    const imgData = canvas.toDataURL('image/jpeg', 0.85);
                    const imgProps = pdf.getImageProperties(imgData); const imgRatio = imgProps.height / imgProps.width;
                    let imgWidthPDF = pageWidth; imgHeightPDF = imgWidthPDF * imgRatio;
                    const remainingPageHeight = pageHeight - pageMargin - currentYRef.y;

                    // 5. Verificar se a imagem REAL cabe no espaço restante
                    if (imgHeightPDF > remainingPageHeight) {
                        console.log(` -> Imagem ${dataId} não cabe (${imgHeightPDF.toFixed(1)}mm > ${remainingPageHeight.toFixed(1)}mm). Nova página para imagem.`);
                        imageRequiresNewPage = true;
                        addNewPage();
                        isFirstItemOnPage = true; // Será o primeiro item na nova página
                        // Re-adiciona Títulos OBRIGATORIAMENTE na nova página ANTES da imagem
                        const { titlesAddedNow: titlesReprinted } = addTitlesToPdfPage(
                            pdf, itemData, null, null, currentYRef, // Passa null para forçar re-add
                            pageMargin, pageWidth, pageHeight, titleFontSize, subtitleFontSize,
                            titleMarginBottom, subtitleMarginBottom, true, // Força títulos
                            addNewPage
                        );
                        lastDimWritten = titlesReprinted.dim ? itemDim : null; // Atualiza lastWritten com base no que foi reimpresso
                        lastIndWritten = titlesReprinted.ind ? itemIndFullId : null;
                        if (currentYRef.y > pageMargin) currentYRef.y += itemMarginTop; // Margem na nova pag

                         // Recalcula altura restante após adicionar títulos na nova página
                         const newRemainingHeight = pageHeight - pageMargin - currentYRef.y;
                         if (imgHeightPDF > newRemainingHeight) { // Se ainda for maior, limita
                              console.warn(` -> Imagem ${dataId} maior que a página, reduzindo...`);
                             imgHeightPDF = newRemainingHeight;
                             imgWidthPDF = imgHeightPDF / imgRatio;
                         }
                    }

                    const xPos = pageMargin + (pageWidth - imgWidthPDF) / 2; // Centraliza
                    pdf.addImage(imgData, 'JPEG', xPos, currentYRef.y, imgWidthPDF, imgHeightPDF);
                    currentYRef.y += imgHeightPDF;
                    actualImageAdded = true;
                    isFirstItemOnPage = false; // O próximo item não será o primeiro

                } catch (err) { /* ... (bloco catch erro imagem) ... */
                     console.error(`Erro html2canvas/addImage ${dataId}:`, err); const errorTextHeight = 15; if (currentYRef.y + errorTextHeight > (pageHeight - pageMargin)) addNewPage(); if (currentYRef.y > pageMargin) currentYRef.y += itemMarginTop; pdf.setTextColor(255, 0, 0).setFontSize(10); pdf.text(`Erro ao renderizar visualização ${dataId}`, pageMargin, currentYRef.y + 5, { maxWidth: pageWidth }); pdf.setTextColor(0, 0, 0); currentYRef.y += errorTextHeight; isFirstItemOnPage = false;
                } finally {
                    cleanupAfterCapture(square);
                }
                if(actualImageAdded) await new Promise(resolve => setTimeout(resolve, 50));

            } // Fim do loop for squares

            const filename = dimensionNumber ? `visualizacao_dimensao_${dimensionNumber}.pdf` : `visualizacao_completa.pdf`;
            pdf.save(filename);
            console.log(`PDF ${filename} gerado.`);
            alert("Geração do PDF concluída.");

        } catch (error) { /* ... (bloco catch erro geral PDF) ... */
             console.error("Erro durante a geração do PDF:", error); alert("Ocorreu um erro ao gerar o arquivo PDF.");
        } finally {
             if (loadingOverlay && loadingOverlay.parentNode) document.body.removeChild(loadingOverlay);
        }
    }; // Fim downloadPdf


    // --- Download JSON Completo (sem mudanças) ---
    const downloadCompleteJson = () => { /* ... (código anterior) ... */
        console.log("Iniciando download JSON..."); try { const dadosCompletos = JSON.parse(localStorage.getItem("dadosCompletos")) || {}; const currentChartInstances = window.charts || {}; const storedSchoolInfo = localStorage.getItem("schoolInfo"); let schoolInfo = null; if (storedSchoolInfo) { try { schoolInfo = JSON.parse(storedSchoolInfo); } catch (e) { console.error("Erro parse schoolInfo:", e); } } const dataToSave = { originalData: { TabelaConsulta: dadosCompletos.TabelaConsulta || [], DemaisTabelas: dadosCompletos.DemaisTabelas || {} }, schoolInfo: schoolInfo || {}, chartConfigs: {} }; for (const key in currentChartInstances) { if (Object.hasOwnProperty.call(currentChartInstances, key)) { const instance = currentChartInstances[key]; let configToSave = null; if (instance instanceof Chart && instance.currentOptions) { try { configToSave = JSON.parse(JSON.stringify(instance.currentOptions)); } catch (e) { console.warn(`Erro serializar currentOptions ${key}:`, e); try { configToSave = JSON.parse(JSON.stringify(instance.config.options || {})); configToSave.error_fallback = "Falha currentOptions"; } catch (e2) { console.error(`Erro serializar config.options ${key}:`, e2); configToSave = { error: "Falha serializar opções" }; } } } else if (instance.options && instance.type && instance.type.includes('table')) { try { configToSave = JSON.parse(JSON.stringify(instance.options)); if (instance.type === 'response-table' && instance.data) { configToSave._currentData = JSON.parse(JSON.stringify(instance.data)); } } catch (e) { console.warn(`Erro serializar tabela ${key}:`, e); configToSave = { error: "Falha serializar tabela" }; } } else { console.warn(`Instância desconhecida ${key}. Pulando.`); } if (configToSave) { dataToSave.chartConfigs[key] = configToSave; } } } const jsonString = JSON.stringify(dataToSave, null, 2); const blob = new Blob([jsonString], { type: 'application/json' }); triggerDownload(blob, 'visualizacao_completa_config.json'); } catch (error) { console.error("Erro gerar JSON:", error); alert("Erro gerar JSON."); }
    };

    // --- Download PNGs (sem mudanças) ---
    const downloadPngs = async () => { /* ... (código anterior) ... */
        console.log("Iniciando PNGs..."); if (typeof html2canvas === 'undefined') { alert("Erro: html2canvas não carregado."); return; } const currentFilter = window.currentDimensionFilter; const squares = getVisibleSquares(currentFilter); if (squares.length === 0) { alert("Nenhuma visualização visível."); return; } alert(`Preparando ${squares.length} imagem(ns) PNG...`); const loadingOverlay = createLoadingOverlay('Gerando Imagens...'); try { for (const square of squares) { const dataId = square.dataset.id || `imagem_${squares.indexOf(square) + 1}`; const filename = `grafico_${dataId}.png`; console.log(`Gerando PNG ${dataId}...`); prepareForCapture(square); try { const canvas = await html2canvas(square, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', ignoreElements: (el) => el.classList.contains('edit-chart-btn') || el.classList.contains('edit-perguntas-btn') }); const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png')); triggerDownload(blob, filename); } catch (err) { console.error(`Erro PNG ${dataId}:`, err); alert(`Falha imagem ${dataId}.`); } finally { cleanupAfterCapture(square); } await new Promise(resolve => setTimeout(resolve, 300)); } console.log("PNGs concluídos."); alert("Geração PNG concluída."); } catch (error) { console.error("Erro processo PNG:", error); alert("Erro geral PNG."); } finally { if (loadingOverlay && loadingOverlay.parentNode) { document.body.removeChild(loadingOverlay); } }
    };

    // --- Inicialização (Adiciona Listeners aos botões) ---
    const init = () => { /* ... (código anterior - busca elementos e adiciona listeners) ... */
        sidebar = document.getElementById('download-sidebar'); btnPdfAll = document.getElementById('download-pdf-all-btn'); btnPdfDim = document.getElementById('download-pdf-dim-btn'); inputPdfDim = document.getElementById('download-dimension-input'); btnPng = document.getElementById('download-png-btn'); btnJson = document.getElementById('download-json-btn'); if (!sidebar || !btnJson || !btnPng || !btnPdfAll || !btnPdfDim || !inputPdfDim ) { console.error("DownloadHandler: Elementos não encontrados."); return; } console.log("DownloadHandler: Initializing listeners..."); btnJson.addEventListener('click', downloadCompleteJson); btnPng.addEventListener('click', downloadPngs); btnPdfAll.addEventListener('click', () => downloadPdf(null)); btnPdfDim.addEventListener('click', () => { const dimValue = inputPdfDim?.value; const dimNumber = parseInt(dimValue, 10); if (dimValue && !isNaN(dimNumber) && dimNumber > 0) { downloadPdf(dimNumber); } else { alert("Digite um número de dimensão válido."); inputPdfDim?.focus(); } });
    };

    return { init };

})();

// Inicialização chamada em main-init.js após DOM pronto