/* bar-chart.js */
/* Lógica para Gráficos de Barras Empilhadas. Adaptado para usar window.visualizacaoData e data-id. */
/* CORRIGIDO v15: Garante presença de categorias padrão ('Bastante'...'Nada') na legenda se uma delas existir. */
/* ALTERADO v16: 1. Garante '%' inicial no y-tick do preview. 2. Posição legenda 'top' default se label > 2 palavras. */

const BarChart = (() => {

    const defaults = () => window.defaultBarSettings || {};
    const minCategories = 4; // Mínimo de BARRAS visuais (padding de largura)

    // --- Funções Auxiliares ---
    const countWords = (str) => (str || '').trim().split(/\s+/).filter(Boolean).length;
    // REQ 2: Helper para verificar se alguma legenda deve forçar 'top'
    const shouldDefaultLegendTop = (labels) => Array.isArray(labels) && labels.some(label => countWords(label) > 2);

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
                    display: !!chartTitleString.trim(),
                    text: chartTitleString,
                    _intendedText: chartTitleString,
                    font: { size: szTitle },
                    color: titleColor ?? d.color_title,
                    padding: { top: pad_title, bottom: pad_title }
                },
                legend: {
                    display: true,
                    position: legendPos, // Usa a posição passada (já pode ter sido ajustada)
                    onClick: () => {},
                    labels: { font: { size: szLegend }, color: textColor }
                },
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
                        // Callback adicionado depois se necessário para padding
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
                        // REQ 1: Garante que o callback está sempre aqui na configuração inicial
                        callback: val => val + '%'
                    }
                }
            }
        };
    }; // Fim configureChartOptions

    // Plota o gráfico inicial
    const plot = (dfDados, options = {}, canvasId) => {
        const settings = { ...defaults(), ...options }; // options é 'flat'
        const { bgColor, figsize } = settings;
        const standardCategories = ['Bastante', 'Médio', 'Pouco', 'Nada'];

         if (!dfDados || !dfDados.index || !dfDados.columns || !dfDados.data || dfDados.index.length === 0 ) {
             console.error(`BarChart.plot (${canvasId}): Dados inválidos ou ausentes.`);
             // Opcional: Mostrar mensagem de erro no canvas
             return null;
        }

        // Calcula percentuais
        const df_percentual = {
            index: [...dfDados.index],
            columns: [...dfDados.columns],
            data: dfDados.data.map(row => { const sum = row.reduce((acc, val) => acc + (parseFloat(val) || 0), 0); return Array.isArray(row) ? row.map(val => sum > 0 ? ((parseFloat(val) || 0) / sum * 100) : 0) : []; })
         };

        // --- LÓGICA PARA GARANTIR CATEGORIAS PADRÃO E ORDENAR ---
        const originalCols = [...df_percentual.columns];
        const originalData = df_percentual.data;
        let processedCols = []; // Colunas finais para legenda e datasets
        let processedData = originalData.map(() => []);

        const hasAnyStandard = standardCategories.some(sc => originalCols.includes(sc));

        if (hasAnyStandard) {
            standardCategories.forEach(stdCat => {
                processedCols.push(stdCat);
                const originalIndex = originalCols.indexOf(stdCat);
                originalData.forEach((rowData, rowIndex) => {
                    processedData[rowIndex].push(originalIndex !== -1 ? rowData[originalIndex] : 0);
                });
            });
            const otherCols = originalCols.filter(c => !standardCategories.includes(c)).sort((a, b) => a.localeCompare(b));
            otherCols.forEach(otherCol => {
                processedCols.push(otherCol);
                const originalIndex = originalCols.indexOf(otherCol);
                originalData.forEach((rowData, rowIndex) => {
                    processedData[rowIndex].push(originalIndex !== -1 ? rowData[originalIndex] : 0);
                });
            });
            console.log(`BarChart ${canvasId.replace('chartCanvas_bar_', '')}: Categorias padrão garantidas. Ordem final: ${processedCols.join(', ')}`);
        } else {
            console.log(`BarChart ${canvasId.replace('chartCanvas_bar_', '')}: Nenhuma categoria padrão encontrada. Usando ordenação original.`);
            const orderedFallback = ['Bastante', 'Médio', 'Pouco', 'Nada', 'Outros'];
            const knownCols = orderedFallback.filter(c => originalCols.includes(c));
            const otherUnkCols = originalCols.filter(c => !orderedFallback.includes(c)).sort((a, b) => a.localeCompare(b));
            processedCols = [...knownCols, ...otherUnkCols];
            const originalIndexMap = originalCols.map(c => c);
            const newOrderIndices = processedCols.map(c => originalIndexMap.indexOf(c));
            processedData = originalData.map(row => newOrderIndices.map(idx => (idx !== -1 && Array.isArray(row) && idx < row.length) ? row[idx] : 0));
        }
        // --- FIM LÓGICA CATEGORIAS PADRÃO ---

        // --- LÓGICA DE PADDING DE LARGURA ---
        let finalLabels = [...df_percentual.index];
        const numRealBars = finalLabels.length;
        let needsPadding = false;
        let barPercentageToUse = settings.barPercentage ?? defaults().barPercentage ?? 0.8;

        if (numRealBars > 0 && numRealBars < minCategories) {
            needsPadding = true;
            const dummiesNeeded = minCategories - numRealBars;
            for (let i = 0; i < dummiesNeeded; i++) {
                finalLabels.push('');
                processedData = processedData.map(rowData => Array.isArray(rowData) ? [...rowData, 0] : rowData); // Erro corrigido aqui: era `processedDataArrays`
            }
            barPercentageToUse = (settings.barPercentage ?? defaults().barPercentage ?? 0.8) * (numRealBars / minCategories);
            console.log(` -> barPercentage ajustado para: ${barPercentageToUse.toFixed(2)}`);
        }
        // --- FIM LÓGICA DE PADDING DE LARGURA ---

        // Prepara datasets usando processedCols e processedData
        const cores = getBarColors(processedCols, settings);
        const datasets = processedCols.map((col, j) => ({
            label: col,
            data: processedData.map(row => (Array.isArray(row) && j < row.length) ? row[j] : 0),
            backgroundColor: cores[j],
            borderWidth: 0
        }));

        // REQ 2: Verifica se a legenda deve ser 'top' por padrão
        let finalLegendPos = settings.legendPos ?? defaults().legendPos;
        if (shouldDefaultLegendTop(processedCols)) {
            console.log(`BarChart ${canvasId.replace('chartCanvas_bar_', '')}: Legenda tem item longo (>2 palavras), definindo posição inicial como 'top'.`);
            finalLegendPos = 'top';
        }

        // Gera opções aninhadas, passando barPercentage ajustado e posição da legenda final
        const settingsForConfig = { ...settings, barPercentage: barPercentageToUse, legendPos: finalLegendPos };
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
            data: { labels: finalLabels, datasets },
            options: chartOptionsNested
        });

        // Aplica estilos externos
        chart.canvas.style.backgroundColor = bgColor;
        if (figsize?.length === 2) { chart.resize(figsize[0], figsize[1]); }

        // CHAMA applySettings para garantir que currentOptions seja setado corretamente, incluindo a posição da legenda final
        // Passa as configurações que foram efetivamente usadas, incluindo a posição da legenda potencialmente ajustada
        applySettings(chart, { ...settings, legendPos: finalLegendPos }); // Passa a finalLegendPos aqui

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
        // REQ 2: Usa a legendPos passada (que já foi verificada em openEditModal) para definir o valor inicial do select
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
        const chartData = chart.data;
        const d = defaults();

        // --- Lógica de Padding e Ajuste (Mantida para consistência) ---
        let finalLabels = [...chartData.labels];
        let processedDataArrays = chartData.datasets.map(ds => [...ds.data]);
        const realLabelsFromCurrent = finalLabels.filter(l => l !== '');
        const numRealBars = realLabelsFromCurrent.length;

        let needsPadding = false;
        let barPercentageToUse = newSettingsFlat.barPercentage ?? d.barPercentage ?? 0.8;

        const firstEmptyIndex = finalLabels.indexOf('');
        if (firstEmptyIndex !== -1) {
            finalLabels = finalLabels.slice(0, firstEmptyIndex);
            processedDataArrays = processedDataArrays.map(dataArray => dataArray.slice(0, firstEmptyIndex));
        }
        const currentRealBars = finalLabels.length;

        if (currentRealBars > 0 && currentRealBars < minCategories) {
            needsPadding = true;
            const dummiesNeeded = minCategories - currentRealBars;
            for (let i = 0; i < dummiesNeeded; i++) {
                finalLabels.push('');
                processedDataArrays = processedDataArrays.map(dataArray => [...dataArray, 0]);
            }
            // Usa o barPercentage da *nova* configuração como base para o ajuste, ou o default
            barPercentageToUse = (newSettingsFlat.barPercentage ?? d.barPercentage ?? 0.8) * (currentRealBars / minCategories);
        } else {
             barPercentageToUse = newSettingsFlat.barPercentage ?? d.barPercentage ?? 0.8;
        }
        // --- FIM LÓGICA DE PADDING ---

        // Atualiza os dados e labels do gráfico
        chartData.labels = finalLabels;
        chartData.datasets.forEach((ds, i) => {
             if (!processedDataArrays[i]) {
                 processedDataArrays[i] = Array(finalLabels.length).fill(0);
             }
            ds.data = processedDataArrays[i];
        });

        // Aplica configurações de Título
        if (opts.plugins?.title) {
            const newTitleString = String(newSettingsFlat.title ?? d.title ?? '');
            opts.plugins.title.text = newTitleString;
            opts.plugins.title._intendedText = newTitleString;
            opts.plugins.title.display = !!newTitleString.trim();
            opts.plugins.title.font.size = newSettingsFlat.titleFont ?? d.fontsize[0];
            opts.plugins.title.color = newSettingsFlat.titleColor ?? d.color_title;
        }

        // Aplica configurações de Legenda
        if (opts.plugins?.legend) {
            // REQ 2: Aplica a posição da legenda vinda das configurações (seja do form ou do cálculo inicial)
             opts.plugins.legend.position = newSettingsFlat.legendPos ?? d.legendPos;
             if (opts.plugins.legend.labels?.font) { opts.plugins.legend.labels.font.size = newSettingsFlat.legendFont ?? d.fontsize[2]; }
             if (opts.plugins.legend.labels) { opts.plugins.legend.labels.color = newSettingsFlat.textColor ?? d.textColor; }
        }

        // Aplica configurações do Texto Percentual
        if (opts.plugins?.percentPlugin) {
            opts.plugins.percentPlugin.percent_text_color = newSettingsFlat.percent_text_color ?? d.percent_text_color;
            opts.plugins.percentPlugin.percentFontSize = newSettingsFlat.percentFontSize ?? newSettingsFlat.xtickFont ?? d.fontsize[1];
        }
         opts.percent_text_color = newSettingsFlat.percent_text_color ?? d.percent_text_color;
         opts.percentFontSize = newSettingsFlat.percentFontSize ?? newSettingsFlat.xtickFont ?? d.fontsize[1];

        // Aplica configurações do Eixo X
        if (opts.scales?.x) {
            opts.scales.x.barPercentage = barPercentageToUse; // Aplica barPercentage ajustado
            if (opts.scales.x.ticks) {
                 opts.scales.x.ticks.font.size = newSettingsFlat.xtickFont ?? d.fontsize[1];
                 opts.scales.x.ticks.color = newSettingsFlat.textColor ?? d.textColor;
                 if (needsPadding) {
                     opts.scales.x.ticks.callback = function(value, index, ticks) { const label = this.getLabelForValue(value); return label === '' ? null : label; };
                     if (opts.scales.x.grid) { opts.scales.x.grid.color = (context) => context.index >= currentRealBars ? 'transparent' : Chart.defaults.borderColor; }
                 } else {
                     // Remove callback específico do padding se não for mais necessário
                     delete opts.scales.x.ticks.callback;
                     if (opts.scales.x.grid) { opts.scales.x.grid.color = Chart.defaults.borderColor; }
                 }
            }
        }

        // Aplica configurações do Eixo Y
        if (opts.scales?.y?.ticks) {
            opts.scales.y.ticks.font.size = newSettingsFlat.ytickFont ?? d.fontsize[3];
            opts.scales.y.ticks.color = newSettingsFlat.textColor ?? d.textColor;
            // REQ 1: Garante que a callback de '%' esteja sempre definida ao aplicar settings
            opts.scales.y.ticks.callback = val => val + '%';
        } else if (opts.scales?.y) { // Garante que ticks e callback existam mesmo se não existiam antes
             if (!opts.scales.y.ticks) opts.scales.y.ticks = {};
             opts.scales.y.ticks.font = { size: newSettingsFlat.ytickFont ?? d.fontsize[3] };
             opts.scales.y.ticks.color = newSettingsFlat.textColor ?? d.textColor;
             opts.scales.y.ticks.callback = val => val + '%';
        }


        // Cor de fundo do Canvas
        if (chart.canvas) chart.canvas.style.backgroundColor = newSettingsFlat.bgColor ?? d.bgColor;

        // Cores das Barras (datasets)
        const datasetLabels = chartData.datasets.map(ds => ds.label);
        const newColors = getBarColors(datasetLabels, { ...d, bar_colorsMap: newSettingsFlat.bar_colorsMap });
        chartData.datasets.forEach((ds, i) => { ds.backgroundColor = newColors[i]; });

        // --- Atualiza o gráfico e a cópia plana ---
        chart.update();
        // Salva as settings planas que foram aplicadas, incluindo a posição da legenda que pode ter sido ajustada ou vinda do form
        chart.currentOptions = JSON.parse(JSON.stringify(newSettingsFlat));
    }; // Fim applySettings


    // Reseta para os defaults
    const resetSettings = (chart) => {
        const d = defaults();
        if (!chart?.options || !chart.dataId || !d) { console.error("resetSettings (Bar): Instância, dataId ou defaults ausentes."); return; }

        // Pega os labels atuais para verificar a necessidade de legenda 'top' no reset
        const currentLabels = chart.data.datasets.map(ds => ds.label);
        // REQ 2: Determina a posição da legenda padrão para o reset
        let defaultLegendPosForReset = d.legendPos;
        if (shouldDefaultLegendTop(currentLabels)) {
            defaultLegendPosForReset = 'top';
        }

        const resetValuesFlat = {
            title: d.title, titleFont: safeGet(d, 'fontsize.0', 16), titleColor: d.color_title, pad_title: d.pad_title,
            legendPos: defaultLegendPosForReset, // Usa a posição default calculada
            percentFontSize: safeGet(d, 'fontsize.1', 10), percent_text_color: d.percent_text_color,
            textColor: d.textColor ?? '#000000', bgColor: d.bgColor, xtickFont: safeGet(d, 'fontsize.1', 10),
            ytickFont: safeGet(d, 'fontsize.3', 10), legendFont: safeGet(d, 'fontsize.2', 10),
            bar_colorsMap: { ...(d.bar_colorsMap || {}) }, barPercentage: d.barPercentage ?? 0.8
        };
        const originalTitle = String(window.visualizacaoData[chart.dataId]?.title || d.title || '');
        resetValuesFlat.title = originalTitle; // Garante string e mantém título original dos dados

        applySettings(chart, resetValuesFlat);
    }; // Fim resetSettings

    // Abre modal de edição
    const openEditModal = (dataId) => {
        console.log(`BarChart.openEditModal chamado para ID: ${dataId}`);
        const chartKey = `bar_${dataId}`;
        const chartInstance = window.charts[chartKey];

        if (!chartInstance || !chartInstance.canvas || !chartInstance.currentOptions || !chartInstance.config?.options) {
            console.error("Instância do gráfico, opções atuais ou configuração ausente para:", chartKey);
            alert(`Erro ao abrir editor para o gráfico ${dataId}. Verifique o console.`);
            return;
        }

        const d = defaults();
        const currentFlatOptions = chartInstance.currentOptions; // Usa as opções planas salvas
        const datasets = chartInstance.config.data.datasets;
        const datasetLabels = datasets.map(ds => ds.label); // Labels atuais da legenda

        const currentBgColorRGB = chartInstance.canvas.style.backgroundColor || currentFlatOptions.bgColor || d.bgColor;
        const currentBgColorHEX = typeof rgbToHex === 'function' ? rgbToHex(currentBgColorRGB) : (currentFlatOptions.bgColor || d.bgColor || '#ffffff');

        const currentTitleText = currentFlatOptions.title || ''; // Usa o título das opções salvas

        // REQ 2: Determina a posição inicial da legenda para o modal
        let initialLegendPos = currentFlatOptions.legendPos ?? d.legendPos;
        if (shouldDefaultLegendTop(datasetLabels)) {
             console.log(`Modal ${dataId}: Legenda tem item longo (>2 palavras), definindo posição inicial como 'top' no modal.`);
             initialLegendPos = 'top';
        }

        const settingsForModal = {
            bgColor: currentBgColorHEX, title: currentTitleText,
            titleFont: currentFlatOptions.titleFont ?? d.fontsize[0], titleColor: currentFlatOptions.titleColor ?? d.color_title,
            legendPos: initialLegendPos, // Passa a posição inicial calculada
            legendFont: currentFlatOptions.legendFont ?? d.fontsize[2],
            textColor: currentFlatOptions.textColor ?? d.textColor, percentColor: currentFlatOptions.percent_text_color ?? d.percent_text_color,
            percentFont: currentFlatOptions.percentFontSize ?? d.fontsize[1], xtickFont: currentFlatOptions.xtickFont ?? d.fontsize[1],
            ytickFont: currentFlatOptions.ytickFont ?? d.fontsize[3],
            datasetNames: datasetLabels,
            datasetColors: datasets.map(ds => ds.backgroundColor) // Pega cores atuais
        };
        console.log("Settings (flat) para preencher modal (Bar):", settingsForModal);

        const overlay = createOverlay(); const modal = document.createElement('div');
        modal.className = 'edit-modal modal-component';
        // Passa as settingsForModal (com a legendPos correta) para construir o HTML
        modal.innerHTML = buildModalHTML(settingsForModal);
        overlay.appendChild(modal);

        const modalCanvas = getEl('modalChartCanvas');
        if (!modalCanvas) { console.error("Canvas do modal não encontrado."); closeModal(overlay); return; }
        const modalCtx = modalCanvas.getContext('2d');

        // Usa cópia dos DADOS e OPÇÕES ANINHADAS do gráfico instance
        // IMPORTANTE: JSON.stringify/parse PERDE FUNÇÕES (como callbacks)
        const previewData = JSON.parse(JSON.stringify(chartInstance.config.data || {}));
        let initialPreviewOptionsNested = JSON.parse(JSON.stringify(chartInstance.config.options || {}));

        // REQ 1 & 2: Ajusta as opções aninhadas *antes* de criar o gráfico de preview
        initialPreviewOptionsNested.responsive = true;
        initialPreviewOptionsNested.maintainAspectRatio = false;

        // Garante a callback do eixo Y (%)
        if (!initialPreviewOptionsNested.scales) initialPreviewOptionsNested.scales = {};
        if (!initialPreviewOptionsNested.scales.y) initialPreviewOptionsNested.scales.y = {};
        if (!initialPreviewOptionsNested.scales.y.ticks) initialPreviewOptionsNested.scales.y.ticks = {};
        initialPreviewOptionsNested.scales.y.ticks.callback = val => val + '%';

        // Garante a posição correta da legenda
        if (!initialPreviewOptionsNested.plugins) initialPreviewOptionsNested.plugins = {};
        if (!initialPreviewOptionsNested.plugins.legend) initialPreviewOptionsNested.plugins.legend = { display: true };
        initialPreviewOptionsNested.plugins.legend.position = initialLegendPos; // Usa a posição calculada

        console.log("Opções aninhadas ajustadas para preview inicial (Bar):", initialPreviewOptionsNested);

        const modalChart = new Chart(modalCtx, {
             type: 'bar',
             data: previewData,
             options: initialPreviewOptionsNested // Usa as opções aninhadas ajustadas
        });

        // Aplica cor de fundo e cores das barras manualmente à preview inicial
        if (modalChart.canvas) modalChart.canvas.style.backgroundColor = settingsForModal.bgColor;
        modalChart.data.datasets.forEach((ds, i) => {
             ds.backgroundColor = settingsForModal.datasetColors[i] || defaults().bar_colors[i % defaults().bar_colors.length];
        });
        modalChart.update('none'); // Atualiza sem animação
        console.log("Modal preview (Bar) inicializado com opções ajustadas.");


        // Função para atualizar a preview quando inputs mudam
        const updatePreview = () => {
            const formValues = getFormValues(settingsForModal.datasetNames);
            // REQ 1 & 2: applySettings já garante o '%' e aplica a legendPos do form
            applySettings(modalChart, formValues);
        };

        // Listeners dos Inputs
        modal.querySelectorAll('.settings-container input, .settings-container select, .additional-settings input, .additional-settings select').forEach(el => {
            const eventType = ['color', 'number', 'text', 'range'].includes(el.type) ? 'input' : 'change';
            el.addEventListener(eventType, updatePreview);
        });
        onClick('toggle-additional-btn', () => { getEl('toggle-additional-btn').style.display = 'none'; modal.querySelector('.additional-settings').style.display = 'block'; });
        onClick('toggle-additional-btn-hide', () => { getEl('toggle-additional-btn').style.display = 'block'; modal.querySelector('.additional-settings').style.display = 'none'; });

        // Listeners Botões de Ação
        onClick('apply-btn', () => {
            const newSettingsFromForm = getFormValues(settingsForModal.datasetNames);
            const scope = getVal('apply-scope');
            const applyAction = (instance) => {
                let settingsToApply = JSON.parse(JSON.stringify(newSettingsFromForm));
                // Mantém título original se aplicando a todos e não for a instância atual
                if (scope === 'all' && instance !== chartInstance) {
                    const originalInstanceTitle = String(window.visualizacaoData[instance.dataId]?.title || instance.currentOptions?.title || defaults().title || '');
                    settingsToApply.title = originalInstanceTitle;
                 }
                applySettings(instance, settingsToApply);
            };
            applyScopedAction('bar_', chartInstance, scope, applyAction);
            closeModal(overlay);
        });
        onClick('reset-btn', () => {
             const scope = getVal('reset-scope');
             const resetAction = (instance) => { resetSettings(instance); }; // resetSettings já recalcula legendPos default
             applyScopedAction('bar_', chartInstance, scope, resetAction);

             // Atualiza a preview e o form do modal para refletir o reset
             const currentLabelsForPreviewReset = modalChart.data.datasets.map(ds => ds.label);
             let defaultLegendPosForPreviewReset = d.legendPos;
             if (shouldDefaultLegendTop(currentLabelsForPreviewReset)) {
                 defaultLegendPosForPreviewReset = 'top';
             }
             const previewResetOptions = {
                 ...defaults(),
                 title: settingsForModal.title, // Mantém título original no modal
                 titleFont: d.fontsize[0], xtickFont: d.fontsize[1], legendFont: d.fontsize[2], ytickFont: d.fontsize[3],
                 percentFontSize: d.fontsize[1], percent_text_color: d.percent_text_color,
                 bar_colorsMap: { ...(d.bar_colorsMap || {}) }, barPercentage: d.barPercentage ?? 0.8,
                 legendPos: defaultLegendPosForPreviewReset // Usa posição resetada
             };
             delete previewResetOptions.fontsize;
             delete previewResetOptions.bar_colors;

             applySettings(modalChart, previewResetOptions); // Atualiza preview
             // Atualiza o form do modal para refletir os defaults (incluindo legendPos)
             updateModalFormWithDefaults(d, settingsForModal.title, settingsForModal.datasetNames, defaultLegendPosForPreviewReset);

             // Não fecha o modal no reset, permite ver o resultado antes de aplicar ou cancelar
             // closeModal(overlay); // Removido - O usuário pode fechar manualmente
        });
        onClick('close-edit-btn', () => closeModal(overlay));
    }; // Fim openEditModal

     // Função Auxiliar para Resetar o Formulário do Modal
     // REQ 2: Adicionado parâmetro legendPosToSet
     const updateModalFormWithDefaults = (defaultsToApply, originalTitle, datasetNames, legendPosToSet) => {
        getEl('edit-title').value = originalTitle; // Mantém o título que estava no modal
        getEl('edit-title-font').value = defaultsToApply.fontsize[0];
        getEl('edit-title-color').value = defaultsToApply.color_title;
        // REQ 2: Define a posição da legenda no select conforme calculado no reset
        getEl('edit-legend-pos').value = legendPosToSet;
        const colorInputsContainer = getEl('edit-group-colors');
        if (colorInputsContainer) {
            const colorInputs = colorInputsContainer.querySelectorAll('input[type="color"]');
            colorInputs.forEach((input, i) => {
                const categoryName = datasetNames[i];
                input.value = defaultsToApply.bar_colorsMap?.[categoryName] ?? defaultsToApply.bar_colors?.[i] ?? '#cccccc';
            });
        }
        getEl('edit-bg-color').value = defaultsToApply.bgColor;
        getEl('edit-xtick-font').value = defaultsToApply.fontsize[1];
        getEl('edit-ytick-font').value = defaultsToApply.fontsize[3];
        getEl('edit-legend-font').value = defaultsToApply.fontsize[2];
        getEl('edit-percent-font').value = defaultsToApply.fontsize[1];
        getEl('edit-percent-color').value = defaultsToApply.percent_text_color;
        getEl('edit-text-color').value = defaultsToApply.textColor;
     };


     // Função de inicialização
    const init = () => {
        console.log("BarChart.init() iniciado...");
        const squares = document.querySelectorAll('.square[data-type="grafico_de_barras"]');
        console.log(`Encontrados ${squares.length} squares para Gráficos de Barras.`);

        const savedBarConfigs = window.configBar || {};
        const defaultOptsFlat = JSON.parse(JSON.stringify(defaults())); // Clona defaults

        squares.forEach((square) => {
            const dataId = square.getAttribute('data-id');
            square.innerHTML = ''; // Limpa container

            if (!dataId) { console.error("Square sem data-id encontrado."); square.innerHTML = '<p>Erro: ID de dados ausente.</p>'; return; }
            const dataItem = window.visualizacaoData?.[dataId];
            if (!dataItem || !dataItem.dfDados || !dataItem.dfPerg) { console.error(`Dados ausentes ou inválidos para o gráfico de barras ID ${dataId}.`); square.innerHTML = `<p>Erro: Dados para gráfico ${dataId} não encontrados.</p>`; return; }

            // Cria estrutura HTML
            const chartWrapper = document.createElement('div'); chartWrapper.className = 'chart-wrapper'; chartWrapper.style.position = 'relative'; chartWrapper.style.height = '400px'; /* ou outra altura */ const canvasId = `chartCanvas_bar_${dataId}`; const canvas = document.createElement('canvas'); canvas.id = canvasId; canvas.style.width = "100%"; canvas.style.height = "100%"; const editBtn = document.createElement('button'); Object.assign(editBtn, { className: 'edit-chart-btn', textContent: 'Editar Gráfico' }); const separator = document.createElement('div'); separator.className = 'perguntas-separator'; const collapseBtn = document.createElement('button'); Object.assign(collapseBtn, { className: 'collapse-perguntas-btn', innerHTML: '▼', title: 'Recolher/Expandir Tabela' }); separator.appendChild(collapseBtn); const tableContainerId = `perguntasTable_bar_${dataId}`; const tableWrapper = document.createElement('div'); Object.assign(tableWrapper, { className: 'perguntas-table-wrapper', id: tableContainerId }); chartWrapper.append(canvas, editBtn); square.append(chartWrapper, separator, tableWrapper); chartWrapper.addEventListener('mouseenter', () => editBtn.style.display = 'block'); chartWrapper.addEventListener('mouseleave', () => editBtn.style.display = 'none');

            // --- LÓGICA DE MERGE PARA OPÇÕES INICIAIS ---
            let initialChartOptions;
            const savedOptsRaw = savedBarConfigs[dataId] ? JSON.parse(JSON.stringify(savedBarConfigs[dataId])) : null;
            const originalTitleFromData = dataItem.title;

            if (savedOptsRaw) {
                console.log(`Usando config salva para barra ${dataId}.`);
                initialChartOptions = { ...defaultOptsFlat, ...savedOptsRaw }; // Mescla: salvos sobrepõem defaults
                // Trata fontes legadas
                 if (savedOptsRaw.fontsize && Array.isArray(savedOptsRaw.fontsize)) {
                    initialChartOptions.titleFont = savedOptsRaw.titleFont ?? savedOptsRaw.fontsize[0] ?? defaultOptsFlat.fontsize[0];
                    initialChartOptions.xtickFont = savedOptsRaw.xtickFont ?? savedOptsRaw.fontsize[1] ?? defaultOptsFlat.fontsize[1];
                    initialChartOptions.legendFont = savedOptsRaw.legendFont ?? savedOptsRaw.fontsize[2] ?? defaultOptsFlat.fontsize[2];
                    initialChartOptions.ytickFont = savedOptsRaw.ytickFont ?? savedOptsRaw.fontsize[3] ?? defaultOptsFlat.fontsize[3];
                 } else { // Garante que fontes existam mesmo se não vieram do array legado
                    initialChartOptions.titleFont = initialChartOptions.titleFont ?? defaultOptsFlat.fontsize[0];
                    initialChartOptions.xtickFont = initialChartOptions.xtickFont ?? defaultOptsFlat.fontsize[1];
                    initialChartOptions.legendFont = initialChartOptions.legendFont ?? defaultOptsFlat.fontsize[2];
                    initialChartOptions.ytickFont = initialChartOptions.ytickFont ?? defaultOptsFlat.fontsize[3];
                 }
                 initialChartOptions.percentFontSize = initialChartOptions.percentFontSize ?? initialChartOptions.xtickFont;
                 initialChartOptions.percent_text_color = initialChartOptions.percent_text_color ?? defaultOptsFlat.percent_text_color;
                 delete initialChartOptions.fontsize; // Remove array antigo

                // Trata título: usa salvo se existir, senão original, senão default
                if (!savedOptsRaw.hasOwnProperty('title') || savedOptsRaw.title === null || savedOptsRaw.title === undefined) {
                     initialChartOptions.title = originalTitleFromData || defaultOptsFlat.title;
                } // Se tinha 'title' salvo, ele já foi mesclado acima
            } else {
                console.log(`Nenhuma config salva para barra ${dataId}. Usando defaults e título original.`);
                initialChartOptions = { ...defaultOptsFlat };
                initialChartOptions.titleFont = defaultOptsFlat.fontsize[0]; initialChartOptions.xtickFont = defaultOptsFlat.fontsize[1]; initialChartOptions.legendFont = defaultOptsFlat.fontsize[2]; initialChartOptions.ytickFont = defaultOptsFlat.fontsize[3];
                initialChartOptions.percentFontSize = defaultOptsFlat.fontsize[1]; initialChartOptions.percent_text_color = defaultOptsFlat.percent_text_color;
                delete initialChartOptions.fontsize;
                initialChartOptions.title = originalTitleFromData || defaultOptsFlat.title;
            }

            // Garante que o título final seja uma string
            initialChartOptions.title = String(initialChartOptions.title || '');

            // REQ 2: A lógica para definir legendPos='top' se necessário está dentro de plot() agora.
            // init() apenas passa as opções mescladas (com a legendPos salva ou default).

            // Plota gráfico inicial
            const chartData = dataItem.dfDados;
            const chart = plot(chartData, initialChartOptions, canvasId); // plot() aplicará a lógica da legenda

            if (chart) {
                 const chartKey = `bar_${dataId}`;
                 window.charts[chartKey] = chart;
                 chart.dataId = dataId; // Armazena dataId na instância
                 // chart.currentOptions é setado dentro do applySettings chamado por plot
                 console.log(`Gráfico de Barras ${dataId} criado e registrado com opções iniciais:`, chart.currentOptions);

                 // Adiciona listener para botão de edição
                 editBtn.onclick = () => openEditModal(dataId);

             } else {
                 console.error(`Falha ao criar o gráfico de barras para ${dataId}.`);
                 chartWrapper.innerHTML = `<p>Erro ao renderizar gráfico ${dataId}</p>`; // Mensagem no local
             }

            // Plota tabela de perguntas
            const pergData = dataItem.dfPerg;
            if (typeof PerguntasTable?.plot === 'function') {
                 const savedPerguntasOpts = window.configPerguntas?.[dataId] ? JSON.parse(JSON.stringify(window.configPerguntas[dataId])) : {};
                 const initialPerguntasOptions = { ...(window.defaultPerguntasTableSettings || {}), ...savedPerguntasOpts };
                 PerguntasTable.plot(pergData, tableContainerId, initialPerguntasOptions, dataId);
                 // Lógica do botão collapse (exemplo básico)
                 collapseBtn.onclick = () => {
                    const table = getEl(tableContainerId);
                    const isCollapsed = table.style.display === 'none';
                    table.style.display = isCollapsed ? '' : 'none';
                    collapseBtn.innerHTML = isCollapsed ? '▼' : '▶';
                 };
            } else {
                console.error("PerguntasTable.plot não está disponível.");
                tableWrapper.innerHTML = "<p>Erro ao carregar tabela de perguntas.</p>";
                collapseBtn.style.display = 'none'; // Esconde botão se não há tabela
            }
        });
        console.log("BarChart.init() concluído.");
    }; // Fim init

    return { init, plot, openEditModal };

})(); // Fim do IIFE