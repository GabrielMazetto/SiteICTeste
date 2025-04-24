/*
 * radar-chart.js (vFinal com CORREÇÃO TÍTULO v3 e UM botão de edição por par)
 * ... (outros comentários) ...
 * CORRIGE prioridade do título inicial, atualização da preview e aplicação/reset.
 */

const RadarChart = (() => {

    const defaults = () => window.defaultTeiaSettings || {};

    // --- Função auxiliar para processar opções salvas/defaults (CORRIGIDA PRIORIDADE TÍTULO) ---
    const processSavedOptions = (options, defaultTitleFromDataItem) => {
        const d = defaults();
        let processed = { ...d, ...(options || {}) };
        const savedTitle = options?.title; // Título vindo das configs salvas (pode não existir)
        const dataItemTitle = defaultTitleFromDataItem; // Título vindo do visualizacaoData
        let finalTitle = d.title; // Fallback final: default global

        // Prioridade: 1. Salvo (se válido) -> 2. Do DataItem (se válido) -> 3. Default Global
        if (savedTitle !== null && savedTitle !== undefined && String(savedTitle).trim() !== '') {
            finalTitle = String(savedTitle);
        } else if (dataItemTitle !== null && dataItemTitle !== undefined && String(dataItemTitle).trim() !== '') {
            finalTitle = String(dataItemTitle);
        }
        processed.title = finalTitle; // Define o título com a prioridade correta

        // Trata fontes e limpa legados
        if (processed.fontsize && Array.isArray(processed.fontsize)) { /* ... */ processed.titleFont = processed.titleFont ?? processed.fontsize[0] ?? d.fontsize[0]; processed.categoryFont = processed.categoryFont ?? processed.fontsize[1] ?? d.fontsize[1]; processed.legendFont = processed.legendFont ?? processed.fontsize[2] ?? d.fontsize[2]; }
        processed.titleFont = processed.titleFont ?? d.fontsize[0]; processed.categoryFont = processed.categoryFont ?? d.fontsize[1]; processed.legendFont = processed.legendFont ?? d.fontsize[2];
        delete processed.fontsize; delete processed.pointLabelPadding;
        return processed;
    };

    // --- Função para configurar as opções ANINHADAS do Chart.js (SEM MUDANÇAS) ---
    const configureChartOptions = (settings, originalLabels = []) => { /* ... (código anterior) ... */
         const wrapText = window.wrapText || function(ctx, text, maxW) { return text.split('\n'); }; const d = defaults(); const { title, pad_title, titleColor, legendPos, textColor, gridLinesColor, pointLabelMaxWidthPixels, enablePointLabelTruncation, pointLabelTruncateWords, categoryFont, titleFont, legendFont } = { ...d, ...settings }; const szTitle = titleFont ?? d.fontsize[0] ?? 16; const szPointLabel = categoryFont ?? d.fontsize[1] ?? 10; const szLegend = legendFont ?? d.fontsize[2] ?? 10; const highColor = '#90EE90'; const lowColor = '#FFA07A'; const defaultPointLabelColor = textColor ?? d.textColor ?? '#000000'; const numCategories = originalLabels.length; const top3Indices = numCategories >= 3 ? [0, 1, 2] : [...Array(numCategories).keys()]; const bottom3Indices = numCategories >= 6 ? [numCategories - 1, numCategories - 2, numCategories - 3] : (numCategories > 3 ? [...Array(numCategories - 3).keys()].map(i => i + 3) : []); const finalBottom3Indices = bottom3Indices.filter(idx => !top3Indices.includes(idx)); const chartTitleString = String(title || '');
         const nestedOptions = { plugins: { title: { display: !!chartTitleString.trim(), text: chartTitleString, _intendedText: chartTitleString, font: { size: szTitle }, color: titleColor ?? d.color_title, padding: { top: pad_title ?? 10, bottom: pad_title ?? 10 } }, legend: { display: true, position: legendPos, labels: { font: { size: szLegend }, color: textColor ?? d.textColor } }, tooltip: { callbacks: { title: function(tooltipItems) { if (!tooltipItems || tooltipItems.length === 0) return ''; const item = tooltipItems[0]; const originalAxisLabel = item.label || ''; const chart = this.chart; const chartWidth = chart.width || 300; const tooltipMaxWidth = chartWidth * 0.75; const ctx = chart.ctx; if (!ctx || tooltipMaxWidth <= 0 || typeof wrapText !== 'function') { return originalAxisLabel; } const tooltipTitleFont = chart.options.plugins?.tooltip?.titleFont || Chart.defaults.plugins.tooltip.titleFont; const fontStyle = tooltipTitleFont.style || 'normal'; const fontWeight = tooltipTitleFont.weight || 'bold'; const fontSize = tooltipTitleFont.size || 12; const fontFamily = tooltipTitleFont.family || Chart.defaults.font.family; const originalCtxFont = ctx.font; ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`; const wrappedTitleLines = wrapText(ctx, originalAxisLabel, tooltipMaxWidth); ctx.font = originalCtxFont; return wrappedTitleLines; }, label: function(context) { const datasetLabel = context.dataset.label || ''; const value = Math.round(context.parsed?.r ?? 0); return `${datasetLabel}: ${value}%`; } } } }, responsive: true, maintainAspectRatio: false, scales: { r: { min: 0, angleLines: { display: false }, grid: { color: gridLinesColor ?? d.gridLinesColor }, pointLabels: { padding: 0, callback: function(label, index) { const chart = this.chart; const originalLabelText = originalLabels[index] || ''; let textToDisplay = originalLabelText; const currentSettings = chart.options?.__customSettings || settings; const currentEnableTruncation = currentSettings.enablePointLabelTruncation ?? d.enablePointLabelTruncation; const truncateNumWords = currentSettings.pointLabelTruncateWords ?? d.pointLabelTruncateWords; if (currentEnableTruncation) { const words = originalLabelText.split(/\s+/); if (words.length > truncateNumWords) { textToDisplay = words.slice(0, truncateNumWords).join(' ') + '...'; } } const ctx = chart.ctx; const defaultMaxWidth = d.pointLabelMaxWidthPixels ?? 80; const maxWidth = currentSettings.pointLabelMaxWidthPixels ?? defaultMaxWidth; if (!ctx || maxWidth <= 0 || typeof wrapText !== 'function') { return textToDisplay.includes('\n') ? textToDisplay.split('\n') : [textToDisplay]; } const pointLabelFontCfg = chart.options.scales?.r?.pointLabels?.font || {}; const fontSize = pointLabelFontCfg.size ?? szPointLabel; const isTopOrBottom = top3Indices.includes(index) || finalBottom3Indices.includes(index); const currentFontWeight = isTopOrBottom ? 'bold' : 'normal'; const fontStyle = pointLabelFontCfg.style || 'normal'; const fontFamily = pointLabelFontCfg.family || Chart.defaults.font.family; const originalCtxFont = ctx.font; ctx.font = `${fontStyle} ${currentFontWeight} ${fontSize}px ${fontFamily}`; const wrappedLines = wrapText(ctx, textToDisplay, maxWidth); ctx.font = originalCtxFont; return wrappedLines; }, font: { size: szPointLabel, weight: (ctx) => (top3Indices.includes(ctx.index) || finalBottom3Indices.includes(ctx.index)) ? 'bold' : 'normal' }, color: (ctx) => { if (top3Indices.includes(ctx.index)) return highColor; if (finalBottom3Indices.includes(ctx.index)) return lowColor; return defaultPointLabelColor; }, textAlign: 'center' }, ticks: { display: true, stepSize: 20, color: textColor ?? d.textColor, backdropColor: 'transparent', callback: val => val + '%' } } } };
         nestedOptions.__customSettings = settings; return nestedOptions;
     };

    // --- Função para plotar UM gráfico (SEM MUDANÇAS) ---
    const plot = (dataItemForPlot, options = {}, canvasId) => { /* ... (código anterior - sem cálculo de %) ... */
         const settings = { ...defaults(), ...options }; const dfDados = dataItemForPlot.dfDados; const groupSizes = dataItemForPlot.groupSizes || {}; if (!dfDados || !dfDados.index || !dfDados.columns || !dfDados.data || dfDados.index.length === 0 || dfDados.columns.length === 0) { console.error("Plot Radar: Dados inválidos.", { canvasId, dataItemForPlot }); const canvas = getEl(canvasId); if (canvas) { const p = canvas.parentElement || canvas; p.innerHTML = `<p class="error-msg">Erro: Dados inválidos.</p>`; } return null; }
         const datasets = dfDados.index.map((groupName, i) => { const percentData = (dfDados.data?.[i] || []).map(p => parseFloat(p) || 0); if (percentData.some(p => p > 100)) { console.warn(`Plot Radar (${canvasId}): Recebeu dados > 100% para ${groupName}. Limitando.`); percentData.forEach((p, idx) => { if (p > 100) percentData[idx] = 100; }); } const d = defaults(); const color = settings.linesColor?.[i % settings.linesColor.length] ?? d.linesColor?.[i % d.linesColor.length] ?? '#ccc'; const radius = settings.pointRadius ?? d.pointRadius ?? 3; const hoverRadius = radius > 0 ? radius + 2 : 0; const hitRadius = 10; return { label: groupName, data: percentData, borderColor: color, backgroundColor: 'transparent', borderWidth: settings.lineWidth ?? d.lineWidth, pointRadius: radius, pointBackgroundColor: color, pointBorderColor: settings.pointBorderColor ?? d.pointBorderColor, pointHoverRadius: hoverRadius, pointHoverBackgroundColor: color, pointHoverBorderColor: settings.textColor ?? d.textColor ?? '#000', pointHitRadius: hitRadius, hidden: !(settings.datasetVisibility?.[i] ?? true) }; });
         const originalLabels = [...dfDados.columns]; const chartOptionsNested = configureChartOptions(settings, originalLabels); if (chartOptionsNested.scales?.r) { chartOptionsNested.scales.r.max = settings.adjustScale ? undefined : 100; if (settings.adjustScale) { let maxVal = 0; datasets.forEach((ds) => { if (!ds.hidden) { maxVal = Math.max(maxVal, ...(ds.data || [0])); } }); const targetMax = maxVal <= 0 ? 20 : Math.min(100, Math.ceil(maxVal / 20) * 20); chartOptionsNested.scales.r.max = targetMax; } if (chartOptionsNested.scales.r.ticks) chartOptionsNested.scales.r.ticks.stepSize = 20; } else { console.warn("Não foi possível configurar escala:", canvasId); } const canvas = getEl(canvasId); if (!canvas) { console.error("Canvas não encontrado:", canvasId); return null; } const existingChart = Chart.getChart(canvas); if (existingChart) { existingChart.destroy(); } try { const ctx = canvas.getContext('2d'); const chart = new Chart(ctx, { type: 'radar', data: { labels: originalLabels, datasets }, options: chartOptionsNested }); chart.canvas.style.backgroundColor = settings.bgColor ?? defaults().bgColor;
         // *** Armazena as opções planas EFETIVAS usadas para renderizar ***
         chart.currentOptions = JSON.parse(JSON.stringify(settings));
         return chart; } catch (error) { console.error(`Erro Chart.js ${canvasId}:`, error); const p = canvas.parentElement||canvas; p.innerHTML = `<p class="error-msg">Erro renderização.</p>`; return null; }
    };

    // --- Funções de Edição (Modal) ---

    // Constrói o HTML do modal (SEM MUDANÇAS)
    const buildModalHTML = params => { /* ... (código anterior) ... */
         const { title, titleFont, titleColor, legendPos, legendFont, textColor, bgColor, datasetNames, linesColor, pointBorderColor, categoryFont, gridLinesColor, datasetVisibility, lineWidth, pointRadius, adjustScale, pointLabelMaxWidthPixels, enablePointLabelTruncation, pointLabelTruncateWords, isSpecialPair } = params; const d = defaults(); const safeNames = datasetNames || []; const colorInputs = safeNames.map((name, i) => buildInput('color', `edit-line-color-${i}`, linesColor?.[i] || safeGet(d, `linesColor.${i}`, '#cccccc'), `Cor ${name || 'G' + (i+1)}`)).join(''); const visibilityInputs = safeNames.map((name, i) => buildInput('checkbox', `edit-line-visibility-${i}`, datasetVisibility?.[i] ?? true, `Vis. ${name || 'G' + (i+1)}`)).join(''); const legOpts = buildOptions(['top', 'right', 'bottom', 'left'], legendPos, d.legendPos);
         const previewContainerHTML = `<div class="graph-container ${isSpecialPair ? 'special-pair-preview' : ''}"> <canvas id="modalTeiaCanvas" style="min-height: ${isSpecialPair ? '250px' : '300px'}; width:100%; background-color:${bgColor ?? d.bgColor}; border: 1px solid #ccc; margin-bottom: ${isSpecialPair ? '10px' : '0'};"></canvas> ${isSpecialPair ? `<hr class="preview-separator" style="margin: 5px 0;"> <canvas id="modalTeiaCanvasB" style="min-height: 250px; width:100%; background-color:${bgColor ?? d.bgColor}; border: 1px solid #ccc;"></canvas>` : ''} </div>`;
         return `${previewContainerHTML} <div class="settings-container"> <h3>Editar Gráfico ${isSpecialPair ? `da Categoria` : ''}</h3> <div class="basic-settings"> ${buildInput('text','teia-edit-title',title ?? '', `Título ${isSpecialPair ? '(Categoria)' : ''}`)} ${buildInput('number','teia-edit-title-font',titleFont ?? 16, 'Tam. Fonte Título', {props:{min:"10"}})} ${buildInput('color','teia-edit-title-color',titleColor ?? '#000', 'Cor Título')} ${buildInput('select','teia-edit-legend-pos','', 'Posição Legenda', {optionHTML: legOpts})} ${colorInputs ? `<div class="settings-group group-settings-container"><h4>Cores Grupos</h4><div id="edit-lines-colors">${colorInputs}</div></div>` : '<p>Nenhum grupo.</p>'} ${buildInput('color','teia-edit-bg-color',bgColor ?? '#fff', 'Cor Fundo Gráfico')} <button id="teia-toggle-additional-btn">Mais Configurações</button> </div> <div class="additional-settings" style="display:none;"> ${visibilityInputs ? `<div class="settings-group group-settings-container"><h4>Visibilidade Grupos</h4><div id="edit-visibility-settings">${visibilityInputs}</div></div>` : '<p>Nenhum grupo.</p>'} ${buildInput('number','teia-edit-category-font',categoryFont ?? 10, 'Tam. Fonte Eixos', { props: { min: "8"} })} ${buildInput('number','teia-edit-legend-font',legendFont ?? 10, 'Tam. Fonte Legenda', { props: { min: "8"} })} ${buildInput('color','teia-edit-text-color',textColor ?? '#000', 'Cor Texto Geral')} ${buildInput('color','teia-edit-point-border-color',pointBorderColor ?? '#fff', 'Cor Borda Pontos')} ${buildInput('color','teia-edit-grid-lines-color',gridLinesColor ?? '#ccc', 'Cor Linhas Fundo')} ${buildInput('number','teia-edit-line-thickness-global',lineWidth ?? 2, 'Espessura Linha', { props: { min:"0.5", step:"0.5" } })} ${buildInput('number','teia-edit-point-radius-global',pointRadius ?? 3, 'Tamanho Pontos', { props: { min:"0", step:"1" } })} ${buildInput('checkbox','teia-edit-enable-point-label-truncation',enablePointLabelTruncation ?? true, 'Truncar Rótulos <span class="help-icon" data-help-key="truncarRotulo">?</span>')} ${buildInput('number','teia-edit-point-label-truncate-words',pointLabelTruncateWords ?? 3, 'Nº Palavras <span class="help-icon" data-help-key="nPalavrasTruncar">?</span>', { props: { min: "1", step: "1" } })} ${buildInput('number','teia-edit-point-label-max-width',pointLabelMaxWidthPixels ?? 80, 'Larg. Máx. (px) <span class="help-icon" data-help-key="largMaxRotulo">?</span>', { props: { min: "30", step: "5" } })} ${buildInput('checkbox','teia-adjust-scale',adjustScale ?? false, 'Ajustar Escala <span class="help-icon" data-help-key="adjustScale">?</span>')} <button id="teia-toggle-additional-btn-hide">Menos Configurações</button> </div> <div class="settings-buttons"> <div class="btn-group"><button id="teia-apply-btn">Aplicar</button><select id="teia-apply-scope"><option value="this">Neste</option><option value="all">Todos</option></select></div> <div class="btn-group"><button id="teia-reset-btn">Padrão</button><select id="teia-reset-scope"><option value="this">Neste</option><option value="all">Todos</option></select></div> <button id="teia-close-edit-btn">Cancelar</button> </div> </div>`;
    };

    // Lê os valores do formulário do modal (SEM MUDANÇAS)
    const getFormValues = (datasetNames) => { /* ... (código anterior) ... */
         const d = defaults(); const safeNames = datasetNames || []; return { title: getVal('teia-edit-title'), titleFont: getIntVal('teia-edit-title-font', 16), titleColor: getVal('teia-edit-title-color'), legendPos: getVal('teia-edit-legend-pos'), textColor: getVal('teia-edit-text-color'), bgColor: getVal('teia-edit-bg-color'), categoryFont: getIntVal('teia-edit-category-font', 10), legendFont: getIntVal('teia-edit-legend-font', 10), pointBorderColor: getVal('teia-edit-point-border-color'), linesColor: safeNames.map((_, i) => getVal(`edit-line-color-${i}`)), gridLinesColor: getVal('teia-edit-grid-lines-color'), lineWidth: getFloatVal('teia-edit-line-thickness-global', 2), pointRadius: getIntVal('teia-edit-point-radius-global', 3), pointLabelMaxWidthPixels: getIntVal('teia-edit-point-label-max-width', 80), enablePointLabelTruncation: isChecked('teia-edit-enable-point-label-truncation'), pointLabelTruncateWords: getIntVal('teia-edit-point-label-truncate-words', 3), datasetVisibility: safeNames.map((_, i) => isChecked(`edit-line-visibility-${i}`)), adjustScale: isChecked('teia-adjust-scale') };
     };

    // Aplica settings a UMA instância (CORRIGIDO para TÍTULO v3)
    const applySettings = (chart, newSettingsFlat, isSubChart = false, actualChartTitle = '') => { /* ... (código anterior - usa actualChartTitle) ... */
         if (!chart?.config || !chart.data || !newSettingsFlat) { console.error("ApplySettings: Instância ou settings inválidas."); return; } const originalLabels = chart.config.data.labels || []; const chartData = chart.data; const d = defaults(); let settingsToApply = JSON.parse(JSON.stringify(newSettingsFlat)); settingsToApply.title = actualChartTitle; settingsToApply._intendedText = actualChartTitle; console.log(`ApplySettings (isSubChart=${isSubChart}): Título aplicado = "${settingsToApply.title}"`); const updatedChartOptionsNested = configureChartOptions(settingsToApply, originalLabels); if (updatedChartOptionsNested.scales?.r) { updatedChartOptionsNested.scales.r.min = 0; if (settingsToApply.adjustScale) { let maxVal = 0; chartData.datasets.forEach((ds, i) => { if (!(settingsToApply.datasetVisibility?.[i] === false)) { maxVal = Math.max(maxVal, ...(ds.data || [0])); } }); const targetMax = maxVal <= 0 ? 20 : Math.min(100, Math.ceil(maxVal / 20) * 20); updatedChartOptionsNested.scales.r.max = targetMax; } else { updatedChartOptionsNested.scales.r.max = 100; } if (updatedChartOptionsNested.scales.r.ticks) updatedChartOptionsNested.scales.r.ticks.stepSize = 20; } chartData.datasets.forEach((ds, i) => { const defaultColor = d.linesColor?.[i % d.linesColor.length] ?? '#ccc'; const newColor = settingsToApply.linesColor?.[i] ?? defaultColor; const radius = settingsToApply.pointRadius ?? d.pointRadius ?? 3; const hoverRadius = radius > 0 ? radius + 2 : 0; const hitRadius = 10; Object.assign(ds, { borderColor: newColor, pointBackgroundColor: newColor, pointHoverBackgroundColor: newColor, pointBorderColor: settingsToApply.pointBorderColor ?? d.pointBorderColor, borderWidth: settingsToApply.lineWidth ?? d.lineWidth, pointRadius: radius, pointHoverRadius: hoverRadius, pointHitRadius: hitRadius, hidden: !(settingsToApply.datasetVisibility?.[i] ?? true) }); }); if (chart.canvas) chart.canvas.style.backgroundColor = settingsToApply.bgColor ?? d.bgColor; chart.options = updatedChartOptionsNested; chart.update(); chart.currentOptions = settingsToApply;
     };

    // Reseta settings de UMA instância (CORRIGIDO para TÍTULO v3)
    const resetSettings = (chart, isSubChart = false, originalChartTitle = '') => { /* ... (código anterior - usa originalChartTitle) ... */
         const d = defaults(); if (!chart?.config || !d) { console.error("ResetSettings: Instância inválida."); return; } console.log(`ResetSettings (isSubChart=${isSubChart}): Restaurando Título para: "${originalChartTitle}"`); const resetValuesFlat = { title: originalChartTitle, pad_title: d.pad_title, figsize: d.figsize, titleFont: d.fontsize[0], categoryFont: d.fontsize[1], legendFont: d.fontsize[2], color_title: d.color_title, legendPos: d.legendPos, linesColor: [...d.linesColor], gridLinesColor: d.gridLinesColor, bgColor: d.bgColor, lineWidth: d.lineWidth, pointRadius: d.pointRadius ?? 3, pointBorderColor: d.pointBorderColor, textColor: d.textColor ?? '#000000', pointLabelMaxWidthPixels: d.pointLabelMaxWidthPixels, enablePointLabelTruncation: d.enablePointLabelTruncation, pointLabelTruncateWords: d.pointLabelTruncateWords, datasetVisibility: chart.config.data.datasets.map(() => true), adjustScale: false }; applySettings(chart, resetValuesFlat, isSubChart, originalChartTitle);
     };

     // Reseta os campos do formulário do modal (SEM MUDANÇAS)
     const updateModalFormWithDefaults = (defaultsToApply, representativeTitle, datasetNames = []) => { /* ... (código anterior) ... */
         const safeDatasetNames = datasetNames || []; getEl('teia-edit-title').value = representativeTitle; getEl('teia-edit-title-font').value = defaultsToApply.fontsize[0]; getEl('teia-edit-title-color').value = defaultsToApply.color_title; getEl('teia-edit-legend-pos').value = defaultsToApply.legendPos; const colorCont = getEl('edit-lines-colors'); if (colorCont) { colorCont.querySelectorAll('input[type="color"]').forEach((inp, i) => { inp.value = defaultsToApply.linesColor[i % defaultsToApply.linesColor.length]; }); } getEl('teia-edit-bg-color').value = defaultsToApply.bgColor; const visCont = getEl('edit-visibility-settings'); if (visCont) { visCont.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true); } getEl('teia-edit-category-font').value = defaultsToApply.fontsize[1]; getEl('teia-edit-legend-font').value = defaultsToApply.fontsize[2]; getEl('teia-edit-text-color').value = defaultsToApply.textColor; getEl('teia-edit-point-border-color').value = defaultsToApply.pointBorderColor; getEl('teia-edit-grid-lines-color').value = defaultsToApply.gridLinesColor; getEl('teia-edit-line-thickness-global').value = defaultsToApply.lineWidth; getEl('teia-edit-point-radius-global').value = defaultsToApply.pointRadius; const checkTrunc = getEl('teia-edit-enable-point-label-truncation'); if(checkTrunc) checkTrunc.checked = defaultsToApply.enablePointLabelTruncation; getEl('teia-edit-point-label-truncate-words').value = defaultsToApply.pointLabelTruncateWords; getEl('teia-edit-point-label-max-width').value = defaultsToApply.pointLabelMaxWidthPixels; const checkScale = getEl('teia-adjust-scale'); if(checkScale) checkScale.checked = false;
     };

    // --- Abre o modal de edição (MODIFICADO para TeiaPair com UM botão e CORREÇÃO TÍTULO PREVIEW) ---
    const openEditModal = (dataId) => { // Recebe ID normal ou composto
        const dataItem = window.visualizacaoData?.[dataId]; if (!dataItem) { console.error("DataItem não encontrado:", dataId); alert(`Erro: Dados ${dataId} não encontrados.`); return; }
        const isSpecial = dataItem.type === 'TeiaPair'; let chartInstanceA, chartInstanceB; let representativeInstance; let representativeTitle = dataItem.title; let baseIdForSaving = dataId; let targetChartKeys = []; let chartDataAForPreview, chartDataBForPreview;
        // *** Títulos ORIGINAIS (do dataItem) para usar no RESET ***
        let originalTitleA = '', originalTitleB = '';
        // *** Títulos ATUAIS (do gráfico renderizado ou original se erro) para usar na PREVIEW inicial ***
        let titleAForPreview = '', titleBForPreview = '';

        if (isSpecial) { /* ... (lógica para pegar instâncias A/B, etc.) ... */
             baseIdForSaving = dataItem.originalIds.a; representativeTitle = dataItem.categoryName; const idA = dataItem.originalIds.a; const idB = dataItem.originalIds.b; const cat = dataItem.categoryName.replace(/[^a-zA-Z0-9]/g, '_'); const keyA = `radar_${idA}_${cat}`; const keyB = idB ? `radar_${idB}_${cat}` : null; chartInstanceA = window.charts[keyA]; chartInstanceB = keyB ? window.charts[keyB] : null; representativeInstance = chartInstanceA || chartInstanceB; if (chartInstanceA) targetChartKeys.push(keyA); if (chartInstanceB) targetChartKeys.push(keyB); chartDataAForPreview = dataItem.chartDataA; chartDataBForPreview = dataItem.chartDataB;
             originalTitleA = chartDataAForPreview?.title || ''; // Título original de A
             originalTitleB = chartDataBForPreview?.title || ''; // Título original de B
             titleAForPreview = chartInstanceA?.currentOptions?.title || originalTitleA; // Título ATUAL de A
             titleBForPreview = chartInstanceB?.currentOptions?.title || originalTitleB; // Título ATUAL de B
        } else { /* ... (lógica para Teia Normal) ... */
             baseIdForSaving = dataId; representativeTitle = dataItem.title; const chartKey = `radar_${dataId}`; chartInstanceA = window.charts[chartKey]; representativeInstance = chartInstanceA; targetChartKeys = [chartKey]; chartDataAForPreview = dataItem;
             originalTitleA = dataItem.title; // Título original
             titleAForPreview = representativeInstance?.currentOptions?.title || originalTitleA; // Título ATUAL
             chartInstanceB = null; chartDataBForPreview = null; titleBForPreview = ''; originalTitleB = '';
        }
        if (targetChartKeys.length === 0 || !representativeInstance?.canvas || !representativeInstance?.currentOptions || !representativeInstance?.config?.options) { console.error(`Instância representativa inválida para ${dataId}.`); alert(`Erro: Configs inválidas ${dataId}.`); return; }

        const d = defaults(); const currentFlatOptions = representativeInstance.currentOptions; const datasets = representativeInstance.config.data.datasets || []; const currentBgColorRGB = representativeInstance.canvas.style.backgroundColor || currentFlatOptions.bgColor || d.bgColor; const currentBgColorHEX = typeof rgbToHex === 'function' ? rgbToHex(currentBgColorRGB) : '#fff';
        // *** USA representativeTitle (categoria ou título ATUAL/original normal) para o CAMPO title no modal ***
        let modalTitleFieldContent = isSpecial ? representativeTitle : titleAForPreview;
        if (Array.isArray(modalTitleFieldContent)) modalTitleFieldContent = modalTitleFieldContent.join('\n');
        const settingsForModal = { /* ... (monta settingsForModal como antes, usando modalTitleFieldContent para 'title') ... */
            isSpecialPair: isSpecial, bgColor: currentBgColorHEX, title: modalTitleFieldContent, titleFont: currentFlatOptions.titleFont ?? d.fontsize[0], titleColor: currentFlatOptions.titleColor ?? d.color_title, legendPos: currentFlatOptions.legendPos ?? d.legendPos, legendFont: currentFlatOptions.legendFont ?? d.fontsize[2], textColor: currentFlatOptions.textColor ?? d.textColor, categoryFont: currentFlatOptions.categoryFont ?? d.fontsize[1], pointBorderColor: currentFlatOptions.pointBorderColor ?? d.pointBorderColor, gridLinesColor: currentFlatOptions.gridLinesColor ?? d.gridLinesColor, lineWidth: currentFlatOptions.lineWidth ?? d.lineWidth, pointRadius: currentFlatOptions.pointRadius ?? d.pointRadius, adjustScale: currentFlatOptions.adjustScale ?? false, pointLabelMaxWidthPixels: currentFlatOptions.pointLabelMaxWidthPixels ?? d.pointLabelMaxWidthPixels, enablePointLabelTruncation: currentFlatOptions.enablePointLabelTruncation ?? d.enablePointLabelTruncation, pointLabelTruncateWords: currentFlatOptions.pointLabelTruncateWords ?? d.pointLabelTruncateWords, datasetNames: datasets.map(ds => ds.label || 'Grupo'), linesColor: currentFlatOptions.linesColor ?? datasets.map((_,i) => d.linesColor[i % d.linesColor.length]), datasetVisibility: currentFlatOptions.datasetVisibility ?? datasets.map(ds => !ds.hidden)
        };

        const overlay = createOverlay(); const modal = createEl('div', { classes: ['edit-modal', 'modal-component', (isSpecial ? 'large-modal' : '')] }); modal.innerHTML = buildModalHTML(settingsForModal); overlay.appendChild(modal);

        // --- Renderiza Preview(s) ---
        const modalCanvasA = getEl('modalTeiaCanvas'); const modalCanvasB = getEl('modalTeiaCanvasB');
        let modalChartA = null; let modalChartB = null;
        // *** Usa titleA/BForPreview (títulos ATUAIS) para renderizar previews iniciais ***
        if (modalCanvasA && chartDataAForPreview?.dfDados) { const initialOptsA = { ...settingsForModal, title: titleAForPreview }; modalChartA = plot(chartDataAForPreview, initialOptsA, 'modalTeiaCanvas'); if (modalChartA) modalChartA.currentOptions = JSON.parse(JSON.stringify(initialOptsA)); } else if(modalCanvasA) { modalCanvasA.outerHTML = '<p>Erro</p>'; }
        if (isSpecial && modalCanvasB && chartDataBForPreview?.dfDados) { const initialOptsB = { ...settingsForModal, title: titleBForPreview }; modalChartB = plot(chartDataBForPreview, initialOptsB, 'modalTeiaCanvasB'); if (modalChartB) modalChartB.currentOptions = JSON.parse(JSON.stringify(initialOptsB)); } else if (isSpecial && modalCanvasB) { modalCanvasB.outerHTML = '<p>Sem dados (b)</p>'; }

        // --- Configura Atualização da Preview (CORRIGIDO para título) ---
        const updatePreview = (changedInputId) => {
            const formValues = getFormValues(settingsForModal.datasetNames); // Lê form (inclui title do input)
            let titleForPreviewA = titleAForPreview; // Default: mantém título atual/original de A
            let titleForPreviewB = titleBForPreview; // Default: mantém título atual/original de B

            // Se NÃO for especial e o input de TÍTULO mudou, atualiza o título da preview A
            if (!isSpecial && changedInputId === 'teia-edit-title') {
                titleForPreviewA = formValues.title;
            }

            // Aplica settings, passando o título CORRETO para cada preview
            if (modalChartA) { applySettings(modalChartA, formValues, isSpecial, titleForPreviewA); }
            if (modalChartB) { applySettings(modalChartB, formValues, true, titleForPreviewB); } // Sempre subgráfico
        };
        modal.querySelectorAll('.settings-container input, .settings-container select').forEach(el => { const evt = (el.type === 'text' || el.type === 'number' || el.type === 'color' || el.type === 'range') ? 'input' : 'change'; el.addEventListener(evt, (e) => updatePreview(e.target.id)); });
        onClick('teia-toggle-additional-btn', () => { getEl('teia-toggle-additional-btn').style.display='none'; modal.querySelector('.additional-settings').style.display='block'; }); onClick('teia-toggle-additional-btn-hide', () => { getEl('teia-toggle-additional-btn').style.display='block'; modal.querySelector('.additional-settings').style.display='none'; });

        // --- Botão Aplicar (CORRIGIDO para passar títulos corretos) ---
        onClick('teia-apply-btn', () => {
            const newSettingsFromForm = getFormValues(settingsForModal.datasetNames); const scope = getVal('teia-apply-scope');
            let settingsToSave = { ...newSettingsFromForm }; if (isSpecial) { delete settingsToSave.title; }

            const applyAction = (targetKey) => {
                const targetInstance = window.charts[targetKey]; if (!targetInstance) return;
                const currentOptions = targetInstance.currentOptions || {};
                const isTargetSpecial = !!currentOptions.originalIds;
                let settingsForThis = {}; let actualTitleA = '', actualTitleB = '';

                if (isTargetSpecial) {
                    // Para TeiaPair, os títulos são os ORIGINAIS A/B (não do form)
                    actualTitleA = originalTitleA; // Usa o original guardado
                    actualTitleB = originalTitleB; // Usa o original guardado
                    settingsForThis = {...newSettingsFromForm}; // Estilos do form
                } else {
                    // Para Teia Normal
                    if (scope === 'this' || targetInstance === representativeInstance) {
                        actualTitleA = newSettingsFromForm.title; // Usa título do form
                    } else {
                        actualTitleA = currentOptions.title || targetInstance.config.options.plugins.title._intendedText || ''; // Mantém título existente
                    }
                     settingsForThis = {...newSettingsFromForm, title: actualTitleA };
                }

                // Aplica às instâncias reais
                if (isTargetSpecial) {
                     const keyA = targetChartKeys.find(k => k === targetKey || window.charts[k]?.currentOptions?.originalIds?.a === currentOptions.originalIds.a);
                     const keyB = targetChartKeys.find(k => k !== keyA);
                     if(window.charts[keyA]) applySettings(window.charts[keyA], settingsForThis, true, actualTitleA);
                     if(keyB && window.charts[keyB]) applySettings(window.charts[keyB], settingsForThis, true, actualTitleB);
                } else {
                    if (targetInstance) applySettings(targetInstance, settingsForThis, false, actualTitleA);
                }
            };

            if (scope === 'this') { targetChartKeys.forEach(key => applyAction(key)); if (window.configTeia) window.configTeia[baseIdForSaving] = settingsToSave; }
            else { /* ... (lógica apply all - precisa garantir que applyAction receba títulos corretos) ... */
                 const processedBaseIds = new Set();
                 Object.keys(window.charts).filter(k => k.startsWith('radar_')).forEach(chartKey => {
                     const instance = window.charts[chartKey]; if (!instance) return;
                     const currentOptions = instance.currentOptions || {};
                     const instanceIsSpecial = !!currentOptions.originalIds;
                     const instanceBaseId = instanceIsSpecial ? currentOptions.originalIds.a : chartKey.substring(6);
                     if (!processedBaseIds.has(instanceBaseId)) {
                          applyAction(chartKey); // applyAction determina os títulos corretos internamente
                          processedBaseIds.add(instanceBaseId);
                          let configToSaveForThis = {...instance.currentOptions};
                          if(instanceIsSpecial) delete configToSaveForThis.title;
                          if(instanceBaseId && window.configTeia) window.configTeia[instanceBaseId] = configToSaveForThis;
                     }
                 });
            }
            console.log("Saving configs:", JSON.stringify(window.configTeia)); closeModal(overlay);
        });

        // --- Botão Resetar (CORRIGIDO para passar títulos originais corretos) ---
        onClick('teia-reset-btn', () => {
            const scope = getVal('teia-reset-scope');
            const resetAction = (targetKey) => {
                 const targetInstance = window.charts[targetKey]; if (!targetInstance) return;
                 const currentOptions = targetInstance.currentOptions || {};
                 const isTargetSpecial = !!currentOptions.originalIds;
                 let targetBaseId = isTargetSpecial ? currentOptions.originalIds.a : targetKey.substring(6);
                 // Usa o ID do item que ABRIU o modal para buscar o dataItem correto
                 const targetDataItem = window.visualizacaoData[dataId];
                 if (!targetDataItem) { console.warn(`Reset: DataItem não encontrado para ${dataId}`); return; }

                 let originalTitleA_reset = '', originalTitleB_reset = '';
                 if (isTargetSpecial) { originalTitleA_reset = targetDataItem.chartDataA?.title || ''; originalTitleB_reset = targetDataItem.chartDataB?.title || ''; }
                 else { originalTitleA_reset = targetDataItem.title || ''; }

                 if (isTargetSpecial) {
                      const keyA = targetKey;
                      const keyB = targetChartKeys.find(k => k !== keyA && k.startsWith(`radar_${currentOptions.originalIds.b}_`));
                      if(window.charts[keyA]) resetSettings(window.charts[keyA], true, originalTitleA_reset);
                      if(keyB && window.charts[keyB]) resetSettings(window.charts[keyB], true, originalTitleB_reset);
                 } else { if(targetInstance) resetSettings(targetInstance, false, originalTitleA_reset); }
                 if (window.configTeia && targetBaseId && window.configTeia[targetBaseId]) { delete window.configTeia[targetBaseId]; console.log(` -> Config removida para ${targetBaseId}`); }
            };

            if (scope === 'this') { targetChartKeys.forEach(key => resetAction(key)); }
            else { const resetBaseIds = new Set(); Object.keys(window.charts).filter(k => k.startsWith('radar_')).forEach(chartKey => { const instance = window.charts[chartKey]; if (!instance) return; const currentOptions = instance.currentOptions || {}; const instanceIsSpecial = !!currentOptions.originalIds; const instanceBaseId = instanceIsSpecial ? currentOptions.originalIds.a : chartKey.substring(6); if (!resetBaseIds.has(instanceBaseId)) { resetAction(chartKey); resetBaseIds.add(instanceBaseId); } }); window.configTeia = {}; }

            // Reseta preview e formulário
            const gDefs = defaults(); let previewResetOpts = { ...gDefs, title: representativeTitle }; previewResetOpts = processSavedOptions(previewResetOpts, representativeTitle);
            if(modalChartA){ resetSettings(modalChartA, isSpecial, originalTitleA); } // Usa título ORIGINAL de A
            if(modalChartB){ resetSettings(modalChartB, true, originalTitleB); }      // Usa título ORIGINAL de B
            updateModalFormWithDefaults(gDefs, representativeTitle, settingsForModal.datasetNames);
            console.log("Resetting configs:", JSON.stringify(window.configTeia)); closeModal(overlay);
        });

        onClick('teia-close-edit-btn', () => { closeModal(overlay); });
    }; // Fim openEditModal

    // --- Função de Inicialização (CORRIGIDA Tabela Perguntas e Botão Editar Par) ---
    const init = () => { /* ... (código anterior init - sem mudanças aqui) ... */
         const savedRadarConfigs = window.configTeia || {}; const savedPerguntasConfigs = window.configPerguntas || {}; const createEl = (tag, options = {}) => { const el = document.createElement(tag); if (options.classes) el.classList.add(...options.classes); if (options.text) el.textContent = options.text; if (options.html) el.innerHTML = options.html; if (options.id) el.id = options.id; if (options.style) el.style.cssText = options.style; if (options.attributes) { for (const key in options.attributes) el.setAttribute(key, options.attributes[key]); } return el; }; const getEl = (selector) => document.getElementById(selector);
         document.querySelectorAll('.square[data-type="grafico_de_teia"]').forEach((square) => { const dataId = square.getAttribute('data-id'); square.innerHTML = ''; if (!dataId) { console.error("Square Teia Normal sem ID."); square.innerHTML = `<p class="error-msg">Erro ID.</p>`; return; } const dataItem = window.visualizacaoData?.[dataId]; if (!dataItem || dataItem.type !== 'Teia' || !dataItem.dfDados || !dataItem.groupSizes || !dataItem.dfPerg) { console.error(`Dados Teia Normal ${dataId} inválidos.`); square.innerHTML = `<p class="error-msg">Erro Dados ${dataId}.</p>`; return; } console.log(`Init Teia Normal: ${dataId}`); const chartWrapper = createEl('div', { classes: ['chart-wrapper'], style:'position:relative;flex-grow:1;width:100%;min-height:300px;' }); const canvasId = `chartCanvas_radar_${dataId}`; const canvas = createEl('canvas', { attributes:{id:canvasId}, style:'width:100%;height:100%;' }); const editBtn = createEl('button', { classes:['square-edit-btn','edit-chart-btn'], text:'Editar Gráfico' }); editBtn.onclick = () => openEditModal(dataId); const separator = createEl('div', { classes: ['perguntas-separator'] }); const collapseBtn = createEl('button', { classes:['collapse-perguntas-btn'], html:'▼', attributes:{title:'Recolher/Expandir'} }); separator.appendChild(collapseBtn); const tableContainerId = `perguntasTable_radar_${dataId.replace(/\./g, '-')}`; const tableWrapper = createEl('div', { classes:['perguntas-table-wrapper'], id:tableContainerId }); chartWrapper.append(canvas, editBtn); square.append(chartWrapper, separator, tableWrapper); const editPergBtn = createEl('button', { classes: ['square-edit-btn', 'edit-perguntas-btn'], text: 'Editar Perguntas' }); editPergBtn.onclick = (e) => { e.stopPropagation(); if(typeof PerguntasTable?.openEditModal === 'function'){ PerguntasTable.openEditModal(dataId); } else { console.error('PerguntasTable.openEditModal not found.'); } }; tableWrapper.appendChild(editPergBtn); let initOptsChart = processSavedOptions(savedRadarConfigs[dataId] || null, dataItem.title); const chart = plot(dataItem, initOptsChart, canvasId); if (chart) { const key = `radar_${dataId}`; window.charts[key] = chart; chart.currentOptions = JSON.parse(JSON.stringify(initOptsChart)); } else { console.error(`Falha Teia Normal ${dataId}.`); } if (dataItem.dfPerg?.data?.length > 0) { if (typeof PerguntasTable?.plot === 'function') { const pOpts = savedPerguntasConfigs[dataId] || {}; const iPOpts = { ...(window.defaultPerguntasTableSettings||{}), ...pOpts }; try { PerguntasTable.plot(dataItem.dfPerg, tableContainerId, iPOpts, dataId); } catch (plotError) { console.error(`Erro PerguntasTable.plot ${dataId}:`, plotError); tableWrapper.innerHTML = '<p class="error-msg">Erro tabela.</p>'; } } else { console.error("PerguntasTable.plot não encontrado."); tableWrapper.innerHTML = '<p>Erro Tabela.</p>'; } } else { tableWrapper.innerHTML += '<p class="no-perguntas-msg">Perguntas não disponíveis.</p>'; } });
         document.querySelectorAll('.square[data-type="teia_pair_special"]').forEach((square) => { const dataId = square.getAttribute('data-id'); square.innerHTML = ''; if (!dataId) { console.error("Square TeiaPair sem ID."); square.innerHTML = `<p class="error-msg">Erro ID.</p>`; return; } const dataItem = window.visualizacaoData?.[dataId]; if (!dataItem || dataItem.type !== 'TeiaPair' || !dataItem.originalIds?.a || !dataItem.categoryName || !dataItem.dfPerg) { console.error(`Dados TeiaPair ${dataId} inválidos.`); square.innerHTML = `<p class="error-msg">Erro Dados TeiaPair ${dataId}.</p>`; return; } if (!dataItem.chartDataA && !dataItem.chartDataB) { console.warn(`TeiaPair ${dataId} sem dados A ou B.`); } console.log(`Init TeiaPair: ${dataId} (Base: ${dataItem.originalIds.a})`); const baseId = dataItem.originalIds.a; const idA = dataItem.originalIds.a; const idB = dataItem.originalIds.b; const category = dataItem.categoryName; const sanCat = category.replace(/[^a-zA-Z0-9]/g, '_'); square.appendChild(createEl('h4', { classes: ['teia-pair-category-title'], text: category })); const chartsRow = createEl('div', { classes: ['category-charts-row'] }); square.appendChild(chartsRow); const editBtnPair = createEl('button', { classes: ['square-edit-btn', 'edit-chart-btn', 'edit-pair-btn'], text: 'Editar Par' }); editBtnPair.onclick = () => openEditModal(dataId); chartsRow.appendChild(editBtnPair); const wrapperA = createEl('div', { classes:['chart-wrapper','sub-chart'] }); const canvasIdA = `chartCanvas_radar_${idA}_${sanCat}`; const canvasA = createEl('canvas', { attributes:{id:canvasIdA}, style:'width:100%;height:100%;' }); wrapperA.appendChild(canvasA); chartsRow.appendChild(wrapperA); let wrapperB, canvasIdB, canvasB; if (idB) { wrapperB = createEl('div', { classes:['chart-wrapper','sub-chart'] }); canvasIdB = `chartCanvas_radar_${idB}_${sanCat}`; canvasB = createEl('canvas', { attributes:{id:canvasIdB}, style:'width:100%;height:100%;' }); wrapperB.appendChild(canvasB); chartsRow.appendChild(wrapperB); } else { chartsRow.appendChild(createEl('div', {classes:['sub-chart-placeholder'], html:`<p>Gráfico (b)<br>Inválido.</p>`})); } const tableContainerId = `perguntasTable_radar_${baseId}_${sanCat}`; const separator = createEl('div',{classes:['perguntas-separator']}); const collBtn = createEl('button',{classes:['collapse-perguntas-btn'],html:'▼',attributes:{title:'Recolher/Expandir'}}); separator.appendChild(collBtn); const tableWrapper = createEl('div',{classes:['perguntas-table-wrapper'],id:tableContainerId}); square.append(separator, tableWrapper); if (dataItem.chartDataA?.dfDados) { let optsA = processSavedOptions(savedRadarConfigs[baseId] || null, dataItem.chartDataA.title); optsA.categoryName = category; optsA.originalIds = dataItem.originalIds; const chartA = plot(dataItem.chartDataA, optsA, canvasIdA); if (chartA) { const keyA = `radar_${idA}_${sanCat}`; window.charts[keyA] = chartA; chartA.currentOptions = JSON.parse(JSON.stringify(optsA)); } else { console.error(`Falha sub-gráfico A: ${dataId}`); } } else { wrapperA.innerHTML = '<p class="sub-chart-placeholder-text">Gráfico (a)<br>sem dados.</p>'; wrapperA.classList.add('sub-chart-placeholder'); wrapperA.style.borderBottom = '1px dashed #e0e0e0'; } if (dataItem.chartDataB?.dfDados && wrapperB && canvasIdB) { let optsB = processSavedOptions(savedRadarConfigs[baseId] || null, dataItem.chartDataB.title); optsB.categoryName = category; optsB.originalIds = dataItem.originalIds; const chartB = plot(dataItem.chartDataB, optsB, canvasIdB); if (chartB) { const keyB = `radar_${idB}_${sanCat}`; window.charts[keyB] = chartB; chartB.currentOptions = JSON.parse(JSON.stringify(optsB)); } else { console.error(`Falha sub-gráfico B: ${dataId}`); } } else if (wrapperB) { wrapperB.innerHTML = '<p class="sub-chart-placeholder-text">Gráfico (b)<br>sem dados.</p>'; wrapperB.classList.add('sub-chart-placeholder'); } const editPergBtn = createEl('button', { classes: ['square-edit-btn', 'edit-perguntas-btn'], text: 'Editar Perguntas' }); editPergBtn.onclick = (e) => { e.stopPropagation(); if(typeof PerguntasTable?.openEditModal === 'function'){ PerguntasTable.openEditModal(baseId); } else { console.error('PerguntasTable.openEditModal not found.'); } }; tableWrapper.appendChild(editPergBtn); if (dataItem.dfPerg?.data?.length > 0) { if (typeof PerguntasTable?.plot === 'function') { const pOpts = savedPerguntasConfigs[baseId] || {}; const iPOpts = { ...(window.defaultPerguntasTableSettings||{}), ...pOpts }; try { PerguntasTable.plot(dataItem.dfPerg, tableContainerId, iPOpts, baseId); } catch (plotError) { console.error(`Erro PerguntasTable.plot ${baseId} (TeiaPair ${dataId}):`, plotError); tableWrapper.innerHTML = '<p>Erro Tabela.</p>'; } } else { console.error("PerguntasTable.plot não encontrado."); tableWrapper.innerHTML = '<p>Erro Tabela.</p>'; } } else { tableWrapper.innerHTML += '<p class="no-perguntas-msg">Perguntas não disponíveis.</p>'; } });

    }; // Fim init

    // Expõe funções públicas do módulo
    return { init, plot, openEditModal };

})(); // Fim do IIFE RadarChart