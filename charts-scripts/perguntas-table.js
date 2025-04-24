/* perguntas-table.js */
/* Lógica para a tabela de perguntas associada aos gráficos. Agora com edição. */

const PerguntasTable = (() => {

    // Configurações padrão *** MODIFICADO ***
    const defaultSettings = {
        headColor: "#b0c4de",
        cellColor: "#f0f8ff",
        borderColor: "#ffffff", // Alterado para cinza, branco sobre branco não é visível
        headFontSize: 12,
        cellFontSize: 11,
        borderSize: 2,
        headAlign: "center",
        cellAlign: "justify", // Default left para perguntas
        bgColor: "#ffffff", // Usado para o container, mantido
        headPadding: 6, // Altura/Padding Cabeçalho (px)
        cellPadding: 6, // Altura/Padding Células (px)
        grupoColWidthPercent: 30 // Largura (%) da coluna "Grupo"
    };
    window.defaultPerguntasTableSettings = defaultSettings;

    // Função auxiliar para criar célula (sem mudança)
    const createCell = (parentRow, text, styles, isHeader = false) => {
        const cell = parentRow.insertCell();
        Object.assign(cell.style, styles);
        cell.textContent = text ?? '';
        return cell;
    };

    // Função para renderizar a tabela de perguntas
    // *** MODIFICADO: Aplica padding e width ***
    const plot = (dfPerg, containerId, options = {}, dataId, isModalPreview = false) => {
        const container = document.getElementById(containerId);
        if (!container) { /* ... erro ... */ return; }
        if (!dfPerg || !dfPerg.data || !dfPerg.columns) { /* ... erro ... */ return; }

        container.innerHTML = "";
        // *** MODIFICADO: Pega novas opções com defaults ***
        const currentOptions = { ...defaultSettings, ...options };
        container.style.backgroundColor = currentOptions.bgColor; // Aplica ao container
        container.style.position = 'relative';

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.tableLayout = 'fixed'; // Importante para respeitar larguras de coluna
        table.style.fontSize = `${currentOptions.cellFontSize}px`;

        const thead = table.createTHead();
        const tbody = table.createTBody();
        const headerRow = thead.insertRow();

        // *** MODIFICADO: Usa padding das opções ***
        const baseCellStyle = {
            border: `${currentOptions.borderSize}px solid ${currentOptions.borderColor}`,
            overflow: 'hidden', // Ajuda com layout fixo
            wordBreak: 'break-word' // Quebra palavras longas
        };
        const headerCellStyle = {
            ...baseCellStyle,
            padding: `${currentOptions.headPadding}px`, // Usa headPadding
            backgroundColor: currentOptions.headColor,
            fontSize: `${currentOptions.headFontSize}px`,
            fontWeight: 'bold',
            textAlign: currentOptions.headAlign
        };
        const dataCellStyle = {
            ...baseCellStyle,
            padding: `${currentOptions.cellPadding}px`, // Usa cellPadding
            backgroundColor: currentOptions.cellColor,
            fontSize: `${currentOptions.cellFontSize}px`,
            textAlign: currentOptions.cellAlign,
            verticalAlign: 'top'
        };

        // Cria cabeçalho *** MODIFICADO: Aplica width ***
        dfPerg.columns.forEach((colName, colIndex) => {
            const cell = createCell(headerRow, colName, headerCellStyle, true);
            // Aplica largura à primeira coluna (Grupo)
            if (colIndex === 0) {
                cell.style.width = `${currentOptions.grupoColWidthPercent}%`;
            }
             // A segunda coluna (Pergunta) ocupará o restante automaticamente com table-layout: fixed
        });

        // Cria linhas de dados *** MODIFICADO: Aplica width ***
        dfPerg.data.forEach(rowData => {
            const row = tbody.insertRow();
            rowData.forEach((cellData, colIndex) => {
                const cell = createCell(row, cellData, dataCellStyle);
                 // Aplica largura à primeira coluna (Grupo) também nos dados
                if (colIndex === 0) {
                    cell.style.width = `${currentOptions.grupoColWidthPercent}%`;
                }
            });
        });

        container.appendChild(table);

        // --- Armazena referência e adiciona botão de edição (sem mudança aqui) ---
        if (dataId && !isModalPreview) {
            const chartKey = `perguntas_${dataId}`;
            window.charts = window.charts || {};
            window.charts[chartKey] = {
                type: 'perguntas-table', containerId, data: dfPerg,
                options: JSON.parse(JSON.stringify(currentOptions)),
                originalOptions: JSON.parse(JSON.stringify(currentOptions)),
                dataId: dataId
            };
            // console.log(`PerguntasTable: Referência armazenada para ${chartKey}`);
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Editar Tabela';
            editBtn.className = 'edit-perguntas-btn edit-table-style-btn';
            Object.assign(editBtn.style, { /* ... estilos do botão ... */ });
            container.appendChild(editBtn);
            // CSS controla hover
        }
    };

    // --- Funções de Edição (Implementadas) ---

    // *** MODIFICADO: Estrutura HTML do modal ***
    const buildModalHTML = settings => {
        const d = defaultSettings;
        const alignOpts = (sel, def) => buildOptions(['left', 'center', 'right', 'justify'], sel, def);

        return `
          <div class="graph-container" style="display: flex; align-items: flex-start; justify-content: center; min-height: 300px; padding: 10px; background-color: #f0f0f0;">
              <div id="modalPerguntasPreview" style="width: 95%; max-height: 595px; overflow-y: auto; overflow-x: hidden; background:${settings.bgColor ?? d.bgColor}; border: 1px solid #ccc; box-sizing: border-box;"></div>
          </div>
          <div class="settings-container">
            <h3>Editar Tabela de Perguntas</h3>
            <div class="basic-settings">
                ${buildInput('color', 'perg-head-color', settings.headColor ?? d.headColor, 'Cor Cabeçalho')}
                ${buildInput('color', 'perg-cell-color', settings.cellColor ?? d.cellColor, 'Cor Células')}
                ${buildInput('number', 'perg-head-font', settings.headFontSize ?? d.headFontSize, 'Tam. Fonte Cab.', { props: { min: "8" } })}
                ${buildInput('number', 'perg-cell-font', settings.cellFontSize ?? d.cellFontSize, 'Tam. Fonte Cel.', { props: { min: "8" } })}
                <button id="toggle-additional-perguntas-btn">Mais Configurações</button>
            </div>
            <div class="additional-perguntas-settings" style="display:none;">
                ${buildInput('number', 'perg-head-pad', settings.headPadding ?? d.headPadding, 'Altura Cabeçalho (px)', { props: { min: "0" } })}
                ${buildInput('number', 'perg-cell-pad', settings.cellPadding ?? d.cellPadding, 'Altura Células (px)', { props: { min: "0" } })}
                <div class="settings-group">
                    <label for="perg-grupo-width">Largura Coluna Grupo (%): <span id="perg-grupo-width-value">${settings.grupoColWidthPercent ?? d.grupoColWidthPercent}</span>%</label>
                    <input type="range" id="perg-grupo-width" min="10" max="70" step="1" value="${settings.grupoColWidthPercent ?? d.grupoColWidthPercent}">
                </div>
                ${buildInput('number', 'perg-border-size', settings.borderSize ?? d.borderSize, 'Tam. Borda (px)', { props: { min: "0" } })}
                ${buildInput('color', 'perg-border-color', settings.borderColor ?? d.borderColor, 'Cor Borda')}
                ${buildInput('select', 'perg-head-align', '', 'Alinh. Cab.', { optionHTML: alignOpts(settings.headAlign, d.headAlign) })}
                ${buildInput('select', 'perg-cell-align', '', 'Alinh. Cel.', { optionHTML: alignOpts(settings.cellAlign, d.cellAlign) })}
                <button id="toggle-additional-perguntas-btn-hide">Menos Configurações</button>
            </div>
            <div class="settings-buttons">
              <div class="btn-group"><button id="apply-perguntas-btn">Aplicar</button><select id="apply-perguntas-scope"><option value="this">Neste</option><option value="all">Em Todos</option></select></div>
              <div class="btn-group"><button id="reset-perguntas-btn">Voltar ao Padrão</button><select id="reset-perguntas-scope"><option value="this">Neste</option><option value="all">Em Todos</option></select></div>
              <button id="close-perguntas-edit-btn">Cancelar</button>
            </div>
          </div>
        `;
    };

    // *** MODIFICADO: Leitura dos novos valores do form ***
    const getFormValues = () => {
        const d = defaultSettings;
        return {
            headColor: getVal('perg-head-color') || d.headColor,
            cellColor: getVal('perg-cell-color') || d.cellColor,
            borderColor: getVal('perg-border-color') || d.borderColor,
            // bgColor: getVal('perg-bg-color') || d.bgColor, // Removido
            headFontSize: getIntVal('perg-head-font', d.headFontSize),
            cellFontSize: getIntVal('perg-cell-font', d.cellFontSize),
            borderSize: getIntVal('perg-border-size', d.borderSize),
            headAlign: getVal('perg-head-align') || d.headAlign,
            cellAlign: getVal('perg-cell-align') || d.cellAlign,
            // Novos valores
            headPadding: getIntVal('perg-head-pad', d.headPadding),
            cellPadding: getIntVal('perg-cell-pad', d.cellPadding),
            grupoColWidthPercent: getIntVal('perg-grupo-width', d.grupoColWidthPercent)
            // bgColor não é mais editável, mas ainda é lido de defaults/options para o container
        };
    };

    // Função para aplicar (sem mudança interna, usa o plot modificado)
    const applySettings = (instance, newSettings) => {
        if (!instance || !instance.containerId || !instance.data) { /*...*/ return; }
        instance.options = JSON.parse(JSON.stringify(newSettings));
        // Adiciona/preserva bgColor para o container
        instance.options.bgColor = instance.options.bgColor ?? defaultSettings.bgColor;
        plot(instance.data, instance.containerId, instance.options, instance.dataId, false);
    };

    // Função para resetar (sem mudança interna, usa o plot modificado)
    const resetSettings = (instance) => {
        const globalDefaults = window.defaultPerguntasTableSettings || {}; // Pega os defaults GLOBAIS
        if (!instance || !instance.containerId || !instance.data) {
            console.error("resetSettings (PerguntasTable): Instância inválida.", instance);
            return;
        }
        // Reseta para os defaults GLOBAIS
        instance.options = JSON.parse(JSON.stringify(globalDefaults));
        plot(instance.data, instance.containerId, instance.options, instance.dataId, false); // Re-renderiza tabela principal
    };

    // *** NOVA FUNÇÃO AUXILIAR: Atualiza os inputs do modal ***
    const updateModalForm = (settings) => {
        const d = defaultSettings; // Acesso aos defaults para fallback se necessário

        // Cores
        const headColorInput = getEl('perg-head-color');
        if (headColorInput) headColorInput.value = settings.headColor ?? d.headColor;
        const cellColorInput = getEl('perg-cell-color');
        if (cellColorInput) cellColorInput.value = settings.cellColor ?? d.cellColor;
        const borderColorInput = getEl('perg-border-color');
        if (borderColorInput) borderColorInput.value = settings.borderColor ?? d.borderColor;

        // Fontes
        const headFontInput = getEl('perg-head-font');
        if (headFontInput) headFontInput.value = settings.headFontSize ?? d.headFontSize;
        const cellFontInput = getEl('perg-cell-font');
        if (cellFontInput) cellFontInput.value = settings.cellFontSize ?? d.cellFontSize;

        // Tamanhos e Padding
        const headPadInput = getEl('perg-head-pad');
        if (headPadInput) headPadInput.value = settings.headPadding ?? d.headPadding;
        const cellPadInput = getEl('perg-cell-pad');
        if (cellPadInput) cellPadInput.value = settings.cellPadding ?? d.cellPadding;
        const borderSizeInput = getEl('perg-border-size');
        if (borderSizeInput) borderSizeInput.value = settings.borderSize ?? d.borderSize;

        // Largura Coluna (Slider e Span)
        const widthSlider = getEl('perg-grupo-width');
        const widthValueSpan = getEl('perg-grupo-width-value');
        const widthPercent = settings.grupoColWidthPercent ?? d.grupoColWidthPercent;
        if (widthSlider) widthSlider.value = widthPercent;
        if (widthValueSpan) widthValueSpan.textContent = widthPercent;

        // Alinhamentos (Selects)
        const headAlignSelect = getEl('perg-head-align');
        if (headAlignSelect) headAlignSelect.value = settings.headAlign ?? d.headAlign;
        const cellAlignSelect = getEl('perg-cell-align');
        if (cellAlignSelect) cellAlignSelect.value = settings.cellAlign ?? d.cellAlign;

        console.log("Modal form updated with settings:", settings); // Log para debug
    };


    // *** MODIFICADO: Adiciona listeners para Mais/Menos e Slider ***
    const openEditModal = (dataId) => {
        const chartKey = `perguntas_${dataId}`;
        const instance = window.charts?.[chartKey];
    
        // Modificado: Não precisa mais verificar instance.originalOptions
        if (!instance || !instance.data || !instance.options) {
            console.error(`PerguntasTable.openEditModal: Instância ${chartKey} não encontrada ou incompleta (sem data/options).`);
            alert(`Erro: Não foi possível encontrar configurações para editar a tabela de perguntas ${dataId}.`);
            return;
        }
    
        // Mantém cópia local das opções para edição isolada no modal
        let currentModalOptions = JSON.parse(JSON.stringify(instance.options));
    
        const overlay = createOverlay(); // Função de shared-utils.js
        const modal = document.createElement('div');
        // Adiciona classe para estilização opcional de modais menores
        modal.className = 'edit-modal modal-component small-modal';
        // Constrói o HTML do modal usando as opções atuais copiadas
        modal.innerHTML = buildModalHTML(currentModalOptions);
        overlay.appendChild(modal);
    
        // ID do container da preview dentro do modal
        const previewContainerId = "modalPerguntasPreview";
    
        // Função para renderizar a tabela de preview dentro do modal
        const renderPreview = () => {
            // Garante que a cor de fundo (do container) seja aplicada na preview
            // Usa as opções *atuais do modal* (currentModalOptions)
            const previewOptions = {...currentModalOptions, bgColor: currentModalOptions.bgColor ?? defaultSettings.bgColor};
            // Chama plot com isModalPreview = true
            plot(instance.data, previewContainerId, previewOptions, dataId, true);
        };
    
        // Renderiza a preview inicial assim que o modal é criado
        renderPreview();
    
        // --- Listeners para inputs e controles do modal ---
        const settingsContainer = modal.querySelector('.settings-container');
    
        // Listener genérico para inputs de cor, número e select
        settingsContainer.querySelectorAll('input[type="color"], input[type="number"], select').forEach(el => {
             // 'input' para cores e números (atualiza enquanto digita/arrasta), 'change' para select
             const eventType = ['color', 'number'].includes(el.type) ? 'input' : 'change';
             el.addEventListener(eventType, () => {
                 // Atualiza o objeto de opções do modal lendo TODOS os valores do form
                 currentModalOptions = {...currentModalOptions, ...getFormValues()};
                 // Re-renderiza a preview com as opções atualizadas
                 renderPreview();
             });
        });
    
        // Listener específico para o slider de largura e seu display de valor
        const widthSlider = getEl('perg-grupo-width'); // getEl de shared-utils.js
        const widthValueSpan = getEl('perg-grupo-width-value');
        if (widthSlider && widthValueSpan) {
            widthSlider.addEventListener('input', () => {
                 const newValue = widthSlider.value;
                 widthValueSpan.textContent = newValue; // Atualiza o span que mostra o valor
                 // Atualiza o objeto de opções do modal lendo TODOS os valores do form
                 currentModalOptions = {...currentModalOptions, ...getFormValues()};
                 // Re-renderiza a preview
                 renderPreview();
            });
        }
    
        // Listeners para botões Mais/Menos Configurações
        onClick('toggle-additional-perguntas-btn', () => { // onClick de shared-utils.js
            getEl('toggle-additional-perguntas-btn').style.display = 'none';
            modal.querySelector('.additional-perguntas-settings').style.display = 'block'; // ou 'grid' se usar grid
        });
        onClick('toggle-additional-perguntas-btn-hide', () => {
            getEl('toggle-additional-perguntas-btn').style.display = 'inline-block'; // ou 'block'
            modal.querySelector('.additional-perguntas-settings').style.display = 'none';
        });
    
        // --- Listeners para botões de Ação (Aplicar/Resetar/Cancelar) ---
    
        // Botão Aplicar
        onClick('apply-perguntas-btn', () => {
            // Pega os valores FINAIS do formulário no momento do clique
            const finalSettings = getFormValues();
            // Pega o escopo selecionado (Neste / Em Todos)
            const scope = getVal('apply-perguntas-scope'); // getVal de shared-utils.js
            // Define a ação a ser aplicada: chamar applySettings na instância
            const applyAction = (inst) => applySettings(inst, finalSettings);
    
            // Usa a função applyScopedAction de shared-utils.js
            applyScopedAction('perguntas_', instance, scope, applyAction);
            closeModal(overlay); // closeModal de shared-utils.js
        });
    
        // Botão Resetar (Padrão) - Lógica alinhada com BarChart
        onClick('reset-perguntas-btn', () => {
            const scope = getVal('reset-perguntas-scope');
            // Pega os defaults GLOBAIS definidos no topo do script
            const globalDefaults = window.defaultPerguntasTableSettings || {};
    
            // 1. Aplica a função `resetSettings` (que usa defaults globais) às instâncias reais
            //    `resetSettings` só precisa da instância como argumento.
            //    `applyScopedAction` chamará `resetSettings(instância_alvo)`
            applyScopedAction('perguntas_', instance, scope, resetSettings); // Passa a função resetSettings diretamente
    
            // --- Atualiza o estado do MODAL para refletir os defaults GLOBAIS ---
    
            // Atualiza a variável local do modal com os defaults globais
            // Faz uma cópia profunda para evitar referências cruzadas
            currentModalOptions = JSON.parse(JSON.stringify(globalDefaults));
    
            // ATUALIZA OS INPUTS DO FORMULÁRIO no modal para refletir os defaults globais
            // Usando a função auxiliar criada anteriormente
            updateModalForm(currentModalOptions);
    
            // Atualiza a PREVIEW dentro do modal com os defaults globais
            renderPreview();
        });
    
        // Botão Cancelar
        onClick('close-perguntas-edit-btn', () => {
            closeModal(overlay); // closeModal de shared-utils.js
        });
    }; // Fim de openEditModal

    // Expõe publicamente
    return { plot, openEditModal };

})(); // Fim do IIFE