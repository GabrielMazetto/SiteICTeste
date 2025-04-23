/* bar-chart.js */
/* Lógica para Gráficos de Barras Empilhadas. Adaptado para usar window.visualizacaoData e data-id. */
/* CORRIGIDO v15: Garante presença de categorias padrão ('Bastante'...'Nada') na legenda se uma delas existir. */

const BarChart = (() => {

    const defaults = () => window.defaultBarSettings || {};
    const minCategories = 4; // Mínimo de BARRAS visuais (padding de largura)

    // Obtém cores
    const getBarColors = (cols, settings) => {
        const { bar_colorsMap, bar_colors } = settings;
        return cols.map((col, i) =>
            bar_colorsMap?.[col] ??
            (bar_colors?.[i]) ??
            clarearCor('#808080', Math.min(1, 0.1 + 0.1 * i))
        );
     };

    // Configura as opções aninhadas do Chart.js a partir das settings planas
    const configureChartOptions = (settings, numTotalCategories) => { // numTotalCategories inclui dummies de largura
        const d = defaults();
        const {
            title, pad_title, titleColor, legendPos, textColor,
            percent_text_color, percentFontSize,
            titleFont, xtickFont, legendFont, ytickFont,
            barPercentage
        } = { ...d, ...settings };

        const szTitle = titleFont ?? d.fontsize[0] ?? 16;
        const szX = xtickFont ?? d.fontsize[1] ?? 10;
        const szLegend = legendFont ?? d.fontsize[2] ?? 10;
        const szY = ytickFont ?? d.fontsize[3] ?? 10;
        const finalPercentFontSize = percentFontSize ?? szX;

        const chartTitleString = title || ''; 

        return {
            plugins: {
                title: {
                    display: !!chartTitleString.trim(), // Exibe se o título não estiver vazio
                    text: chartTitleString, // Passa a string completa para Chart.js
                    _intendedText: chartTitleString, // *** ARMAZENA O TEXTO ORIGINAL AQUI ***
                    font: { size: szTitle },
                    color: titleColor ?? d.color_title,
                    padding: { top: pad_title, bottom: pad_title }
                },
                legend: { display: true, position: legendPos, onClick: () => {}, labels: { font: { size: szLegend }, color: textColor } },
                tooltip: { callbacks: { label: ctx => `${ctx.dataset.label || ''}: ${Math.round(ctx.parsed.y)}%` } },
                percentPlugin: {
                    percent_text_color: percent_text_color ?? d.percent_text_color ?? '#000000',
                    percentFontSize: finalPercentFontSize
                }
            },
             percent_text_color: percent_text_color ?? d.percent_text_color ?? '#000000',
             percentFontSize: finalPercentFontSize,
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    categoryPercentage: 0.9,
                    barPercentage: barPercentage ?? d.barPercentage ?? 0.8,
                    grid: { display: false, drawBorder: false },
                    ticks: {
                        autoSkip: false,
                        color: textColor,
                        font: { size: szX },
                        padding: 5
                        // Callback adicionado depois se necessário
                    }
                },
                y: {
                    stacked: true,
                    min: 0,
                    max: 100,
                    grid: { display: false, drawBorder: false },
                    ticks: {
                        stepSize: 20,
                        color: textColor,
                        font: { size: szY },
                        callback: val => val + '%'
                    }
                }
            }
        };
    }; // Fim configureChartOptions

    // Plota o gráfico inicial *** CORRIGIDO: Lógica de categorias padrão ***
    const plot = (dfDados, options = {}, canvasId) => {
        const settings = { ...defaults(), ...options }; // options é 'flat'
        const { bgColor, figsize } = settings;
        const standardCategories = ['Bastante', 'Médio', 'Pouco', 'Nada']; // Categorias padrão

         if (!dfDados || !dfDados.index || !dfDados.columns || !dfDados.data || dfDados.index.length === 0 ) {
             /* ... erro ... */ return null;
        }

        // Calcula percentuais
        const df_percentual = {
            index: [...dfDados.index], // Labels reais (eixo X)
            columns: [...dfDados.columns], // Colunas originais (categorias legenda)
            data: dfDados.data.map(row => { const sum = row.reduce((acc, val) => acc + (parseFloat(val) || 0), 0); return Array.isArray(row) ? row.map(val => sum > 0 ? ((parseFloat(val) || 0) / sum * 100) : 0) : []; })
         };

        // --- <<< LÓGICA PARA GARANTIR CATEGORIAS PADRÃO E ORDENAR >>> ---
        const originalCols = [...df_percentual.columns];
        const originalData = df_percentual.data;
        let processedCols = []; // Colunas finais para legenda e datasets
        let processedData = originalData.map(() => []); // Inicializa estrutura de dados final

        // Verifica se alguma categoria padrão existe nos dados originais
        const hasAnyStandard = standardCategories.some(sc => originalCols.includes(sc));

        if (hasAnyStandard) {
            // Adiciona categorias padrão na ordem correta
            standardCategories.forEach(stdCat => {
                processedCols.push(stdCat);
                const originalIndex = originalCols.indexOf(stdCat);
                originalData.forEach((rowData, rowIndex) => {
                    processedData[rowIndex].push(originalIndex !== -1 ? rowData[originalIndex] : 0); // Pega dado ou adiciona 0
                });
            });

            // Adiciona outras categorias (exceto as padrão) ordenadas alfabeticamente
            const otherCols = originalCols
                .filter(c => !standardCategories.includes(c))
                .sort((a, b) => a.localeCompare(b)); // Ordena alfabeticamente

            otherCols.forEach(otherCol => {
                processedCols.push(otherCol);
                const originalIndex = originalCols.indexOf(otherCol); // Índice deve existir
                originalData.forEach((rowData, rowIndex) => {
                     // Se originalIndex for -1 (não deveria acontecer aqui), adiciona 0 por segurança
                    processedData[rowIndex].push(originalIndex !== -1 ? rowData[originalIndex] : 0);
                });
            });
            console.log(`BarChart ${canvasId.replace('chartCanvas_bar_', '')}: Categorias padrão garantidas. Ordem final: ${processedCols.join(', ')}`);

        } else {
            // Nenhuma categoria padrão encontrada, usa a lógica de ordenação original
            console.log(`BarChart ${canvasId.replace('chartCanvas_bar_', '')}: Nenhuma categoria padrão encontrada. Usando ordenação original.`);
            const orderedFallback = ['Bastante', 'Médio', 'Pouco', 'Nada', 'Outros']; // Ordem de fallback
            const knownCols = orderedFallback.filter(c => originalCols.includes(c));
            const otherUnkCols = originalCols.filter(c => !orderedFallback.includes(c)).sort((a, b) => a.localeCompare(b));
            processedCols = [...knownCols, ...otherUnkCols]; // Colunas ordenadas
            const originalIndexMap = originalCols.map(c => c);
            const newOrderIndices = processedCols.map(c => originalIndexMap.indexOf(c));
            processedData = originalData.map(row => newOrderIndices.map(idx => (idx !== -1 && Array.isArray(row) && idx < row.length) ? row[idx] : 0));
        }
        // --- <<< FIM LÓGICA CATEGORIAS PADRÃO >>> ---


        // --- <<< LÓGICA DE PADDING DE LARGURA (usa df_percentual.index) >>> ---
        let finalLabels = [...df_percentual.index]; // Labels reais do eixo X
        const numRealBars = finalLabels.length;
        let needsPadding = false;
        let barPercentageToUse = settings.barPercentage ?? defaults().barPercentage ?? 0.8;

        if (numRealBars > 0 && numRealBars < minCategories) {
            needsPadding = true;
            const dummiesNeeded = minCategories - numRealBars;
            for (let i = 0; i < dummiesNeeded; i++) {
                finalLabels.push(''); // Adiciona label vazio para espaçamento
                // Adiciona zeros aos dados processados para corresponder aos labels dummies
                processedData = processedData.map(rowData => Array.isArray(rowData) ? [...rowData, 0] : rowData);
            }
            // Ajusta a largura visual da barra
            barPercentageToUse = (settings.barPercentage ?? defaults().barPercentage ?? 0.8) * (numRealBars / minCategories);
             console.log(` -> barPercentage ajustado para: ${barPercentageToUse.toFixed(2)}`);
        }
        // --- <<< FIM LÓGICA DE PADDING DE LARGURA >>> ---

        // Prepara datasets usando processedCols e processedData (que agora tem a ordem e os zeros corretos)
        const cores = getBarColors(processedCols, settings); // Usa colunas processadas
        const datasets = processedCols.map((col, j) => ({
            label: col,
            data: processedData.map(row => (Array.isArray(row) && j < row.length) ? row[j] : 0),
            backgroundColor: cores[j],
            borderWidth: 0
        }));

        // Gera opções aninhadas, passando o barPercentage ajustado (ou original)
        // Passa número TOTAL de labels (incluindo dummies de largura)
        const settingsForConfig = { ...settings, barPercentage: barPercentageToUse };
        const chartOptionsNested = configureChartOptions(settingsForConfig, finalLabels.length);

        // Adiciona callback para esconder ticks dummy SE padding foi necessário
        if (needsPadding) {
            if (!chartOptionsNested.scales?.x?.ticks) {
                 if (!chartOptionsNested.scales) chartOptionsNested.scales = {};
                 if (!chartOptionsNested.scales.x) chartOptionsNested.scales.x = {};
                 chartOptionsNested.scales.x.ticks = {};
             }
            chartOptionsNested.scales.x.ticks.callback = function(value, index, ticks) {
                const label = this.getLabelForValue(value);
                return label === '' ? null : label; // Esconde labels vazios
            };
             if (chartOptionsNested.scales.x.grid) {
                 chartOptionsNested.scales.x.grid.color = (context) => context.index >= numRealBars ? 'transparent' : Chart.defaults.borderColor;
             }
        }

        // Cria o gráfico
        const canvas = getEl(canvasId);
        if (!canvas) { console.error("BarChart.plot: Canvas element not found:", canvasId); return null; }
        const existingChart = Chart.getChart(canvas);
        if (existingChart) { existingChart.destroy(); }

        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'bar',
            data: { labels: finalLabels, datasets }, // Usa labels finais (com padding) e datasets processados
            options: chartOptionsNested
        });

        // Aplica estilos externos
        chart.canvas.style.backgroundColor = bgColor;
        if (figsize?.length === 2) { chart.resize(figsize[0], figsize[1]); }

        // *** CHAMA applySettings para garantir que currentOptions seja setado corretamente ***
        applySettings(chart, settings);

        return chart;
    }; // Fim plot


    // --- Funções de Edição (Modal) ---

    // Constrói HTML do modal
    const buildModalHTML = (params) => {
        const {
            title, titleFont, titleColor, legendPos, legendFont,
            textColor, percentColor, bgColor, datasetNames, datasetColors,
            xtickFont, ytickFont, percentFont
        } = params;
        const d = defaults();
        const colorInputs = datasetNames.map((name, i) => { const defaultColor = d.bar_colorsMap?.[name] ?? d.bar_colors?.[i] ?? '#cccccc'; const currentColor = datasetColors[i] ?? defaultColor; return `<div class="group-color-item"><span>${name}:</span><input type="color" id="edit-group-color-${i}" value="${currentColor}"></div>`; }).join('');
        const legendOptions = buildOptions(['right', 'top', 'left', 'bottom'], legendPos, d.legendPos);
        return `
          <div class="graph-container">
            <canvas id="modalChartCanvas" style="height:300px;width:100%; background-color:${bgColor ?? d.bgColor ?? '#ffffff'}; border: 1px solid #ccc;"></canvas>
          </div>
          <div class="settings-container"><h3>Editar Gráfico de Barras</h3>
            <div class="basic-settings">
                <div class="settings-group"><label>Título:</label><input type="text" id="edit-title" value="${title ?? d.title ?? ''}"></div>
                <div class="settings-group"><label>Tam. Fonte Título:</label><input type="number" id="edit-title-font" value="${titleFont ?? d.fontsize[0] ?? 16}"></div>
                <div class="settings-group"><label>Cor Título:</label><input type="color" id="edit-title-color" value="${titleColor ?? d.color_title ?? '#000000'}"></div>
                <div class="settings-group"><label>Posição Legenda:</label><select id="edit-legend-pos">${legendOptions}</select></div>
                <div class="settings-group"><label>Cores Grupos:</label><div id="edit-group-colors">${colorInputs}</div>
            </div>
            <div class="settings-group"><label>Cor Fundo Gráfico:</label><input type="color" id="edit-bg-color" value="${bgColor ?? d.bgColor ?? '#ffffff'}"></div>
            <button id="toggle-additional-btn">Mais Configurações</button>
        </div>
        <div class="additional-settings" style="display:none;">
            <div class="settings-group"><label>Tam. Fonte Eixo X:</label><input type="number" id="edit-xtick-font" value="${xtickFont ?? d.fontsize[1] ?? 10}"></div>
            <div class="settings-group"><label>Tam. Fonte Eixo Y:</label><input type="number" id="edit-ytick-font" value="${ytickFont ?? d.fontsize[3] ?? 10}"></div>
            <div class="settings-group"><label>Tam. Fonte Legenda:</label><input type="number" id="edit-legend-font" value="${legendFont ?? d.fontsize[2] ?? 10}"></div>
            <div class="settings-group"><label>Tam. Fonte %:</label><input type="number" id="edit-percent-font" value="${percentFont ?? d.fontsize[1] ?? 10}"></div>
            <div class="settings-group"><label>Cor Texto %:</label><input type="color" id="edit-percent-color" value="${percentColor ?? d.percent_text_color ?? '#000000'}"></div>
            <div class="settings-group"><label>Cor Texto Geral (Eixos/Legenda):</label><input type="color" id="edit-text-color" value="${textColor ?? d.textColor ?? '#000000'}"></div>
            <button id="toggle-additional-btn-hide">Menos Configurações</button>
        </div>
        <div class="settings-buttons">
            <div class="btn-group"><button id="apply-btn">Aplicar</button><select id="apply-scope"><option value="this">Neste</option><option value="all">Em Todos</option></select></div>
            <div class="btn-group"><button id="reset-btn">Voltar ao Padrão</button><select id="reset-scope"><option value="this">Neste</option><option value="all">Em Todos</option></select></div>
            <button id="close-edit-btn">Cancelar</button></div>
        </div>`;
     };


    // Lê valores do form (retorna objeto plano)
    const getFormValues = (datasetNames) => {
        const d = defaults();
        return {
            title: getVal('edit-title'), titleFont: getIntVal('edit-title-font', d.fontsize[0]), titleColor: getVal('edit-title-color'), legendPos: getVal('edit-legend-pos'),
            percentFontSize: getIntVal('edit-percent-font', d.fontsize[1]), percent_text_color: getVal('edit-percent-color'), textColor: getVal('edit-text-color'),
            bgColor: getVal('edit-bg-color'), xtickFont: getIntVal('edit-xtick-font', d.fontsize[1]), ytickFont: getIntVal('edit-ytick-font', d.fontsize[3]),
            legendFont: getIntVal('edit-legend-font', d.fontsize[2]), bar_colorsMap: datasetNames.reduce((acc, name, i) => { const colorVal = getVal(`edit-group-color-${i}`); if (colorVal) acc[name] = colorVal; return acc; }, {})
        };
     }; // Fim getFormValues

    // Aplica settings planas a um gráfico (modifica chart.options diretamente)
    const applySettings = (chart, newSettingsFlat) => {
        if (!chart?.config || !chart.data || !newSettingsFlat) {
             console.error("applySettings (Bar): Instância ou novas configurações ausentes/inválidas.");
             return;
         }
        const opts = chart.options;
        const chartData = chart.data; // Dados atuais (podem ter padding)
        const d = defaults();

        // --- Lógica de Padding e Ajuste (Repetida aqui para consistência) ---
        // *** IMPORTANTE: Precisamos dos dados originais para recalcular o padding corretamente ***
        // *** Assumindo que dfDados originais estejam disponíveis de alguma forma, ex: chart.originalDfDados ***
        // *** Se não estiverem, o padding aplicado pode ficar incorreto após edições ***
        // *** SOLUÇÃO SIMPLES POR AGORA: Usar os labels atuais para recalcular ***
        let finalLabels = [...chartData.labels]; // Labels atuais (podem ter dummies)
        let processedDataArrays = chartData.datasets.map(ds => [...ds.data]); // Dados atuais
        const realLabelsFromCurrent = finalLabels.filter(l => l !== ''); // Labels reais atuais
        const numRealBars = realLabelsFromCurrent.length;

        let needsPadding = false;
        let barPercentageToUse = newSettingsFlat.barPercentage ?? d.barPercentage ?? 0.8;

        // Remove dummies antigos (se houver) para recalcular a partir dos reais
        const firstEmptyIndex = finalLabels.indexOf('');
        if (firstEmptyIndex !== -1) {
            finalLabels = finalLabels.slice(0, firstEmptyIndex);
            processedDataArrays = processedDataArrays.map(dataArray => dataArray.slice(0, firstEmptyIndex));
        }
        const currentRealBars = finalLabels.length; // Reconta após remover

        // Adiciona padding se necessário
        if (currentRealBars > 0 && currentRealBars < minCategories) {
            needsPadding = true;
            const dummiesNeeded = minCategories - currentRealBars;
            for (let i = 0; i < dummiesNeeded; i++) {
                finalLabels.push('');
                processedDataArrays = processedDataArrays.map(dataArray => [...dataArray, 0]);
            }
            barPercentageToUse = (d.barPercentage ?? 0.8) * (currentRealBars / minCategories); // Usa default como base
        } else {
             barPercentageToUse = newSettingsFlat.barPercentage ?? d.barPercentage ?? 0.8; // Usa valor da config ou default
        }
        // --- FIM LÓGICA DE PADDING ---

        // Atualiza os dados e labels do gráfico
        chartData.labels = finalLabels;
        chartData.datasets.forEach((ds, i) => {
             if (!processedDataArrays[i]) { // Segurança
                 processedDataArrays[i] = Array(finalLabels.length).fill(0);
             }
            ds.data = processedDataArrays[i];
        });

        if (opts.plugins?.title) {
            // *** Garante que temos uma string ***
            const newTitleString = String(newSettingsFlat.title ?? d.title ?? '');
            opts.plugins.title.text = newTitleString; // Define o texto (string)
            opts.plugins.title._intendedText = newTitleString; // *** ATUALIZA O TEXTO ORIGINAL ARMAZENADO ***
            opts.plugins.title.display = !!newTitleString.trim(); // Atualiza display
            opts.plugins.title.font.size = newSettingsFlat.titleFont ?? d.fontsize[0];
            opts.plugins.title.color = newSettingsFlat.titleColor ?? d.color_title;
        }
        if (opts.plugins?.legend) { /* ... */
             opts.plugins.legend.position = newSettingsFlat.legendPos ?? d.legendPos; if (opts.plugins.legend.labels?.font) { opts.plugins.legend.labels.font.size = newSettingsFlat.legendFont ?? d.fontsize[2]; } if (opts.plugins.legend.labels) { opts.plugins.legend.labels.color = newSettingsFlat.textColor ?? d.textColor; } }
        if (opts.plugins?.percentPlugin) { /* ... */
            opts.plugins.percentPlugin.percent_text_color = newSettingsFlat.percent_text_color ?? d.percent_text_color; opts.plugins.percentPlugin.percentFontSize = newSettingsFlat.percentFontSize ?? newSettingsFlat.xtickFont ?? d.fontsize[1]; }
         opts.percent_text_color = newSettingsFlat.percent_text_color ?? d.percent_text_color; opts.percentFontSize = newSettingsFlat.percentFontSize ?? newSettingsFlat.xtickFont ?? d.fontsize[1];
        if (opts.scales?.x) {
            opts.scales.x.barPercentage = barPercentageToUse; // Aplica barPercentage ajustado
            if (opts.scales.x.ticks) {
                 opts.scales.x.ticks.font.size = newSettingsFlat.xtickFont ?? d.fontsize[1]; opts.scales.x.ticks.color = newSettingsFlat.textColor ?? d.textColor;
                 if (needsPadding) {
                     opts.scales.x.ticks.callback = function(value, index, ticks) { const label = this.getLabelForValue(value); return label === '' ? null : label; };
                     if (opts.scales.x.grid) { opts.scales.x.grid.color = (context) => context.index >= currentRealBars ? 'transparent' : Chart.defaults.borderColor; }
                 } else {
                     delete opts.scales.x.ticks.callback;
                     if (opts.scales.x.grid) { opts.scales.x.grid.color = Chart.defaults.borderColor; }
                 }
            }
        }
        if (opts.scales?.y?.ticks) { /* ... */
            opts.scales.y.ticks.font.size = newSettingsFlat.ytickFont ?? d.fontsize[3]; opts.scales.y.ticks.color = newSettingsFlat.textColor ?? d.textColor; if (!opts.scales.y.ticks.callback) { opts.scales.y.ticks.callback = val => val + '%'; } }

        // Cor de fundo do Canvas
        if (chart.canvas) chart.canvas.style.backgroundColor = newSettingsFlat.bgColor ?? d.bgColor;

        // Cores das Barras (datasets)
        const datasetLabels = chartData.datasets.map(ds => ds.label);
        const newColors = getBarColors(datasetLabels, { ...d, bar_colorsMap: newSettingsFlat.bar_colorsMap });
        chartData.datasets.forEach((ds, i) => { ds.backgroundColor = newColors[i]; });

        // --- Atualiza o gráfico e a cópia plana ---
        chart.update();
        chart.currentOptions = JSON.parse(JSON.stringify(newSettingsFlat)); // Salva as settings planas que foram aplicadas
    }; // Fim applySettings


    // Reseta para os defaults
    const resetSettings = (chart) => {
        const d = defaults();
        if (!chart?.options || !chart.dataId || !d) { /* ... erro ... */ return; }
        const resetValuesFlat = {
            title: d.title, titleFont: safeGet(d, 'fontsize.0', 16), titleColor: d.color_title, pad_title: d.pad_title,
            legendPos: d.legendPos, percentFontSize: safeGet(d, 'fontsize.1', 10), percent_text_color: d.percent_text_color,
            textColor: d.textColor ?? '#000000', bgColor: d.bgColor, xtickFont: safeGet(d, 'fontsize.1', 10),
            ytickFont: safeGet(d, 'fontsize.3', 10), legendFont: safeGet(d, 'fontsize.2', 10),
            bar_colorsMap: { ...(d.bar_colorsMap || {}) }, barPercentage: d.barPercentage ?? 0.8 };
        const originalTitle = String(window.visualizacaoData[chart.dataId]?.title || d.title || '');
        resetValuesFlat.title = originalTitle; // Garante string
        applySettings(chart, resetValuesFlat);
    }; // Fim resetSettings

    // Abre modal de edição
    const openEditModal = (dataId) => {
        console.log(`BarChart.openEditModal chamado para ID: ${dataId}`);
        const chartKey = `bar_${dataId}`;
        const chartInstance = window.charts[chartKey];

        if (!chartInstance || !chartInstance.canvas || !chartInstance.currentOptions || !chartInstance.config?.options) {
            console.error("Instância...", chartKey); alert(`Erro... ${dataId}.`); return;
        }

        const d = defaults();
        const currentFlatOptions = chartInstance.currentOptions;
        const datasets = chartInstance.config.data.datasets;

        const currentBgColorRGB = chartInstance.canvas.style.backgroundColor || currentFlatOptions.bgColor || d.bgColor;
        const currentBgColorHEX = typeof rgbToHex === 'function' ? rgbToHex(currentBgColorRGB) : '#ffffff';

        const currentTitleText = currentFlatOptions.title || ''; // Deve ser a string original

        const settingsForModal = {
            bgColor: currentBgColorHEX, title: currentTitleText,
            titleFont: currentFlatOptions.titleFont ?? d.fontsize[0], titleColor: currentFlatOptions.titleColor ?? d.color_title,
            legendPos: currentFlatOptions.legendPos ?? d.legendPos, legendFont: currentFlatOptions.legendFont ?? d.fontsize[2],
            textColor: currentFlatOptions.textColor ?? d.textColor, percentColor: currentFlatOptions.percent_text_color ?? d.percent_text_color,
            percentFont: currentFlatOptions.percentFontSize ?? d.fontsize[1], xtickFont: currentFlatOptions.xtickFont ?? d.fontsize[1],
            ytickFont: currentFlatOptions.ytickFont ?? d.fontsize[3], datasetNames: datasets.map(ds => ds.label),
            datasetColors: datasets.map(ds => ds.backgroundColor)
        };
        console.log("Settings (flat) para preencher modal (Bar):", settingsForModal);

        const overlay = createOverlay(); const modal = document.createElement('div');
        modal.className = 'edit-modal modal-component'; modal.innerHTML = buildModalHTML(settingsForModal); overlay.appendChild(modal);

        const modalCanvas = getEl('modalChartCanvas');
        if (!modalCanvas) { console.error("..."); closeModal(overlay); return; }
        const modalCtx = modalCanvas.getContext('2d');
        // *** Usa cópia dos DADOS e OPÇÕES ANINHADAS do gráfico instance ***
        const previewData = JSON.parse(JSON.stringify(chartInstance.config.data || {}));
        const initialPreviewOptionsNested = JSON.parse(JSON.stringify(chartInstance.config.options || {}));
        initialPreviewOptionsNested.responsive = true; initialPreviewOptionsNested.maintainAspectRatio = false;

        const modalChart = new Chart(modalCtx, {
             type: 'bar',
             data: previewData, // Inicia com dados (potencialmente com padding)
             options: initialPreviewOptionsNested // Inicia com cópia das opções aninhadas atuais
        });

        // Aplica cor de fundo e cores das barras manualmente à preview
        if (modalChart.canvas) modalChart.canvas.style.backgroundColor = settingsForModal.bgColor;
        modalChart.data.datasets.forEach((ds, i) => {
             ds.backgroundColor = settingsForModal.datasetColors[i] || defaults().bar_colors[i % defaults().bar_colors.length];
        });
        modalChart.update('none');
        console.log("Modal preview (Bar) inicializado usando cópia de chartInstance.config.options.");


        // Função para atualizar a preview quando inputs mudam
        const updatePreview = () => {
            const formValues = getFormValues(settingsForModal.datasetNames);
            applySettings(modalChart, formValues); // Aplica settings planas ao gráfico do modal
        };

        // Listeners dos Inputs
        modal.querySelectorAll('.settings-container input, .settings-container select').forEach(el => { const eventType = ['color', 'number', 'text', 'range'].includes(el.type) ? 'input' : 'change'; el.addEventListener(eventType, updatePreview); });
        onClick('toggle-additional-btn', () => { getEl('toggle-additional-btn').style.display = 'none'; modal.querySelector('.additional-settings').style.display = 'block'; });
        onClick('toggle-additional-btn-hide', () => { getEl('toggle-additional-btn').style.display = 'block'; modal.querySelector('.additional-settings').style.display = 'none'; });

        // Listeners Botões de Ação
        onClick('apply-btn', () => {
            const newSettingsFromForm = getFormValues(settingsForModal.datasetNames);
            const scope = getVal('apply-scope');
            const applyAction = (instance) => {
                let settingsToApply = JSON.parse(JSON.stringify(newSettingsFromForm));
                if (scope === 'all' && instance !== chartInstance) { const originalInstanceTitle = instance.currentOptions?.title || defaults().title; settingsToApply.title = originalInstanceTitle; }
                applySettings(instance, settingsToApply); // Passa settings planas
            };
            applyScopedAction('bar_', chartInstance, scope, applyAction);
            closeModal(overlay);
        });
        onClick('reset-btn', () => {
             const scope = getVal('reset-scope');
             const resetAction = (instance) => { resetSettings(instance); };
             applyScopedAction('bar_', chartInstance, scope, resetAction);
             const globalDefaults = defaults();
             const previewResetOptions = { ...globalDefaults, title: settingsForModal.title, titleFont: globalDefaults.fontsize[0], xtickFont: globalDefaults.fontsize[1], legendFont: globalDefaults.fontsize[2], ytickFont: globalDefaults.fontsize[3], percentFontSize: globalDefaults.fontsize[1], percent_text_color: globalDefaults.percent_text_color, bar_colorsMap: globalDefaults.bar_colorsMap, barPercentage: globalDefaults.barPercentage ?? 0.8 };
             delete previewResetOptions.fontsize; delete previewResetOptions.bar_colors;
             applySettings(modalChart, previewResetOptions);
             updateModalFormWithDefaults(globalDefaults, settingsForModal.title, settingsForModal.datasetNames);
             closeModal(overlay);
        });
        onClick('close-edit-btn', () => closeModal(overlay));
    }; // Fim openEditModal

     // Função Auxiliar para Resetar o Formulário do Modal
     const updateModalFormWithDefaults = (defaultsToApply, originalTitle, datasetNames) => {
        getEl('edit-title').value = originalTitle; getEl('edit-title-font').value = defaultsToApply.fontsize[0]; getEl('edit-title-color').value = defaultsToApply.color_title; getEl('edit-legend-pos').value = defaultsToApply.legendPos;
        const colorInputsContainer = getEl('edit-group-colors'); if (colorInputsContainer) { const colorInputs = colorInputsContainer.querySelectorAll('input[type="color"]'); colorInputs.forEach((input, i) => { const categoryName = datasetNames[i]; input.value = defaultsToApply.bar_colorsMap?.[categoryName] ?? defaultsToApply.bar_colors?.[i] ?? '#cccccc'; }); }
        getEl('edit-bg-color').value = defaultsToApply.bgColor; getEl('edit-xtick-font').value = defaultsToApply.fontsize[1]; getEl('edit-ytick-font').value = defaultsToApply.fontsize[3]; getEl('edit-legend-font').value = defaultsToApply.fontsize[2];
        getEl('edit-percent-font').value = defaultsToApply.fontsize[1]; getEl('edit-percent-color').value = defaultsToApply.percent_text_color; getEl('edit-text-color').value = defaultsToApply.textColor;
     };


     // Função de inicialização
    const init = () => {
        console.log("BarChart.init() iniciado...");
        const squares = document.querySelectorAll('.square[data-type="grafico_de_barras"]');
        console.log(`Encontrados ${squares.length} squares para Gráficos de Barras.`);

        const savedBarConfigs = window.configBar || {};

        squares.forEach((square) => {
            const dataId = square.getAttribute('data-id');
            square.innerHTML = '';

            if (!dataId) { console.error("..."); square.innerHTML = '<p>...</p>'; return; }
            const dataItem = window.visualizacaoData?.[dataId];
            if (!dataItem || !dataItem.dfDados || !dataItem.dfPerg) { console.error(`Dados... ID ${dataId}...`); square.innerHTML = `<p>...</p>`; return; }

            // Cria estrutura HTML
            const chartWrapper = document.createElement('div'); chartWrapper.className = 'chart-wrapper'; chartWrapper.style.cssText = '...'; const canvasId = `chartCanvas_bar_${dataId}`; const canvas = document.createElement('canvas'); canvas.id = canvasId; canvas.style.width = "100%"; canvas.style.height = "100%"; const editBtn = document.createElement('button'); Object.assign(editBtn, { className: 'edit-chart-btn', textContent: 'Editar Gráfico' }); const separator = document.createElement('div'); separator.className = 'perguntas-separator'; const collapseBtn = document.createElement('button'); Object.assign(collapseBtn, { className: 'collapse-perguntas-btn', innerHTML: '▼', title: 'Recolher/Expandir Tabela' }); separator.appendChild(collapseBtn); const tableContainerId = `perguntasTable_bar_${dataId}`; const tableWrapper = document.createElement('div'); Object.assign(tableWrapper, { className: 'perguntas-table-wrapper', id: tableContainerId }); chartWrapper.append(canvas, editBtn); square.append(chartWrapper, separator, tableWrapper); chartWrapper.addEventListener('mouseenter', () => editBtn.style.display = 'block'); chartWrapper.addEventListener('mouseleave', () => editBtn.style.display = 'none');

                        // --- LÓGICA DE MERGE CORRIGIDA ---
            let initialChartOptions;
            const defaultOptsFlat = JSON.parse(JSON.stringify(defaults()));
            const savedOptsRaw = savedBarConfigs[dataId] ? JSON.parse(JSON.stringify(savedBarConfigs[dataId])) : null;
            const originalTitleFromData = dataItem.title; // Guarda título original

            if (savedOptsRaw) {
                console.log(`Usando config salva para barra ${dataId}.`);
                // 1. Começa com defaults
                // 2. Mescla opções salvas (savedOptsRaw sobrescreve defaults, incluindo o título se existir em savedOptsRaw)
                initialChartOptions = { ...defaultOptsFlat, ...savedOptsRaw };

                // 3. Trata fontes (mantido)
                 if (savedOptsRaw.fontsize && Array.isArray(savedOptsRaw.fontsize)) {
                    initialChartOptions.titleFont = savedOptsRaw.titleFont ?? savedOptsRaw.fontsize[0] ?? defaultOptsFlat.fontsize[0];
                    initialChartOptions.xtickFont = savedOptsRaw.xtickFont ?? savedOptsRaw.fontsize[1] ?? defaultOptsFlat.fontsize[1];
                    initialChartOptions.legendFont = savedOptsRaw.legendFont ?? savedOptsRaw.fontsize[2] ?? defaultOptsFlat.fontsize[2];
                    initialChartOptions.ytickFont = savedOptsRaw.ytickFont ?? savedOptsRaw.fontsize[3] ?? defaultOptsFlat.fontsize[3];
                 } else {
                    initialChartOptions.titleFont = initialChartOptions.titleFont ?? defaultOptsFlat.fontsize[0];
                    initialChartOptions.xtickFont = initialChartOptions.xtickFont ?? defaultOptsFlat.fontsize[1];
                    initialChartOptions.legendFont = initialChartOptions.legendFont ?? defaultOptsFlat.fontsize[2];
                    initialChartOptions.ytickFont = initialChartOptions.ytickFont ?? defaultOptsFlat.fontsize[3];
                 }
                 initialChartOptions.percentFontSize = initialChartOptions.percentFontSize ?? initialChartOptions.xtickFont;
                 initialChartOptions.percent_text_color = initialChartOptions.percent_text_color ?? defaultOptsFlat.percent_text_color;
                 delete initialChartOptions.fontsize; // Remove array antigo

                // 4. *** CORREÇÃO: Verifica se o título NÃO veio da config salva ***
                // Se a configuração salva *não* tinha uma propriedade 'title' (ou era null/undefined),
                // *então* usamos o título original dos dados como fallback.
                // Caso contrário, o título da config salva (já mesclado no passo 2) é mantido.
                if (!savedOptsRaw.hasOwnProperty('title') || savedOptsRaw.title === null || savedOptsRaw.title === undefined) {
                     initialChartOptions.title = originalTitleFromData || defaultOptsFlat.title;
                     console.log(` -> Usando título original/default como fallback para ${dataId}`);
                } else {
                     console.log(` -> Usando título da configuração salva para ${dataId}: "${initialChartOptions.title}"`);
                }

            } else {
                console.log(`Nenhuma config salva para barra ${dataId}. Usando defaults e título original.`);
                // 1. Começa com defaults
                initialChartOptions = { ...defaultOptsFlat };
                // 2. Define fontes a partir dos defaults
                initialChartOptions.titleFont = defaultOptsFlat.fontsize[0]; initialChartOptions.xtickFont = defaultOptsFlat.fontsize[1]; initialChartOptions.legendFont = defaultOptsFlat.fontsize[2]; initialChartOptions.ytickFont = defaultOptsFlat.fontsize[3];
                initialChartOptions.percentFontSize = defaultOptsFlat.fontsize[1]; initialChartOptions.percent_text_color = defaultOptsFlat.percent_text_color;
                delete initialChartOptions.fontsize;
                // 3. Usa o título original dos dados ou o default
                initialChartOptions.title = originalTitleFromData || defaultOptsFlat.title;
            }

            // 5. Garante que o título final seja uma string
            initialChartOptions.title = String(initialChartOptions.title || '');

            // --- FIM DA LÓGICA DE MERGE CORRIGIDA ---

            // Plota gráfico inicial
            const chartData = dataItem.dfDados;
            const chart = plot(chartData, initialChartOptions, canvasId); // Passa opções planas

            // Armazena referência
            if (chart) {
                 const chartKey = `bar_${dataId}`;
                 window.charts[chartKey] = chart;
                 chart.dataId = dataId; // Armazena dataId
                 // currentOptions é setado dentro do applySettings chamado por plot
                 console.log(`Gráfico de Barras ${dataId} criado e registrado.`);
             } else {
                 console.error(`Falha ao criar o gráfico de barras para ${dataId}.`);
             }

            // Plota tabela de perguntas
            const pergData = dataItem.dfPerg;
            if (typeof PerguntasTable?.plot === 'function') { const savedPerguntasOpts = window.configPerguntas?.[dataId] ? JSON.parse(JSON.stringify(window.configPerguntas[dataId])) : {}; const initialPerguntasOptions = { ...(window.defaultPerguntasTableSettings || {}), ...savedPerguntasOpts }; PerguntasTable.plot(pergData, tableContainerId, initialPerguntasOptions, dataId);
            } else { console.error("..."); tableWrapper.innerHTML = "<p>...</p>"; }
        });
        console.log("BarChart.init() concluído.");
    }; // Fim init

    return { init, plot, openEditModal };

})(); // Fim do IIFE