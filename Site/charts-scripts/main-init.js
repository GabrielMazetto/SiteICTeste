/*
 * main-init.js (Preparado para TeiaPair)
 * Ponto de entrada principal para inicialização das visualizações.
 * 1. Espera o DOM carregar.
 * 2. Verifica se window.visualizacaoData está pronto (aguarda se necessário).
 * 3. Ordena os IDs dos gráficos (incluindo TeiaPair: baseId_Categoria).
 * 4. Extrai as dimensões únicas dos dados.
 * 5. Cria botões de filtro para cada dimensão e um botão "Todas".
 * 6. Itera sobre os IDs ordenados:
 *    - Insere subtítulos de Indicador quando o indicador muda.
 *    - Cria os elementos 'square' no HTML para cada item de visualização.
 *    - Adiciona classe 'special-teia-double-height' para tipo 'TeiaPair'.
 * 7. Adiciona um event listener aos botões de filtro.
 * 8. Chama as funções .init() dos módulos de gráfico/tabela.
 * 9. Configura listeners globais (edição, collapse, modal).
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log("main-init.js: DOMContentLoaded disparado.");

    // Função auxiliar para comparar IDs (incluindo os novos com _Categoria)
    function compareIds(idA, idB) {
        // Trata IDs como strings para lidar com o formato "numero_Categoria"
        const strIdA = String(idA);
        const strIdB = String(idB);

        // Separa a parte numérica da parte da categoria (se existir)
        const partsA = strIdA.split('_'); // Divide pelo underscore
        const partsB = strIdB.split('_');

        // Compara a parte numérica (ex: "4.5.1")
        const numericPartA = partsA[0];
        const numericPartB = partsB[0];

        if (numericPartA !== numericPartB) {
            // Compara as partes numéricas como números se possível
            const numPartsA = numericPartA.split('.').map(n => parseInt(n, 10));
            const numPartsB = numericPartB.split('.').map(n => parseInt(n, 10));

            for (let i = 0; i < Math.max(numPartsA.length, numPartsB.length); i++) {
                let valA = numPartsA[i]; let valB = numPartsB[i];
                if (isNaN(valA) || isNaN(valB)) {
                    // Fallback raro para comparação de strings se não for número
                    const strNumA = String(numericPartA).split('.')[i] || '';
                    const strNumB = String(numericPartB).split('.')[i] || '';
                    if (isNaN(valA) && isNaN(valB)){ if (strNumA !== strNumB) return strNumA.localeCompare(strNumB); }
                    else return isNaN(valA) ? 1 : -1;
                } else if (valA !== valB) { return valA - valB; }
            }
            // Se chegou aqui, a parte numérica é idêntica (raro se os IDs base forem diferentes, mas cobre)
        }

        // Se a parte numérica for igual, compara pela parte da categoria (se existir)
        // Pega tudo após o primeiro '_' como categoria (caso a categoria tenha '_')
        const categoryA = partsA.slice(1).join('_') || '';
        const categoryB = partsB.slice(1).join('_') || '';

        if (categoryA !== categoryB) {
            return categoryA.localeCompare(categoryB); // Ordena alfabeticamente por categoria
        }

        // Se tudo for igual
        return 0;
    } // Fim compareIds


    function initializeVisualizations() {
        console.log("main-init.js: Iniciando criação de filtros, subtítulos, squares e inicialização...");

        // --- Seleção dos Elementos Essenciais ---
        const gridContainer = document.querySelector('.grid-container');
        const filterButtonsContainer = document.getElementById('dimension-filters');
        const dimensionTitleDisplay = document.getElementById('dimension-title');

        // --- Verificação da Existência dos Elementos ---
        if (!gridContainer || !filterButtonsContainer || !dimensionTitleDisplay) {
            console.error("Erro crítico: Elementos .grid-container, #dimension-filters ou #dimension-title não encontrados no HTML.");
            if (document.body) {
                 document.body.insertAdjacentHTML('afterbegin', '<p style="color: red; background: yellow; padding: 10px; text-align: center;">Erro crítico: Elementos essenciais da página não encontrados. A visualização não pode ser carregada.</p>');
            }
            return;
        }

        // --- Limpeza Inicial ---
        gridContainer.innerHTML = ''; filterButtonsContainer.innerHTML = '';
        dimensionTitleDisplay.textContent = 'Carregando...';

        // --- Mapeamento de Tipos e Obtenção dos Dados ---
        // !!! GARANTA QUE TeiaPair ESTÁ MAPEADO !!!
        const typeMapping = {
            'Barra': 'grafico_de_barras',
            'Teia': 'grafico_de_teia', // Teia Normal
            'Quadro de respostas abertas': 'quadro_de_respostas',
            'TeiaPair': 'teia_pair_special' // Tipo para Teia Especial
        };

        const visualizacaoData = window.visualizacaoData || {};
        let idsParaInicializar = Object.keys(visualizacaoData); // Pega as chaves (inclui os novos IDs _Categoria)

        // --- Ordenação dos IDs ---
        idsParaInicializar.sort(compareIds); // Ordena usando a função de comparação atualizada
        console.log("IDs ordenados para processamento:", idsParaInicializar);

        // --- Tratamento de Dados Vazios ---
        if (idsParaInicializar.length === 0) {
            console.warn("window.visualizacaoData está vazio. Nenhuma visualização será criada.");
            gridContainer.innerHTML = '<p style="text-align: center; padding: 20px; color: #555;">Nenhum dado de visualização encontrado.</p>';
            dimensionTitleDisplay.textContent = 'Nenhuma Dimensão Encontrada';
            return;
        }

        // --- Lógica de Criação dos Botões de Filtro por Dimensão ---
        const dimensionsMap = new Map();
        Object.values(visualizacaoData).forEach(item => {
             if (item?.dimensionNumber && String(item.dimensionNumber).trim() !== "") {
                const dimNumStr = String(item.dimensionNumber).trim();
                 if (!dimensionsMap.has(dimNumStr)) { dimensionsMap.set(dimNumStr, item.dimensionName || `Dimensão ${dimNumStr}`); }
            }
        });
        const sortedDimensions = [...dimensionsMap.entries()].sort((a, b) => { const numA=parseInt(a[0],10); const numB=parseInt(b[0],10); if(isNaN(numA)&&isNaN(numB)) return 0; if(isNaN(numA)) return 1; if(isNaN(numB)) return -1; return numA-numB; });
        // Cria botão "Todas"
        const allButton = document.createElement('button'); allButton.className = 'filter-btn active'; allButton.textContent = 'Todas as Dimensões'; allButton.dataset.dimension = 'all'; filterButtonsContainer.appendChild(allButton);
        // Cria botões para cada dimensão
        sortedDimensions.forEach(([dimNumber, dimName]) => { const dimButton = document.createElement('button'); dimButton.className = 'filter-btn'; dimButton.textContent = `Dimensão ${dimNumber}`; dimButton.dataset.dimension = dimNumber; dimButton.title = dimName; filterButtonsContainer.appendChild(dimButton); });
        console.log(`main-init.js: ${filterButtonsContainer.children.length} botões de filtro criados.`);
        // --- FIM: Criação dos Botões ---

        // --- Criação da Tabela de Informações e Contagem ---
        const infoTableContainer = document.getElementById('info-summary-table-container');
        if (infoTableContainer) { /* ... (código da tabela de info original) ... */
            infoTableContainer.innerHTML = ''; let schoolInfo = { name: 'N/A', city: 'N/A', state: 'N/A', responsible: 'N/A' }; const storedSchoolInfo = localStorage.getItem("schoolInfo"); if (storedSchoolInfo) { try { const parsedInfo = JSON.parse(storedSchoolInfo); schoolInfo.name=parsedInfo.name||schoolInfo.name; schoolInfo.city=parsedInfo.city||schoolInfo.city; schoolInfo.state=parsedInfo.state||schoolInfo.state; schoolInfo.responsible=parsedInfo.responsible||schoolInfo.responsible; } catch (e) { console.error("Erro ao parsear schoolInfo:", e); } } const respondentCounts = {}; const dadosCompletosLocal = JSON.parse(localStorage.getItem("dadosCompletos")); if (dadosCompletosLocal?.DemaisTabelas) { for (const [fileName, table] of Object.entries(dadosCompletosLocal.DemaisTabelas)) { const groupName = fileName.replace(/\.(xlsx?|csv)$/i, ""); const count = (table || []).slice(1).filter(row => row?.some(cell => cell != null && String(cell).trim() !== '')).length; respondentCounts[groupName] = count; } } console.log("Contagem de Respondentes:", respondentCounts); const table = document.createElement('table'); table.id = 'info-summary-table'; const tbody = table.createTBody(); const addRow = (label, value) => { const row = tbody.insertRow(); const th = document.createElement('th'); th.textContent = label; const td = document.createElement('td'); td.textContent = value; row.appendChild(th); row.appendChild(td); }; const schoolHeaderRow = tbody.insertRow(); schoolHeaderRow.className = 'info-header'; const schoolHeaderCell = schoolHeaderRow.insertCell(); schoolHeaderCell.colSpan = 2; schoolHeaderCell.textContent = 'Informações da Escola'; addRow('Escola:', schoolInfo.name); addRow('Local:', `${schoolInfo.city} / ${schoolInfo.state}`); addRow('Responsável:', schoolInfo.responsible); if (Object.keys(respondentCounts).length > 0) { const countHeaderRow = tbody.insertRow(); countHeaderRow.className = 'counts-header'; const countHeaderCell = countHeaderRow.insertCell(); countHeaderCell.colSpan = 2; countHeaderCell.textContent = 'Total de Respondentes por Grupo'; for (const [group, count] of Object.entries(respondentCounts)) { addRow(group + ':', count); } } infoTableContainer.appendChild(table);
        } else { console.error("Container #info-summary-table-container não encontrado."); }
        // --- FIM: Tabela de Informações ---


        // --- Criação dos Subtítulos de Indicador e Squares ---
        let currentIndicatorFullId = null; // Rastreia Dim.Ind

        // Itera sobre os IDs JÁ ORDENADOS
        idsParaInicializar.forEach(id => {
            const dataItem = visualizacaoData[id];
            if (!dataItem || !dataItem.type) { console.warn(`Dados inválidos para ID ${id}. Pulando.`); return; }

            // Usa o mapeamento ATUALIZADO que inclui TeiaPair
            const dataType = typeMapping[dataItem.type] || 'tipo_desconhecido';
            if (dataType === 'tipo_desconhecido') {
                console.warn(`Tipo "${dataItem.type}" para ID "${id}" não mapeado (${JSON.stringify(typeMapping)}). Pulando.`);
                return;
            }

            // --- Lógica para Inserir Subtítulo do Indicador ---
            if (dataItem.dimensionNumber && dataItem.indicatorNumber) {
                const itemIndicatorFullId = `${dataItem.dimensionNumber}.${dataItem.indicatorNumber}`;
                const itemIndicatorName = dataItem.indicatorName || `Indicador ${dataItem.indicatorNumber}`;
                if (itemIndicatorFullId !== currentIndicatorFullId) {
                    const subtitleElement = document.createElement('h3'); subtitleElement.className = 'indicator-subtitle';
                    subtitleElement.textContent = itemIndicatorName;
                    subtitleElement.setAttribute('data-indicator-full-id', itemIndicatorFullId);
                    subtitleElement.setAttribute('data-dimension-number', String(dataItem.dimensionNumber).trim());
                    gridContainer.appendChild(subtitleElement);
                    currentIndicatorFullId = itemIndicatorFullId;
                }
            } else { console.warn(`Item ${id} sem dimension/indicator number válidos.`); }
            // --- FIM: Lógica do Subtítulo ---

            // --- Criação do Square ---
            const square = document.createElement('div');
            square.classList.add('square');
            square.setAttribute('data-type', dataType); // Usa o dataType mapeado (ex: 'teia_pair_special')
            square.setAttribute('data-id', id); // Usa o ID completo (ex: '4.5.1_Categoria')
            // Atributos para filtragem
            if (dataItem.dimensionNumber) { square.setAttribute('data-dimension-number', String(dataItem.dimensionNumber).trim()); }
            else { square.setAttribute('data-dimension-number', 'none'); }
            if (dataItem.dimensionNumber && dataItem.indicatorNumber) { square.setAttribute('data-indicator-full-id', `${dataItem.dimensionNumber}.${dataItem.indicatorNumber}`); }

            // Adiciona classe para altura dupla SE for TeiaPair
            if (dataType === 'teia_pair_special') {
                square.classList.add('special-teia-double-height'); // Classe definida no CSS
            }

            square.innerHTML = `<div class="loading-placeholder">Carregando ${id}...</div>`;
            gridContainer.appendChild(square);
            // --- FIM: Criação do Square ---
        });
        console.log(`main-init.js: ${gridContainer.querySelectorAll('.square').length} squares criados.`);
        console.log(`main-init.js: ${gridContainer.querySelectorAll('.indicator-subtitle').length} subtítulos de indicador criados.`);

        // --- Lógica de Filtragem por Dimensão (Event Listener nos Botões) ---
        filterButtonsContainer.addEventListener('click', (event) => { /* ... (lógica de filtro original) ... */
             const clickedButton = event.target.closest('.filter-btn'); if (clickedButton) { const selectedDimension = clickedButton.dataset.dimension; filterButtonsContainer.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active')); clickedButton.classList.add('active'); dimensionTitleDisplay.textContent = selectedDimension === 'all' ? 'Todas as Dimensões' : (dimensionsMap.get(selectedDimension) || `Dimensão ${selectedDimension}`); const allSquares = gridContainer.querySelectorAll('.square'); const allSubtitles = gridContainer.querySelectorAll('.indicator-subtitle'); let visibleSquareCount = 0; allSquares.forEach(square => { const d = square.dataset.dimensionNumber; square.style.display = (selectedDimension === 'all' || d === selectedDimension) ? 'flex' : 'none'; if(square.style.display !== 'none') visibleSquareCount++; }); allSubtitles.forEach(subtitle => { const d = subtitle.dataset.dimensionNumber; subtitle.style.display = (selectedDimension === 'all' || d === selectedDimension) ? 'block' : 'none'; }); console.log(`Filtro aplicado: Dimensão '${selectedDimension}'. ${visibleSquareCount} squares visíveis.`); }
        });
        // --- FIM: Lógica de Filtragem ---

        dimensionTitleDisplay.textContent = 'Todas as Dimensões'; // Título inicial

        // --- Chamada dos Inicializadores dos Módulos de Gráfico/Tabela ---
        console.log("main-init.js: Chamando inicializadores dos módulos...");
        // Os inicializadores (RadarChart.init) precisam saber lidar com 'teia_pair_special'
        if (typeof BarChart !== 'undefined' && BarChart.init) BarChart.init();
        else console.error("Módulo BarChart não carregado ou não possui init().");
        if (typeof RadarChart !== 'undefined' && RadarChart.init) RadarChart.init(); // RadarChart.init precisa tratar ambos os tipos teia
        else console.error("Módulo RadarChart não carregado ou não possui init().");
        if (typeof ResponseTable !== 'undefined' && ResponseTable.init) ResponseTable.init();
        else console.error("Módulo ResponseTable não carregado ou não possui init().");
        console.log("main-init.js: Inicialização dos módulos solicitada.");

    } // --- Fim da função initializeVisualizations ---


    // --- Lógica para Aguardar os Dados e Chamar a Inicialização ---
    if (window.visualizacaoData && Object.keys(window.visualizacaoData).length > 0) {
        console.log("main-init.js: window.visualizacaoData encontrado. Iniciando.");
        initializeVisualizations();
    } else { /* ... (lógica de espera e fallback com timeout original) ... */
        console.log("main-init.js: Aguardando 'visualizacaoDataReady'."); const handleDataReady = () => { console.log("main-init.js: Evento 'visualizacaoDataReady' recebido."); if (window.visualizacaoData && Object.keys(window.visualizacaoData).length > 0) { console.log("main-init.js: Iniciando após evento."); initializeVisualizations(); } else { console.error("Erro crítico: 'visualizacaoDataReady' disparado, mas dados inválidos."); const gridContainer = document.querySelector('.grid-container'); const dimensionTitleDisplay = document.getElementById('dimension-title'); if (gridContainer) gridContainer.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Falha ao carregar os dados necessários após o evento.</p>'; if (dimensionTitleDisplay) dimensionTitleDisplay.textContent = 'Erro ao carregar dados'; } }; document.addEventListener('visualizacaoDataReady', handleDataReady, { once: true }); setTimeout(() => { document.removeEventListener('visualizacaoDataReady', handleDataReady); const hasFilterButtons = document.querySelector('#dimension-filters .filter-btn'); if (!hasFilterButtons) { if (window.visualizacaoData && Object.keys(window.visualizacaoData).length > 0) { console.log("main-init.js: Iniciando no timeout."); initializeVisualizations(); } else { console.error("Erro crítico: Timeout esperando dados."); const gridContainer = document.querySelector('.grid-container'); const dimensionTitleDisplay = document.getElementById('dimension-title'); if (gridContainer) gridContainer.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Falha ao carregar os dados (timeout).</p>'; if (dimensionTitleDisplay) dimensionTitleDisplay.textContent = 'Erro ao carregar dados (timeout)'; } } else { console.log("main-init.js: Timeout, mas parece já inicializado."); } }, 5000);
    }


    // --- Listeners Globais (edição, collapse, fechar modal) ---
    // 1. Listener para Botões de Edição (JÁ PREPARADO PARA TeiaPair)
    document.body.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-chart-btn');
        const editPerguntasBtn = e.target.closest('.edit-perguntas-btn');
        if (!editBtn && !editPerguntasBtn) return;

        const buttonClicked = editBtn || editPerguntasBtn;
        const square = buttonClicked.closest('.square'); if (!square) return;
        const dataIdFromSquare = square.getAttribute('data-id'); if (!dataIdFromSquare) return;
        const dataType = square.getAttribute('data-type'); // Pega o tipo do square

        if (editPerguntasBtn) {
            // Lógica Editar Perguntas
            console.log(`Botão Editar Perguntas clicado para Square ID=${dataIdFromSquare}, Type=${dataType}`);
            let idParaPerguntasTable = dataIdFromSquare; // Default

            // === AJUSTE PARA TeiaPair ===
            if (dataType === 'teia_pair_special') {
                 const parts = dataIdFromSquare.split('_');
                 if (parts.length > 1) {
                     const baseIdDetected = parts[0]; // Assume baseId é a parte antes do '_'
                     if (baseIdDetected) { idParaPerguntasTable = baseIdDetected; console.log(`   Tipo TeiaPair detectado. Usando Base ID para tabela: ${idParaPerguntasTable}`); }
                     else { console.warn(`   Não foi possível extrair baseId de TeiaPair ID: ${dataIdFromSquare}`); }
                 } else { console.warn(`   TeiaPair ID ${dataIdFromSquare} não tem formato esperado com '_'`); }
            }
            // === FIM: AJUSTE ===

            // Chama openEditModal com o ID correto
            if (typeof PerguntasTable !== 'undefined' && PerguntasTable.openEditModal) {
                 if (!window.defaultPerguntasTableSettings) { console.error("defaultPerguntasTableSettings não encontrado."); return; }
                 console.log(`   Chamando PerguntasTable.openEditModal com ID: ${idParaPerguntasTable}`);
                 PerguntasTable.openEditModal(idParaPerguntasTable); // << USA O ID CORRETO
            } else { console.error("PerguntasTable.openEditModal não está disponível.");}

        } else if (editBtn) {
            // Lógica Editar Principal (Gráfico/Tabela)
             if (!dataType) return;
             console.log(`Botão Editar Principal clicado para: ID=${dataIdFromSquare}, Type=${dataType}`);
            switch (dataType) {
                case 'grafico_de_barras':
                    if (typeof BarChart !== 'undefined' && BarChart.openEditModal) BarChart.openEditModal(dataIdFromSquare); // Usa ID do square
                    else console.error("BarChart.openEditModal não encontrado."); break;
                case 'grafico_de_teia': // Teia Normal
                case 'teia_pair_special': // TEIA ESPECIAL TAMBÉM CHAMA RadarChart.openEditModal
                    if (typeof RadarChart !== 'undefined' && RadarChart.openEditModal) RadarChart.openEditModal(dataIdFromSquare); // Passa o ID do square (normal ou _Categoria)
                    else console.error("RadarChart.openEditModal não encontrado."); break;
                case 'quadro_de_respostas':
                    if (typeof ResponseTable !== 'undefined' && ResponseTable.openEditModal) ResponseTable.openEditModal(dataIdFromSquare); // Usa ID do square
                    else console.error("ResponseTable.openEditModal não encontrado."); break;
                default: console.warn("Tipo de dado não reconhecido para edição:", dataType);
            }
        }
    });

    // 2. Listener para Botões de Collapse/Expand (sem mudanças)
    document.body.addEventListener('click', (e) => { /* ... (código original collapse) ... */
        const collapseBtn = e.target.closest('.collapse-perguntas-btn'); if (!collapseBtn) return; const square = collapseBtn.closest('.square'); if (!square) return; const tableWrapper = square.querySelector('.perguntas-table-wrapper'); if (tableWrapper) { tableWrapper.classList.toggle('collapsed'); collapseBtn.classList.toggle('collapsed'); }
    });

    // 3. Listener Global para Fechar Modais (sem mudanças)
    document.body.addEventListener('click', (e) => { /* ... (código original fechar modal) ... */
        if (e.target.classList.contains('modal-overlay') && e.target.classList.contains('modal-component')) { if (typeof closeModal === 'function') { closeModal(e.target); } else { console.warn("Função global closeModal não encontrada."); } }
    });
    console.log("main-init.js: Listeners globais configurados.");


    // --- Sidebar de Download (sem mudanças) ---
    const openBtn = document.getElementById('open-download-sidebar-btn'); const closeBtn = document.getElementById('close-download-sidebar-btn'); const sidebar = document.getElementById('download-sidebar');
    if (openBtn && closeBtn && sidebar) { /* ... (código original sidebar) ... */
        console.log("Sidebar toggle elements found."); openBtn.addEventListener('click', () => { sidebar.classList.add('open'); openBtn.classList.add('hidden'); }); closeBtn.addEventListener('click', () => { sidebar.classList.remove('open'); openBtn.classList.remove('hidden'); }); document.body.addEventListener('click', (event) => { if (sidebar.classList.contains('open') && !sidebar.contains(event.target) && event.target !== openBtn) { sidebar.classList.remove('open'); openBtn.classList.remove('hidden'); } }, true);
    } else { console.error("Could not find all sidebar toggle elements."); }
    if (typeof DownloadHandler !== 'undefined' && DownloadHandler.init) { DownloadHandler.init(); }
    else { console.error("DownloadHandler not found or does not have init()."); }

}); // Fim do DOMContentLoaded