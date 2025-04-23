/* response-table.js */
/* Lógica para Quadros de Respostas (Tabelas HTML). Adaptado para usar window.visualizacaoData, data-id e permitir exclusão de linhas no modal. */
/* Incorpora carregamento de configurações salvas (estilo E dados) de window.configRespostas. */

const ResponseTable = (() => {

    const defaults = () => window.defaultTableSettings || {};

    // Função auxiliar para criar célula da tabela com estilos
    const createCell = (parentRow, text, styles, isHeader = false, cellClass = null) => {
        const cell = parentRow.insertCell();
        cell.colSpan = 1;
        Object.assign(cell.style, styles);
        if (cellClass) {
            cell.classList.add(cellClass);
        }
        if (!isHeader && text !== null && text !== undefined) {
            cell.innerHTML = String(text).replace(/\n/g, '<br>');
        } else {
            cell.textContent = text ?? '';
        }
        return cell;
    };

    // Função principal para renderizar a tabela HTML
    const plot = (data, options = {}, containerId, isModalPreview = false) => {
        const container = getEl(containerId);
        if (!container) {
             console.error("ResponseTable.plot: Container não encontrado:", containerId);
             const parentSquare = document.querySelector(`.square [id='${containerId}']`)?.closest('.square');
             if(parentSquare) parentSquare.innerHTML = `<p style="color: red;">Erro: Container ${containerId} não encontrado.</p>`;
             return;
        }

        // Tratamento de dados ausentes ou inválidos
        if (data === null || data === undefined || typeof data !== 'object') {
             console.warn(`ResponseTable.plot: Dados inválidos ou ausentes para ${containerId}. Exibindo mensagem.`);
             container.innerHTML = '<p style="color: orange; text-align: center;">(Sem dados de respostas disponíveis)</p>';
             // Adiciona título se existir nas opções, mesmo sem dados
             if(options.title) {
                 const titleEl = document.createElement('h3');
                 Object.assign(titleEl.style, { color: options.titleColor || '#000', fontSize: `${options.titleFontSize || 16}px`, textAlign: "center", marginBottom: '10px', fontWeight: 'bold' });
                 titleEl.textContent = options.title;
                 container.insertBefore(titleEl, container.firstChild);
             }
             return;
        }

        const settings = { ...defaults(), ...options };
        const {
            title, titleFontSize, titleColor, headColor, cellColor, bgColor,
            headFontSize, cellFontSize, borderSize, borderColor, headAlign, cellAlign
        } = settings;

        container.innerHTML = ""; // Limpa container antes de recriar
        Object.assign(container.style, { backgroundColor: bgColor, padding: '10px', boxSizing: 'border-box' });

        // Adiciona título H3 se fornecido
        if (title) {
            const titleEl = document.createElement('h3');
            Object.assign(titleEl.style, { color: titleColor, fontSize: `${titleFontSize}px`, textAlign: "center", marginBottom: '10px', fontWeight: 'bold' });
            titleEl.textContent = title;
            container.appendChild(titleEl);
        }

        // Cria tabela e define estilos base
        const table = document.createElement('table');
        Object.assign(table.style, { width: "100%", borderCollapse: "collapse", border: `${borderSize}px solid ${borderColor}` });

        const baseCellStyle = { border: `${borderSize}px solid ${borderColor}`, padding: "6px" };
        const headerCellStyle = { ...baseCellStyle, backgroundColor: headColor, fontSize: `${headFontSize}px`, fontWeight: 'bold', textAlign: headAlign, padding: "8px" };
        const responseCellStyle = { ...baseCellStyle, backgroundColor: cellColor, fontSize: `${cellFontSize}px`, textAlign: cellAlign, verticalAlign: 'top' };
        const noResponseCellStyle = { ...responseCellStyle, textAlign: 'center', fontStyle: 'italic', color: '#666' };
        const deleteBtnCellStyle = { ...baseCellStyle, width: '30px', textAlign: 'center', padding: '0', backgroundColor: cellColor };

        // Verifica se há grupos para exibir
        const groups = Object.keys(data);
        if (groups.length === 0 && !isModalPreview) { // Não mostra msg no modal se estiver vazio, pois pode ter tido grupos excluídos
             const row = table.insertRow();
             const cell = row.insertCell();
             cell.colSpan = isModalPreview ? 2 : 1; // Colspan 2 no modal se tiver botão
             cell.innerHTML = '<td colspan="1" style="text-align:center; font-style:italic; padding:10px;">Nenhum grupo com respostas para exibir.</td>';
        } else {
            // Adiciona cabeçalho da tabela (invisível) se estiver no modal para alinhar colunas
            if (isModalPreview) {
                 const thead = table.createTHead();
                 const hr = thead.insertRow();
                 const th1 = hr.insertCell(); // Célula para conteúdo
                 th1.style.width = 'calc(100% - 30px)'; // Define largura para conteúdo
                 const th2 = hr.insertCell(); // Célula para botão
                 th2.style.width = '30px';
                 hr.style.visibility = 'collapse'; // Esconde o header visualmente, mas mantém estrutura
            }

            const tbody = table.createTBody();
            // Itera sobre cada grupo nos dados
            groups.forEach(group => {
                const responses = data[group];
                // Cabeçalho do Grupo (sempre visível)
                 const headerRow = tbody.insertRow();
                 const headerCell = createCell(headerRow, group, headerCellStyle, true);
                 if (isModalPreview) headerCell.colSpan = 2; // Ocupa duas colunas no modal

                // Linhas de Resposta (ou placeholder se não houver)
                if (Array.isArray(responses) && responses.length > 0) {
                    responses.forEach((response, index) => {
                        const responseRow = tbody.insertRow();
                        createCell(responseRow, response, responseCellStyle); // Célula da resposta
                        // Adiciona célula e botão de exclusão SE estiver no modal
                        if (isModalPreview) {
                            const deleteCell = createCell(responseRow, '', deleteBtnCellStyle, false, 'delete-cell');
                            const deleteBtn = document.createElement('button');
                            deleteBtn.textContent = 'X';
                            deleteBtn.classList.add('delete-response-btn');
                            deleteBtn.setAttribute('data-group', group);
                            deleteBtn.setAttribute('data-index', index.toString());
                            Object.assign(deleteBtn.style, { color: 'red', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' });
                            deleteCell.appendChild(deleteBtn);
                        }
                    });
                } else {
                    // Linha "(Sem respostas registradas)"
                    const noResponseRow = tbody.insertRow();
                    const noResponseCell = createCell(noResponseRow, "(Sem respostas registradas)", noResponseCellStyle);
                    // Adiciona botão de exclusão para o placeholder SE estiver no modal
                    if (isModalPreview) {
                         const deletePlaceholderCell = createCell(noResponseRow, '', deleteBtnCellStyle, false, 'delete-cell');
                         const deletePlaceholderBtn = document.createElement('button');
                         deletePlaceholderBtn.textContent = 'X';
                         deletePlaceholderBtn.classList.add('delete-response-btn');
                         deletePlaceholderBtn.setAttribute('data-group', group);
                         deletePlaceholderBtn.setAttribute('data-is-placeholder', 'true'); // Marca como placeholder
                         Object.assign(deletePlaceholderBtn.style, { color: 'red', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' });
                         deletePlaceholderCell.appendChild(deletePlaceholderBtn);
                    }
                }
            });
        }
        // Adiciona a tabela completa ao container
        container.appendChild(table);
    }; // Fim plot

     // Constrói o HTML do modal de edição
     const buildModalHTML = settings => {
        const d = defaults();
        // buildOptions e buildInput vêm de shared-utils.js
        const alignOpts = (sel, def) => buildOptions(['left', 'center', 'right', 'justify'], sel, def);

        return `
          <div class="graph-container" style="display: flex; align-items: flex-start; justify-content: center; min-height: 300px; padding: 10px; background-color: #f0f0f0;">
              <div id="modalTablePreview" style="width: 100%; max-height: 595px; overflow-y: auto; overflow-x: hidden; background:${settings.bgColor ?? d.bgColor ?? '#ffffff'}; border: 1px solid #ccc; box-sizing: border-box;"></div>
          </div>
          <div class="settings-container">
            <h3>Editar Quadro de Respostas</h3>
            <div class="basic-settings">
              ${buildInput('text', 'table-title', settings.title ?? d.title ?? '', 'Título')}
              ${buildInput('number', 'table-title-font', settings.titleFontSize ?? d.titleFontSize ?? 16, 'Tam. Fonte Título')}
              ${buildInput('color', 'table-title-color', settings.titleColor ?? d.titleColor ?? '#000000', 'Cor Título')}
              ${buildInput('color', 'table-head-color', settings.headColor ?? d.headColor ?? '#b0c4de', 'Cor Cabeçalho')}
              ${buildInput('color', 'table-cell-color', settings.cellColor ?? d.cellColor ?? '#f0f8ff', 'Cor Células')}
              ${buildInput('color', 'table-bg-color', settings.bgColor ?? d.bgColor ?? '#ffffff', 'Cor Fundo')}
              <button id="toggle-additional-table-btn">Mais Configurações</button>
            </div>
            <div class="additional-table-settings" style="display:none;">
               ${buildInput('number', 'table-head-font', settings.headFontSize ?? d.headFontSize ?? 14, 'Tam. Fonte Cabeçalho')}
               ${buildInput('number', 'table-cell-font', settings.cellFontSize ?? d.cellFontSize ?? 12, 'Tam. Fonte Respostas')}
               ${buildInput('number', 'table-border-size', settings.borderSize ?? d.borderSize ?? 1, 'Tam. Borda (px)', { props: { min: "0" } })}
               ${buildInput('color', 'table-border-color', settings.borderColor ?? d.borderColor ?? '#cccccc', 'Cor Borda')}
               ${buildInput('select', 'table-head-align', '', 'Alinh. Cabeçalho', { optionHTML: alignOpts(settings.headAlign, d.headAlign) })}
               ${buildInput('select', 'table-cell-align', '', 'Alinh. Respostas', { optionHTML: alignOpts(settings.cellAlign, d.cellAlign) })}
              <button id="toggle-additional-table-btn-hide">Menos Configurações</button>
            </div>
            <div class="settings-buttons">
              <div class="btn-group"><button id="apply-table-btn">Aplicar</button><select id="apply-table-scope"><option value="this">Neste</option><option value="all">Em Todos</option></select></div>
              <div class="btn-group"><button id="reset-table-btn">Voltar ao Padrão</button><select id="reset-table-scope"><option value="this">Neste</option><option value="all">Em Todos</option></select></div>
              <button id="close-table-edit-btn">Cancelar</button>
            </div>
          </div>
        `;
    }; // Fim buildModalHTML

    // Coleta os valores do formulário do modal
     const getFormValues = () => {
        const d = defaults();
        // getVal e getIntVal vêm de shared-utils.js
        return {
            title: getVal('table-title'),
            titleFontSize: getIntVal('table-title-font', d.titleFontSize),
            titleColor: getVal('table-title-color'),
            headColor: getVal('table-head-color'),
            cellColor: getVal('table-cell-color'),
            bgColor: getVal('table-bg-color'),
            headFontSize: getIntVal('table-head-font', d.headFontSize),
            cellFontSize: getIntVal('table-cell-font', d.cellFontSize),
            borderSize: getIntVal('table-border-size', d.borderSize),
            borderColor: getVal('table-border-color'),
            headAlign: getVal('table-head-align') || d.headAlign,
            cellAlign: getVal('table-cell-align') || d.cellAlign
        };
    }; // Fim getFormValues

     // Aplica ou Reseta configurações à referência da tabela e re-renderiza
     const applyOrResetToTable = (tableRef, newOpts) => {
         if (tableRef?.containerId && typeof tableRef.data !== 'undefined' && typeof plot === 'function') {
             tableRef.options = JSON.parse(JSON.stringify(newOpts)); // Atualiza opções armazenadas
             // Re-renderiza a tabela principal com os DADOS ATUAIS e as NOVAS OPÇÕES
             plot(tableRef.data, tableRef.options, tableRef.containerId, false); // false para não mostrar 'X'
         } else {
             console.error("Falha ao aplicar/resetar: referência de tabela inválida ou dados ausentes.", tableRef);
         }
     }; // Fim applyOrResetToTable

    // Abre o modal de edição para a tabela
     const openEditModal = (dataId) => {
        console.log(`ResponseTable.openEditModal chamado para ID: ${dataId}`);
        const chartKey = `table_${dataId}`;
        const tableRef = window.charts?.[chartKey];

        // Verifica se a referência existe e contém os dados e opções necessários
        if (!tableRef || typeof tableRef.data === 'undefined' || typeof tableRef.originalData === 'undefined' || !tableRef.options || !tableRef.containerId) {
             console.error("Referência da tabela inválida, incompleta ou não encontrada:", chartKey, tableRef);
             alert(`Erro: Não foi possível encontrar os dados ou configurações para editar a tabela ${dataId}.`);
             return;
         }

         const d = defaults();
         // Faz cópias das opções e dados ATUAIS para edição isolada no modal
         let currentModalOptions = { ...d, ...(tableRef.options || {}) };
         let currentModalData = JSON.parse(JSON.stringify(tableRef.data)); // Usa dados atuais da referência

         // Cria overlay e modal
         const overlay = createOverlay();
         const modal = document.createElement('div');
         modal.className = 'edit-modal modal-component';
         modal.innerHTML = buildModalHTML(currentModalOptions); // Passa opções atuais copiadas
         overlay.appendChild(modal);

         // --- Configura Preview e Listeners ---
         const previewContainerId = "modalTablePreview";
         const modalPreviewContainer = getEl(previewContainerId);

         // Função para renderizar preview usando dados e opções do estado do modal
         const renderPreview = () => {
             plot(currentModalData, currentModalOptions, previewContainerId, true); // true = modal
         };
         renderPreview(); // Renderiza preview inicial

         // Listener para EXCLUSÃO DE LINHA (delegação no container da preview)
         modalPreviewContainer.addEventListener('click', (e) => {
             const deleteBtn = e.target.closest('.delete-response-btn');
             if (!deleteBtn) return; // Sai se não clicou no botão X

             const group = deleteBtn.getAttribute('data-group');
             const indexStr = deleteBtn.getAttribute('data-index');
             const isPlaceholder = deleteBtn.getAttribute('data-is-placeholder') === 'true';

             if (!group || (!indexStr && !isPlaceholder)) {
                 console.error('Botão de exclusão sem atributos data-group/data-index ou data-is-placeholder.');
                 return;
             }

             // Modifica currentModalData
             if (currentModalData[group]) {
                 if (isPlaceholder) { // Se clicou no 'X' do "(Sem respostas registradas)"
                     delete currentModalData[group]; // Remove o grupo inteiro
                     console.log(`Grupo placeholder "${group}" removido do estado do modal.`);
                 } else { // Se clicou no 'X' de uma resposta específica
                     const index = parseInt(indexStr, 10);
                     if (!isNaN(index) && currentModalData[group][index] !== undefined) {
                         currentModalData[group].splice(index, 1); // Remove a resposta
                         console.log(`Resposta índice ${index} do grupo "${group}" removida do estado do modal.`);
                         // Se o grupo ficou vazio após a exclusão, remove o grupo
                         if (currentModalData[group].length === 0) {
                             delete currentModalData[group];
                             console.log(`Grupo "${group}" removido do estado do modal por ficar vazio.`);
                         }
                     }
                 }
                 // Atualiza a preview imediatamente após modificar currentModalData
                 renderPreview();
             }
         });


         // Listeners para atualização de OPÇÕES (inputs de configuração)
         const updateOptionsAndPreview = () => {
            currentModalOptions = getFormValues(); // Atualiza objeto de opções do modal
            renderPreview(); // Re-renderiza com novas opções e dados atuais
         };
         modal.querySelectorAll('.settings-container input, .settings-container select').forEach(el => {
            const eventType = ['color', 'number', 'text', 'range'].includes(el.type) ? 'input' : 'change';
            el.addEventListener(eventType, updateOptionsAndPreview);
         });
         // Listeners botões Mais/Menos
         onClick('toggle-additional-table-btn', () => { getEl('toggle-additional-table-btn').style.display = 'none'; modal.querySelector('.additional-table-settings').style.display = 'block'; });
         onClick('toggle-additional-table-btn-hide', () => { getEl('toggle-additional-table-btn').style.display = 'block'; modal.querySelector('.additional-table-settings').style.display = 'none'; });


         // --- Botões de Ação (Aplicar, Resetar, Cancelar) ---
         onClick('apply-table-btn', () => {
            const finalOptions = getFormValues(); // Pega opções do formulário
            const finalData = JSON.parse(JSON.stringify(currentModalData)); // Pega estado dos dados do modal
            const scope = getVal('apply-table-scope');
            const editedTableDataId = tableRef.dataId; // ID da tabela editada neste modal

            // Define a ação a ser aplicada
            const applyAction = (instance) => {
                let optionsToApply = JSON.parse(JSON.stringify(finalOptions));
                let dataToApply;

                if (instance.dataId === editedTableDataId) { // É a tabela editada?
                    dataToApply = JSON.parse(JSON.stringify(finalData)); // Usa dados modificados
                    console.log(`Aplicando dados modificados e opções (incl. título '${optionsToApply.title}') a ${instance.dataId}`);
                } else { // É outra tabela (scope='all')?
                    dataToApply = JSON.parse(JSON.stringify(instance.data)); // Mantém dados existentes
                    // Preserva o título original da instância
                    const originalInstanceTitle = instance.options?.title || window.visualizacaoData?.[instance.dataId]?.title || `Quadro ${instance.dataId}`;
                    optionsToApply.title = originalInstanceTitle; // Sobrescreve título nas opções a aplicar
                    console.log(`Aplicando opções (preservando título '${originalInstanceTitle}') a ${instance.dataId}`);
                }
                // Atualiza a referência da instância e re-renderiza a tabela principal
                instance.options = optionsToApply;
                instance.data = dataToApply;
                plot(instance.data, instance.options, instance.containerId, false);
            };

            // Aplica a ação de acordo com o escopo
            applyScopedAction('table_', tableRef, scope, applyAction); // applyScopedAction de shared-utils
            closeModal(overlay); // closeModal de shared-utils
        });

         onClick('reset-table-btn', () => {
             const globalDefaults = defaults();
             if (!globalDefaults || Object.keys(globalDefaults).length === 0) {
                 console.error("Defaults da tabela não encontrados para reset!");
                 alert("Erro: Configurações padrão não encontradas para resetar.");
                 return;
             }
             const resetOpts = JSON.parse(JSON.stringify(globalDefaults)); // Pega cópia dos defaults

             // Define a ação de reset
             const resetAction = (instance) => {
                 // Restaura DADOS ORIGINAIS e OPÇÕES PADRÃO
                 instance.data = JSON.parse(JSON.stringify(instance.originalData)); // Usa a cópia original dos dados
                 instance.options = JSON.parse(JSON.stringify(resetOpts)); // Usa os defaults globais
                 // Mantém o título original da instância ao resetar
                 const originalTitle = window.visualizacaoData?.[instance.dataId]?.title || `Quadro ${instance.dataId}`;
                 instance.options.title = originalTitle;

                 // Re-renderiza a tabela principal da instância
                 plot(instance.data, instance.options, instance.containerId, false);
             };

             // Aplica a ação de reset de acordo com o escopo
             applyScopedAction('table_', tableRef, getVal('reset-table-scope'), resetAction);

             // Atualiza a preview no modal para refletir o reset (dados originais e opções default)
             currentModalData = JSON.parse(JSON.stringify(tableRef.originalData)); // Reseta dados do modal
             currentModalOptions = { ...resetOpts, title: tableRef.options.title }; // Reseta opções do modal (mantendo título atual)
             renderPreview(); // Atualiza a preview no modal
         });

         onClick('close-table-edit-btn', () => closeModal(overlay));
     }; // Fim openEditModal

     // Função de inicialização
    const init = () => {
        console.log("ResponseTable.init() iniciado...");
        const squares = document.querySelectorAll('.square[data-type="quadro_de_respostas"]');
        console.log(`Encontrados ${squares.length} squares para Quadros de Resposta.`);

        const savedTableConfigs = window.configRespostas || {}; // Pega configs salvas

        squares.forEach((square) => {
            const dataId = square.getAttribute('data-id');
            square.innerHTML = '<div class="loading-placeholder">Carregando quadro...</div>';

            if (!dataId) {
                console.error("Square com data-type='quadro_de_respostas' não possui data-id. Pulando.", square);
                square.innerHTML = '<p style="color: red;">Erro: ID do quadro ausente.</p>';
                return;
            }
            const dataItem = window.visualizacaoData?.[dataId];

            // Verifica se dataItem e dfRespostas existem
            if (!dataItem || typeof dataItem.dfRespostas === 'undefined') {
                console.error(`Dados para Quadro de Respostas ID ${dataId} não encontrados ou inválidos em window.visualizacaoData.`, dataItem);
                square.innerHTML = `<p style="color: red;">Erro: Dados para ${dataId} não encontrados.</p>`;
                return;
            }

            // Cria container e botão
            const containerId = `tableContainer_${dataId}`;
            const container = document.createElement('div');
            container.id = containerId;
            Object.assign(container.style, { width: "100%", height: "calc(100% - 35px)", overflow: "auto", position: "relative", padding: "5px", boxSizing: 'border-box'});
            const editBtn = document.createElement('button');
            Object.assign(editBtn, { className: 'edit-chart-btn', textContent: 'Editar Quadro' });

            square.innerHTML = '';
            square.append(container, editBtn);
            square.addEventListener('mouseenter', () => editBtn.style.display = 'block');
            square.addEventListener('mouseleave', () => editBtn.style.display = 'none');

            // *** LÓGICA DE DADOS E OPÇÕES INICIAIS (MODIFICADA) ***
            const defaultOpts = JSON.parse(JSON.stringify(defaults()));
            const savedOptsRaw = savedTableConfigs[dataId] ? JSON.parse(JSON.stringify(savedTableConfigs[dataId])) : {}; // Clona ou cria objeto vazio

            let initialData;
            // Verifica se há dados salvos (_currentData) válidos dentro das opções salvas
            if (savedOptsRaw && savedOptsRaw._currentData && typeof savedOptsRaw._currentData === 'object') {
                console.log(`Usando _currentData da configuração salva para a tabela ${dataId}.`);
                initialData = JSON.parse(JSON.stringify(savedOptsRaw._currentData)); // Usa os dados salvos
                // Remove _currentData do objeto de opções para não interferir na mesclagem de estilos
                delete savedOptsRaw._currentData;
            } else {
                console.log(`Nenhum _currentData válido na configuração salva para a tabela ${dataId}. Usando dados originais.`);
                initialData = JSON.parse(JSON.stringify(dataItem.dfRespostas)); // Usa os dados originais
            }

            // Pega os dados originais *separadamente* para a função de reset
            const originalDataForReset = JSON.parse(JSON.stringify(dataItem.dfRespostas));

            // Mescla as OPÇÕES DE ESTILO: Defaults <- Config Salva (sem _currentData) <- Título dos Dados
            const initialOptions = {
                 ...defaultOpts,           // Começa com defaults
                 ...savedOptsRaw,          // Mescla opções de estilo salvas
                 title: dataItem.title || savedOptsRaw.title || defaultOpts.title // Prioridade do título
            };
            // Log para debug
            console.log(`Configurações de estilo salvas encontradas para tabela ${dataId}:`, savedOptsRaw);
            console.log(`Opções iniciais para tabela ${dataId}:`, initialOptions);
            console.log(`Dados iniciais para tabela ${dataId} (salvos ou originais):`, initialData);

            // Armazena referência da tabela no objeto global window.charts
            const chartKey = `table_${dataId}`;
            window.charts[chartKey] = {
                 type: 'response-table',
                 containerId,
                 data: initialData, // Armazena os dados iniciais (salvos ou originais)
                 originalData: originalDataForReset, // Armazena os dados *originais* para reset
                 options: initialOptions, // Armazena opções mescladas
                 dataId: dataId
            };
            console.log(`Referência armazenada para ${chartKey}`, window.charts[chartKey]);

            // Plota a tabela inicial usando os dados e as opções determinadas
            plot(window.charts[chartKey].data, initialOptions, containerId, false); // false = não é preview do modal
        });
         console.log("ResponseTable.init() concluído.");
    }; // Fim init

    // Expõe funções públicas
    return { init, plot, openEditModal };

})(); // Fim IIFE