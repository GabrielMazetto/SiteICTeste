// ------------------------ Variáveis Globais e Configurações Iniciais ------------------------ //

let fileErrors = { "file-upload-1": [] }; // Armazena erros de validação por ID de input
let currentFileUploadId = ""; // ID do input de arquivo sendo editado no modal
let tableDataMap = {};          // Armazena dados ATUAIS das tabelas -> { "file-upload-1": [ [...], [...] ], ... }
let originalTableDataMap = {}; // Armazena dados ORIGINAIS (para cancelar) -> { "file-upload-1": [ [...], [...] ], ... }
let fileNameMap = {};          // Mapeia fileUploadId para nome do arquivo (real ou renomeado) -> { "file-upload-1": "consulta.xlsx", ... }
let fileExtensionMap = {};     // Mapeia fileUploadId para extensão (ex: ".xlsx") -> { "file-upload-1": ".xlsx", ... }
let loadedChartConfigs = null;  // Armazena as configurações carregadas do arquivo JSON completo
let schoolInfoData = null; // Para guardar { name, city, state, responsible }
let responseIndex = 3; // Índice inicial para os próximos arquivos de resposta (começa em 3 porque 1=Consulta, 2=Respostas Inicial)

// HTML padrão para o rodapé do modal de edição de tabela (atualizado com novas classes)
const defaultModalFooterHTML = `
    <button class="btn btn-secondary" onclick="cancelChanges()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveChanges()">Salvar Alterações</button>
`;

// ------------------------ Funções Auxiliares de UI ------------------------ //

/**
 * Atualiza o nome do arquivo exibido no label e define o status como 'loading'.
 * @param {string} fileUploadId - ID do input de arquivo.
 * @param {string|null} fileName - O nome do arquivo ou null para limpar.
 */
function displayFileInfo(fileUploadId, fileName) {
    const wrapperIdSuffix = fileUploadId.startsWith('file-upload-complete') ? 'complete' : fileUploadId.split('-').pop();
    const wrapper = document.getElementById(`wrapper-${wrapperIdSuffix}`);
    if (!wrapper) {
        console.error(`Wrapper não encontrado para ${fileUploadId}`);
        return;
    }

    const fileNameSpan = wrapper.querySelector('.file-name');
    if (fileNameSpan) {
        const defaultText = fileUploadId === 'file-upload-complete' ? 'Nenhum arquivo selecionado (.json)' : 'Nenhum arquivo selecionado';
        fileNameSpan.textContent = fileName || defaultText;
        fileNameSpan.title = fileName || '';
    }

    const statusId = wrapper.querySelector('.upload-status')?.id;
    if (statusId) {
        const statusSpan = document.getElementById(statusId);
        if (statusSpan) {
            if (fileName) {
                statusSpan.className = 'upload-status loading';
                statusSpan.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                statusSpan.title = 'Processando...';
            } else {
                statusSpan.className = 'upload-status';
                statusSpan.innerHTML = '';
                statusSpan.title = '';
            }
        }
    }
}

/**
 * Atualiza o ícone de status (sucesso, erro) após o processamento.
 * @param {string} fileUploadId - ID do input de arquivo associado.
 * @param {string} statusId - ID do elemento <span> onde o status será exibido.
 */
const updateStatusIcon = (fileUploadId, statusId) => {
    const statusSpan = document.getElementById(statusId);
    if (!statusSpan) return;

    const hasErrors = fileErrors[fileUploadId]?.length > 0;
    const hasData = !!tableDataMap[fileUploadId];

    // Limpa classes se não estiver loading
    if (!statusSpan.classList.contains('loading')) {
        statusSpan.className = 'upload-status';
        statusSpan.innerHTML = '';
    } else {
        statusSpan.classList.remove('loading'); // Remove loading após processar
        statusSpan.innerHTML = '';
    }

    if (hasErrors) {
        statusSpan.classList.add("error");
        statusSpan.innerHTML = '<i class="fas fa-times-circle"></i>';
        statusSpan.title = fileErrors[fileUploadId].join('\n');
    } else if (hasData || (fileUploadId === 'file-upload-complete' && !hasErrors)) {
        statusSpan.classList.add("success");
        statusSpan.innerHTML = '<i class="fas fa-check-circle"></i>';
        statusSpan.title = 'Arquivo válido';
    } else {
        statusSpan.className = 'upload-status';
        statusSpan.innerHTML = '';
        statusSpan.title = '';
    }
};


/** Abre o modal com animação */
function openModal() {
    const modal = document.getElementById("modal");
    const overlay = document.getElementById("modal-overlay");
    if(!modal || !overlay) return;

    overlay.style.display = "block";
    modal.style.display = "flex";
    void modal.offsetWidth;
    void overlay.offsetWidth;

    overlay.classList.add("show");
    modal.classList.add("show");
}

/** Fecha o modal com animação */
function closeModal() {
    const modal = document.getElementById("modal");
    const overlay = document.getElementById("modal-overlay");
     if(!modal || !overlay) return;

    modal.classList.remove("show");
    overlay.classList.remove("show");

    setTimeout(() => {
         modal.style.display = "none";
         overlay.style.display = "none";
         const modalFooter = document.getElementById("modal-footer-content");
         if (modalFooter) modalFooter.innerHTML = defaultModalFooterHTML; // Reset footer
         currentFileUploadId = "";
    }, 300);
}

// ------------------------ Processamento e Validação de Arquivos ------------------------ //

function validarArquivo(event, extensoesValidas, statusId) {
    const fileInput = event.target;
    const file = fileInput.files[0];
    const fileUploadId = fileInput.id;
    fileErrors[fileUploadId] = [];

    displayFileInfo(fileUploadId, file ? file.name : null);

    if (!file) {
        delete tableDataMap[fileUploadId];
        delete originalTableDataMap[fileUploadId];
        delete fileNameMap[fileUploadId];
        delete fileExtensionMap[fileUploadId];
        updateStatusIcon(fileUploadId, statusId); // Limpa o status visual
        console.log(`Seleção cancelada para ${fileUploadId}`);
        return;
    }

    if (fileUploadId === "file-upload-complete") {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (fileExtension === "json") {
            processCompleteJson(file, fileUploadId, statusId);
        } else {
            alert(`Erro: O arquivo completo deve ser do tipo .json!`);
            fileInput.value = "";
            displayFileInfo(fileUploadId, null);
            fileErrors[fileUploadId] = ["Tipo de arquivo inválido (esperado .json)"];
            updateStatusIcon(fileUploadId, statusId);
        }
        return;
    }

    const fileName = file.name;
    const fileExtension = fileName.split('.').pop().toLowerCase();

    if (extensoesValidas.includes(fileExtension)) {
        const wrapperIdSuffix = fileUploadId.split('-').pop();
        const wrapper = document.getElementById(`wrapper-${wrapperIdSuffix}`);
        const renameInput = wrapper?.querySelector(".rename-input");
        let currentName = fileName;
        if (renameInput && renameInput.value?.trim()) {
            currentName = renameInput.value.trim() + "." + fileExtension;
        } else if (fileUploadId === 'file-upload-1') {
             currentName = "TabelaConsulta." + fileExtension;
        }
        fileNameMap[fileUploadId] = currentName;
        fileExtensionMap[fileUploadId] = "." + fileExtension;

        openTableViewer(fileUploadId, parseInt(wrapperIdSuffix) - 1);

    } else {
        alert(`Erro: O arquivo deve ser ${extensoesValidas.join(" ou ")}!`);
        fileInput.value = "";
        displayFileInfo(fileUploadId, null);
        fileErrors[fileUploadId].push("Extensão inválida");
        updateStatusIcon(fileUploadId, statusId);
    }
}

/** Processa o arquivo JSON completo */
function processCompleteJson(file, fileUploadId, statusId) {
    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const jsonData = JSON.parse(e.target.result);

            // Validação Mínima da Estrutura
            if (!jsonData || !jsonData.originalData || !jsonData.chartConfigs ||
                !jsonData.originalData.TabelaConsulta || !jsonData.originalData.DemaisTabelas) {
                throw new Error("Estrutura do arquivo JSON inválida ou dados essenciais ausentes.");
            }

            const { TabelaConsulta, DemaisTabelas } = jsonData.originalData;
            const loadedSchoolInfo = jsonData.schoolInfo;
            const configs = jsonData.chartConfigs;

            console.log("Processando JSON: TabelaConsulta e", Object.keys(DemaisTabelas).length, "DemaisTabelas.");

            // --- LIMPEZA GERAL antes de carregar ---
            console.log("Limpando dados e UI antes de carregar JSON...");
            tableDataMap = {};
            originalTableDataMap = {};
            fileNameMap = {};
            fileErrors = { "file-upload-1": [] };
            loadedChartConfigs = null;
            localStorage.removeItem("schoolInfo");
            schoolInfoData = null;
            // Limpa status visuais (exceto o do JSON) e nomes de arquivos
             document.querySelectorAll('.upload-status:not(#status-complete)').forEach(span => {
                 span.innerHTML = ''; span.className = 'upload-status'; span.title = '';
            });
             document.querySelectorAll('.file-input-wrapper:not(#wrapper-complete) .file-name').forEach(span => {
                 span.textContent = 'Nenhum arquivo selecionado'; span.title = '';
             });
             // Resetar inputs de renomear para valores padrão ou vazios
             document.querySelectorAll('.rename-input').forEach(inp => {
                 const parentWrapper = inp.closest('.file-input-wrapper');
                 if (parentWrapper && parentWrapper.id === 'wrapper-2') {
                     inp.value = 'Estudantes'; // Nome padrão para o primeiro de resposta
                 } else {
                     inp.value = ''; // Limpa outros
                 }
             });
            // Limpa inputs de resposta adicionados dinamicamente
            document.getElementById('responses-container').innerHTML = '';
            responseIndex = 3; // Reset response index

            // --- Carrega Tabela de Consulta ---
            if (TabelaConsulta && Array.isArray(TabelaConsulta) && TabelaConsulta.length > 0) {
                const consultaId = "file-upload-1";
                const consultaStatusId = "status-1";
                console.log("Processando TabelaConsulta do JSON...");
                const cleanedConsulta = removeEmptyColumns(removeEmptyRows(TabelaConsulta));
                tableDataMap[consultaId] = JSON.parse(JSON.stringify(cleanedConsulta));
                originalTableDataMap[consultaId] = JSON.parse(JSON.stringify(cleanedConsulta));
                fileNameMap[consultaId] = "TabelaConsulta (do JSON)";
                fileExtensionMap[consultaId] = ""; // Sem extensão real
                fileErrors[consultaId] = [];
                displayFileInfo(consultaId, fileNameMap[consultaId]); // Atualiza nome na UI
                validateNoDoGrafico(consultaId, true); // Valida SEM alert
                updateStatusIcon(consultaId, consultaStatusId); // Atualiza status final
            } else {
                throw new Error("TabelaConsulta ausente ou vazia no JSON.");
            }

            // --- Carrega Demais Tabelas (Respostas) ---
            let currentResponseInputIndex = 2; // Começa do 2 (o primeiro é 'file-upload-2')
            for (const nomeOriginalArquivo in DemaisTabelas) {
                if (Object.hasOwnProperty.call(DemaisTabelas, nomeOriginalArquivo)) {
                    const data = DemaisTabelas[nomeOriginalArquivo];
                     console.log(`Processando ${nomeOriginalArquivo} (Índice UI: ${currentResponseInputIndex})...`);
                    if (data && Array.isArray(data) && data.length > 0) {
                        const responseId = `file-upload-${currentResponseInputIndex}`;
                        const responseStatusId = `status-${currentResponseInputIndex}`;
                        const wrapperId = `wrapper-${currentResponseInputIndex}`;

                        // Encontra ou cria o input/wrapper dinamicamente
                        let wrapper = document.getElementById(wrapperId);
                        if (!wrapper && currentResponseInputIndex > 2) { // Cria se não for o primeiro e não existir
                            console.log(`Wrapper ${wrapperId} não encontrado, criando dinamicamente...`);
                            document.getElementById("add-response-btn").click(); // Simula clique para criar
                            wrapper = document.getElementById(wrapperId); // Tenta encontrar de novo
                        } else if (!wrapper && currentResponseInputIndex === 2) {
                            wrapper = document.getElementById('wrapper-2'); // Pega o wrapper inicial
                        }

                        if (!wrapper) {
                            console.error(`Falha ao encontrar/criar UI para ${responseId}. Pulando ${nomeOriginalArquivo}.`);
                            fileErrors[responseId] = ["Falha na interface"];
                            continue; // Pula para o próximo arquivo no JSON
                        }

                        // Limpa e armazena dados
                        const cleanedData = removeEmptyColumns(removeEmptyRows(data));
                        tableDataMap[responseId] = JSON.parse(JSON.stringify(cleanedData));
                        originalTableDataMap[responseId] = JSON.parse(JSON.stringify(cleanedData));
                        const baseName = nomeOriginalArquivo.replace(/\.(xlsx?|csv)$/i, "");
                        const extension = nomeOriginalArquivo.substring(nomeOriginalArquivo.lastIndexOf('.')) || "";
                        fileNameMap[responseId] = nomeOriginalArquivo;
                        fileExtensionMap[responseId] = extension;
                        fileErrors[responseId] = [];

                        // Atualiza UI (nome no label, nome no input de renomear, status)
                        displayFileInfo(responseId, nomeOriginalArquivo);
                        const renameInput = wrapper.querySelector(".rename-input");
                        if (renameInput) {
                            renameInput.value = baseName;
                             console.log(`Set rename input for ${responseId} to: ${baseName}`);
                        } else {
                             console.warn(`Rename input not found for ${responseId}`);
                        }
                        updateStatusIcon(responseId, responseStatusId);

                        currentResponseInputIndex++; // Incrementa para o próximo ID
                    } else {
                         console.warn(`Dados inválidos ou vazios para ${nomeOriginalArquivo} no JSON. Pulando.`);
                    }
                }
            }

            // --- Armazena Configurações ---
            loadedChartConfigs = configs || {};
            console.log("Configurações de gráfico carregadas do JSON:", loadedChartConfigs);

            // --- Carrega e Preenche Informações da Escola ---
            if (loadedSchoolInfo && typeof loadedSchoolInfo === 'object') {
                 console.log("Carregando informações da escola do JSON:", loadedSchoolInfo);
                 schoolInfoData = {
                     name: loadedSchoolInfo.name || '', city: loadedSchoolInfo.city || '',
                     state: loadedSchoolInfo.state || '', responsible: loadedSchoolInfo.responsible || ''
                 };
                 try { localStorage.setItem("schoolInfo", JSON.stringify(schoolInfoData)); } catch (e) { console.error("Erro localStorage:", e); }
                 // Preenche campos
                 document.getElementById('school-name').value = schoolInfoData.name;
                 document.getElementById('school-city').value = schoolInfoData.city;
                 document.getElementById('school-state').value = schoolInfoData.state;
                 document.getElementById('school-responsible').value = schoolInfoData.responsible;
            } else {
                 console.log("Nenhuma informação da escola encontrada no JSON.");
            }

             // --- FINALIZAÇÃO ANTES DO ALERT ---

             console.log('Re-attaching view button listeners after JSON processing...');
             // Re-anexa listeners para os botões que foram populados pelo JSON

             // Tabela de Consulta (Sempre existe)
             attachViewButtonListener('view-1', 'file-upload-1', 0);

             // Arquivos de Resposta populados pelo JSON
             // Repercorre os índices que foram usados para popular
             let finalResponseInputIndexAfterLoad = 2; // Índice inicial (precisa corresponder ao loop acima)
             for (const nomeOriginalArquivo in DemaisTabelas) {
                  if (Object.hasOwnProperty.call(DemaisTabelas, nomeOriginalArquivo)) {
                     const data = DemaisTabelas[nomeOriginalArquivo];
                      if (data && Array.isArray(data) && data.length > 0) {
                          const responseId = `file-upload-${finalResponseInputIndexAfterLoad}`;
                          const viewBtnId = `view-${finalResponseInputIndexAfterLoad}`;
                          // Só tenta re-anexar se o botão realmente existe no DOM
                          if (document.getElementById(viewBtnId)) {
                              console.log(`Re-attaching listener for ${viewBtnId}`);
                             attachViewButtonListener(viewBtnId, responseId, finalResponseInputIndexAfterLoad - 1);
                          } else {
                              console.warn(`View button ${viewBtnId} not found for re-attaching listener.`);
                          }
                          finalResponseInputIndexAfterLoad++;
                     }
                  }
             }

             // Garante que os botões não estejam desabilitados se o processo foi um sucesso
             console.log('Ensuring view buttons are enabled after successful JSON load.');
             document.querySelectorAll('.file-input-wrapper .btn-view').forEach(btn => btn.disabled = false);

            // --- Alerta de Sucesso ---
            fileErrors[fileUploadId] = []; // Limpa erro do próprio JSON
            updateStatusIcon(fileUploadId, statusId); // Marca upload do JSON como sucesso
            alert("Arquivo completo carregado e processado com sucesso!"); // Mantido

            // Desabilita inputs de ARQUIVO e RENAME, mas DEIXA os botões VIEW habilitados
            document.querySelectorAll('input[type="file"]:not(#file-upload-complete)').forEach(inp => inp.disabled = true);
            document.querySelectorAll('.file-input-wrapper:not(#wrapper-complete) label').forEach(lbl => lbl.style.cursor = 'not-allowed');
            document.querySelectorAll('.file-input-wrapper:not(#wrapper-complete) .rename-input').forEach(inp => inp.disabled = true);
            document.getElementById("add-response-btn").disabled = true;


        } catch (error) { // Bloco CATCH
            console.error("Erro ao processar o arquivo JSON completo:", error);
            alert(`Erro ao processar JSON: ${error.message}`);
            fileErrors[fileUploadId] = ["Erro ao processar JSON", error.message];
            updateStatusIcon(fileUploadId, statusId);
            // Limpa tudo e REABILITA TUDO em caso de erro
            tableDataMap = {}; originalTableDataMap = {}; fileNameMap = {};
            fileErrors = { "file-upload-1": [] }; loadedChartConfigs = null;
            schoolInfoData = null; localStorage.removeItem("schoolInfo");
             console.log("Re-enabling inputs AND BUTTONS after JSON processing error.");
             document.querySelectorAll('input[type="file"]').forEach(inp => inp.disabled = false);
             document.querySelectorAll('.file-input-wrapper label').forEach(lbl => lbl.style.cursor = 'pointer');
             document.querySelectorAll('.rename-input').forEach(inp => inp.disabled = false);
             document.querySelectorAll('.btn-view').forEach(btn => btn.disabled = false);
             document.getElementById("add-response-btn").disabled = false;

        } finally {
             // Limpa o input do arquivo completo e reseta UI
             const fileInputComplete = document.getElementById(fileUploadId);
             if(fileInputComplete) fileInputComplete.value = "";
             displayFileInfo(fileUploadId, null);
        }
    };
    reader.readAsText(file); // Lê o arquivo JSON como texto
}

// ------------------------ Adicionando Arquivos de Respostas Dinamicamente ------------------------ //

document.getElementById("add-response-btn").addEventListener("click", () => {
    const localIndex = responseIndex;
    const fileUploadId = `file-upload-${localIndex}`;
    const wrapperId = `wrapper-${localIndex}`;
    const statusId = `status-${localIndex}`;
    const viewBtnId = `view-${localIndex}`;

    const responsesContainer = document.getElementById('responses-container');
    const wrapper = document.createElement('div');
    wrapper.className = 'file-input-wrapper response-wrapper';
    wrapper.id = wrapperId;
    wrapper.style.marginTop = '10px';
    wrapper.innerHTML = `
        <input id="${fileUploadId}" type="file" accept=".csv, .xlsx" data-target-wrapper="${wrapperId}" data-status-id="${statusId}" style="display: none;">
        <label for="${fileUploadId}" class="file-input-label">
            <i class="fas fa-file-alt"></i>
            <span class="file-name">Nenhum arquivo selecionado</span>
        </label>
        <input type="text" class="rename-input" placeholder="Nome do Grupo (ex: Familiares)">
        <div class="file-actions">
            <span class="upload-status" id="${statusId}"></span>
            <button class="btn-icon btn-view" id="${viewBtnId}" title="Visualizar/Editar Tabela"><i class="fas fa-eye"></i></button>
            <button class="btn-icon btn-remove-response" title="Remover este arquivo"><i class="fas fa-times"></i></button>
        </div>
    `;
    responsesContainer.appendChild(wrapper);

    const newFileInput = document.getElementById(fileUploadId);
    newFileInput.addEventListener("change", (event) => validarArquivo(event, ["csv", "xlsx"], statusId));

    attachViewButtonListener(viewBtnId, fileUploadId, localIndex - 1);

    wrapper.querySelector('.btn-remove-response').addEventListener('click', () => {
        if (confirm(`Remover o arquivo de resposta "${fileNameMap[fileUploadId] || `Grupo ${localIndex-1}`}"?`)) {
            delete tableDataMap[fileUploadId]; delete originalTableDataMap[fileUploadId];
            delete fileNameMap[fileUploadId]; delete fileExtensionMap[fileUploadId];
            delete fileErrors[fileUploadId];
            wrapper.remove();
        }
    });

    const renameInput = wrapper.querySelector('.rename-input');
    renameInput.addEventListener("input", () => {
        const baseName = renameInput.value.trim();
        const extension = fileExtensionMap[fileUploadId] || "";
        const groupNameFallback = `grupo_${localIndex - 1}`;
        fileNameMap[fileUploadId] = baseName ? `${baseName}${extension}` : `${groupNameFallback}${extension}`;
        if (currentFileUploadId === fileUploadId) {
            document.getElementById("modal-title").textContent = fileNameMap[fileUploadId] || 'Visualizar Tabela';
        }
    });
    fileNameMap[fileUploadId] = ""; fileExtensionMap[fileUploadId] = "";

    responseIndex++;
});

// ------------------------ Visualização e Edição de Tabela ------------------------ //

// Função para anexar listener (sem alterações, mas garantiremos que seja chamada)
function attachViewButtonListener(buttonId, fileUploadId, index) {
    const viewButton = document.getElementById(buttonId);
    if (viewButton) {
        console.log(`Attaching listener to view button: #${buttonId}`); // Log
        // Remove listener antigo para evitar duplicação, se houver
        viewButton.replaceWith(viewButton.cloneNode(true));
        const newViewButton = document.getElementById(buttonId); // Pega a nova referência
        if(!newViewButton) return; // Segurança

        newViewButton.addEventListener('click', (e) => {
            console.log(`View button #${buttonId} clicked for ${fileUploadId}`); // Log de clique
            e.stopPropagation();
            const fileInput = document.getElementById(fileUploadId);
            // Log para verificar dados antes de abrir
            console.log(`Checking data for ${fileUploadId}:`, tableDataMap[fileUploadId] ? 'Data Found' : 'No Data in map', `|| File selected: ${(fileInput && fileInput.files.length > 0)}`);
            if (tableDataMap[fileUploadId] || (fileInput && fileInput.files.length > 0)) {
                 openTableViewer(fileUploadId, index);
            } else {
                 alert('Nenhum arquivo carregado ou selecionado para visualizar.');
            }
        });
    } else {
         console.error(`View button #${buttonId} not found during listener attachment!`); // Log de erro
    }
}

/**
 * Abre o modal para visualizar/editar uma tabela. Lê o arquivo se necessário.
 * @param {string} fileUploadId - ID do input de arquivo.
 * @param {number} index - Índice numérico do input (0-based).
 */
function openTableViewer(fileUploadId, index) {
    currentFileUploadId = fileUploadId; // Define qual arquivo está sendo editado globalmente

    const fileInput = document.getElementById(fileUploadId);
    const file = fileInput?.files?.[0]; // Pega o arquivo se foi um *novo* upload

    // Define o título do Modal baseado no nome atual do arquivo
    const modalTitle = document.getElementById("modal-title");
    modalTitle.textContent = fileNameMap[fileUploadId] || `Tabela ${index + 1}`;

    // Configura o rodapé do modal (botões Salvar/Cancelar padrão)
    const modalFooter = document.getElementById("modal-footer-content");
    modalFooter.innerHTML = defaultModalFooterHTML;

    // Caso 1: Dados já existem no mapa (carregados antes ou via JSON), e não há novo arquivo
    if (!file && tableDataMap[fileUploadId]) {
        console.log(`Renderizando dados existentes para ${fileUploadId}`);
        renderTable(fileUploadId); // Renderiza os dados do tableDataMap
        if (fileUploadId === "file-upload-1") {
            // *** ALTERAÇÃO AQUI: false para mostrar alert imediatamente se houver erros ***
            setTimeout(() => validateNoDoGrafico(fileUploadId, false), 100);
        }
        openModal();
        return;
    }

    // Caso 2: Há um novo arquivo selecionado no input
    if (file) {
        console.log(`Lendo novo arquivo para ${fileUploadId}: ${file.name}`);
        // O nome e status já foram atualizados por displayFileInfo chamado no 'change'

        const reader = new FileReader();
        reader.onload = (e) => {
            const fileContent = e.target.result;
            console.log(`Arquivo ${file.name} lido.`);
            try {
                const fileExtension = file.name.split('.').pop().toLowerCase();
                if (fileExtension === "csv") {
                    parseCSV(fileContent, fileUploadId);
                } else if (fileExtension === "xlsx") {
                    const workbook = XLSX.read(fileContent, { type: "binary" });
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }); // Preserva vazios
                    const cleanedData = removeEmptyColumns(removeEmptyRows(jsonData));
                    tableDataMap[fileUploadId] = JSON.parse(JSON.stringify(cleanedData));
                    originalTableDataMap[fileUploadId] = JSON.parse(JSON.stringify(cleanedData));
                } else {
                     throw new Error("Tipo de arquivo não suportado para visualização."); // Segurança
                }

                renderTable(fileUploadId); // Renderiza a tabela
                if (fileUploadId === "file-upload-1") {
                    // *** ALTERAÇÃO AQUI: false para mostrar alert imediatamente se houver erros ***
                    setTimeout(() => validateNoDoGrafico(fileUploadId, false), 100);
                }

                 // Atualiza o status GERAL do arquivo para sucesso ou erro após parse/validação
                 const statusIdSuffix = fileUploadId.startsWith('file-upload-complete') ? 'complete' : fileUploadId.split('-').pop();
                 updateStatusIcon(fileUploadId, `status-${statusIdSuffix}`);
                 openModal(); // Abre o modal

                 // Limpa o input file APÓS sucesso para permitir novo upload do mesmo arquivo se necessário
                 if (fileInput) fileInput.value = "";

            } catch (error) { // Captura erros do parseCSV ou XLSX
                console.error(`Erro ao processar ${file.name}:`, error);
                alert(`Erro ao processar o arquivo ${file.name}. Verifique o formato e conteúdo.\nDetalhes: ${error.message}`); // Alerta específico
                fileErrors[fileUploadId].push("Erro no processamento", error.message);
                const statusIdSuffix = fileUploadId.startsWith('file-upload-complete') ? 'complete' : fileUploadId.split('-').pop();
                updateStatusIcon(fileUploadId, `status-${statusIdSuffix}`);
                delete tableDataMap[fileUploadId]; delete originalTableDataMap[fileUploadId];
                 if (fileInput) fileInput.value = ""; // Limpa input mesmo em erro de processamento
                 displayFileInfo(fileUploadId, null); // Limpa UI
            }
        };
        reader.onerror = (e) => { // Erro na leitura do arquivo em si
             console.error("Erro de leitura do arquivo:", e);
             alert("Erro ao ler o arquivo selecionado."); // Alerta específico
             fileErrors[fileUploadId].push("Erro de leitura");
             const statusIdSuffix = fileUploadId.startsWith('file-upload-complete') ? 'complete' : fileUploadId.split('-').pop();
             updateStatusIcon(fileUploadId, `status-${statusIdSuffix}`);
             if (fileInput) fileInput.value = ""; // Limpa input em caso de erro de leitura
             displayFileInfo(fileUploadId, null); // Limpa UI
        };

        // Inicia a leitura
        if (file.name.endsWith(".csv")) reader.readAsText(file);
        else reader.readAsBinaryString(file); // Para XLSX

    } else {
        // Caso 3: Não há arquivo novo E não há dados no mapa (primeira vez ou erro anterior)
        alert("Nenhum arquivo selecionado ou dados carregados para visualizar.");
        console.warn(`Tentativa de abrir visualizador para ${fileUploadId} sem arquivo ou dados.`);
         // Garante que o status não fique como loading indefinidamente
         const statusIdSuffix = fileUploadId.startsWith('file-upload-complete') ? 'complete' : fileUploadId.split('-').pop();
         updateStatusIcon(fileUploadId, `status-${statusIdSuffix}`);
    }
}

const parseCSV = (csv, fileUploadId) => {
    const firstLine = csv.split('\n')[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const delimiter = semicolonCount > commaCount ? ';' : ',';
    let data;
    if (typeof Papa !== 'undefined') {
        const result = Papa.parse(csv, { skipEmptyLines: true, delimiter: delimiter });
        if (result.errors.length > 0) {
             console.error("CSV Erros:", result.errors);
             const errorDetails = result.errors.map(err => `L${err.row}: ${err.message}`).join('; ');
             throw new Error(`Erro parse CSV: ${errorDetails}`);
        }
        data = result.data;
    } else {
        data = csv.trim().split("\n").map(row => row.split(delimiter));
    }
    const cleanedData = removeEmptyColumns(removeEmptyRows(data));
    tableDataMap[fileUploadId] = JSON.parse(JSON.stringify(cleanedData));
    originalTableDataMap[fileUploadId] = JSON.parse(JSON.stringify(cleanedData));
};

function renderTable(fileUploadId) {
    const data = tableDataMap[fileUploadId];
    const tableElement = document.getElementById("table-content");
    if (!tableElement) return;
    tableElement.innerHTML = "";

    if (!data || data.length === 0) {
        tableElement.innerHTML = "<tr><td>Nenhum dado.</td></tr>";
        return;
    }

    const thead = tableElement.createTHead();
    const headerRow = thead.insertRow();
    const emptyTh = document.createElement("th");
    headerRow.appendChild(emptyTh); // Célula vazia para alinhamento

    // Cria Cabeçalhos com wrapper flex
    data[0].forEach((header, colIndex) => {
        const th = document.createElement("th");
        const wrapper = document.createElement('div');
        wrapper.className = 'th-content-wrapper';
        const textSpan = document.createElement('span');
        textSpan.className = 'th-text';
        textSpan.textContent = header ?? `Coluna ${colIndex + 1}`;
        textSpan.title = header ?? '';
        wrapper.appendChild(textSpan);

        const removeColBtn = document.createElement("span");
        removeColBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        removeColBtn.classList.add("remove-btn");
        removeColBtn.title = "Remover coluna";
        removeColBtn.addEventListener("click", (e) => { e.stopPropagation(); removeColumn(fileUploadId, colIndex); });
        wrapper.appendChild(removeColBtn);

        th.appendChild(wrapper);
        headerRow.appendChild(th);
    });

    // Cria Corpo
    const tbody = tableElement.createTBody();
    for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
        const rowData = data[rowIndex];
        if (!Array.isArray(rowData)) continue;
        const tr = tbody.insertRow();

        // Botão remover linha
        const removeRowTd = tr.insertCell();
        removeRowTd.innerHTML = `<button class="btn-icon btn-delete-row" title="Remover linha ${rowIndex + 1}"><i class="fas fa-trash-alt"></i></button>`;
        removeRowTd.querySelector('button').addEventListener("click", (e) => { e.stopPropagation(); removeRow(fileUploadId, rowIndex); });

        // Células de dados
        rowData.forEach((cell, colIndex) => {
            const td = tr.insertCell();
            td.textContent = cell ?? "";
            td.title = cell ?? "";
            td.addEventListener("click", () => editCell(fileUploadId, td, rowIndex, colIndex));
        });
    }
}


const removeEmptyRows = (data) => {
     if (!Array.isArray(data)) return [];
     return data.filter(row => Array.isArray(row) && row.some(cell => String(cell ?? '').trim() !== ""));
};

const removeEmptyColumns = (data) => {
    if (!data || data.length === 0 || !Array.isArray(data[0])) return data;
    const columnCount = data[0].length;
    const columnIndexesToRemove = [];
    for (let colIndex = 0; colIndex < columnCount; colIndex++) {
        const isColumnEmpty = data.every(row => !Array.isArray(row) || colIndex >= row.length || String(row[colIndex] ?? '').trim() === "");
        if (isColumnEmpty) columnIndexesToRemove.push(colIndex);
    }
    if (columnIndexesToRemove.length === 0) return data;
    return data.map(row => Array.isArray(row) ? row.filter((_, colIndex) => !columnIndexesToRemove.includes(colIndex)) : row);
};

function editCell(fileUploadId, cell, rowIndex, colIndex) {
    if (cell.classList.contains('editing') || cell.querySelector("textarea")) return;
    cell.classList.add('editing');
    const oldValue = cell.textContent;
    const input = document.createElement("textarea");
    input.value = oldValue;

    input.addEventListener("blur", () => {
        const newValue = input.value;
        console.log(`Blur: R${rowIndex}C${colIndex}, New: "${newValue}"`); // Log
        if (tableDataMap[fileUploadId]?.[rowIndex]) {
            console.log(`Updating map[${fileUploadId}][${rowIndex}][${colIndex}] from "${tableDataMap[fileUploadId][rowIndex][colIndex]}" to "${newValue}"`); // Log
            tableDataMap[fileUploadId][rowIndex][colIndex] = newValue;
        } else { console.error(`Map error: R${rowIndex}C${colIndex}`); } // Log Erro
        cell.textContent = newValue; cell.title = newValue;
        cell.classList.remove('editing');
        if (fileUploadId === 'file-upload-1') {
             console.log("Revalidating NoDoGrafico after edit...");
             validateNoDoGrafico(fileUploadId, true); // Valida SEM alert
             // updateStatusIcon(fileUploadId, 'status-1'); // Status é atualizado ao SALVAR
        }
    });
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); input.blur(); }
        else if (e.key === "Escape") { input.value = oldValue; input.blur(); }
    });

    cell.innerHTML = ""; cell.appendChild(input);
    input.focus(); input.select();
}

/** Remove Linha */
const removeRow = (fileUploadId, rowIndex) => {
    // rowIndex é o índice no array 'data' (1 para 1ª linha de dados, 2 para 2ª, etc.)
    // Visual row number (considerando header como linha 1) é rowIndex + 1
    const visualRowNumber = rowIndex + 1;

    if (confirm(`Tem certeza que deseja excluir a linha ${rowIndex}?`)) {
        // Verifica se o índice existe no array de dados atual
        if (tableDataMap[fileUploadId]?.[rowIndex]) {
            console.log(`Removendo linha ${visualRowNumber} (índice de dados: ${rowIndex})`); // Log
            tableDataMap[fileUploadId].splice(rowIndex, 1); // Remove o elemento correto do array
            renderTable(fileUploadId); // Re-renderiza a tabela
            if (fileUploadId === 'file-upload-1') {
                validateNoDoGrafico(fileUploadId, true); // Revalida sem alert
                updateStatusIcon(fileUploadId, 'status-1'); // Atualiza status geral
            }
        } else {
             console.error(`Erro ao tentar remover linha ${visualRowNumber} (índice de dados ${rowIndex}): Dados não encontrados.`);
             alert(`Erro: Não foi possível encontrar os dados para a linha ${visualRowNumber}.`);
        }
    }
};

const removeColumn = (fileUploadId, colIndex) => {
     const headerText = tableDataMap[fileUploadId]?.[0]?.[colIndex] || `Coluna ${colIndex + 1}`;
    if (confirm(`Tem certeza que deseja excluir a coluna "${headerText}"?`)) {
         if (tableDataMap[fileUploadId]) {
            tableDataMap[fileUploadId].forEach(row => {
                 if (Array.isArray(row) && row.length > colIndex) row.splice(colIndex, 1);
            });
            renderTable(fileUploadId);
            if (fileUploadId === 'file-upload-1') {
                 validateNoDoGrafico(fileUploadId, true);
                 updateStatusIcon(fileUploadId, 'status-1'); // Atualiza status geral
            }
        }
    }
};

// ------------------------ Funções do Modal (Salvar, Cancelar, Fechar) ------------------------ //

function cancelChanges() {
    if (originalTableDataMap[currentFileUploadId]) {
        tableDataMap[currentFileUploadId] = JSON.parse(JSON.stringify(originalTableDataMap[currentFileUploadId]));
    } else {
        // Se não há original (ex: consulta base nunca salva), limpa o atual
        delete tableDataMap[currentFileUploadId];
    }
    closeModal();
}

function saveChanges() {
    // Força o blur do elemento ativo se for um textarea da nossa tabela
    const activeElement = document.activeElement;
    if (activeElement && activeElement.tagName === 'TEXTAREA' && activeElement.closest('#table-content')) {
         console.log('Forcing blur on active textarea before saving.');
         activeElement.blur();
    }

    setTimeout(() => {
        const currentId = currentFileUploadId; // Guarda antes de fechar
        if (tableDataMap[currentId]) {
             console.log(`Saving changes for ${currentId}. Current data:`, JSON.parse(JSON.stringify(tableDataMap[currentId])));
            originalTableDataMap[currentId] = JSON.parse(JSON.stringify(tableDataMap[currentId]));
            console.log(`Data saved to originalTableDataMap for ${currentId}`);

            const statusIdSuffix = currentId.startsWith('file-upload-complete') ? 'complete' : currentId.split('-').pop();
            const statusId = `status-${statusIdSuffix}`;

            if (currentId === "file-upload-1") {
                 validateNoDoGrafico(currentId, true); // Revalida SEM alert
            }
             updateStatusIcon(currentId, statusId); // Atualiza status GERAL após salvar
        } else { console.warn(`Nenhum dado para salvar para ${currentId}`); }
        closeModal();
    }, 200); // Timeout aumentado
}

document.getElementById('modal-overlay')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) cancelChanges();
});


// ------------------------ Validação Coluna "No do gráfico" ------------------------ //

function validateNoDoGrafico(fileUploadId, suppressAlert = false) {
    if (fileUploadId !== "file-upload-1") return;
    console.log(`Validando 'No do gráfico' para ${fileUploadId}...`);
    // Limpa APENAS erros relacionados a esta validação específica
    fileErrors[fileUploadId] = (fileErrors[fileUploadId] || []).filter(e => !e.includes("No do gráfico"));

    const tableElement = document.getElementById("table-content");
    const data = tableDataMap[fileUploadId];

    if (!tableElement || !data || data.length === 0) { fileErrors[fileUploadId].push("Tabela Consulta vazia"); return; }
    if (!Array.isArray(data[0])) { fileErrors[fileUploadId].push("Cabecalho Consulta invalido"); return; }

    const headerRow = data[0].map(header => String(header ?? '').trim().toLowerCase());
    const colIndexNoGrafico = headerRow.indexOf("no do gráfico");

    if (colIndexNoGrafico === -1) {
        fileErrors[fileUploadId].push("Coluna 'No do gráfico' ausente");
        if (!suppressAlert) alert("Erro Crítico: Coluna 'No do gráfico' ausente.");
        return;
    }

    const regex = /^\d+(\.\d+)*(\.\d+[a-zA-Z]?)?$/;
    const invalidFormatRows = []; const emptyCellRows = [];
    const tbody = tableElement.querySelector("tbody");
    if (!tbody) return;
    const tableRows = tbody.getElementsByTagName("tr");

    for (let i = 0; i < tableRows.length; i++) {
        const dataRowIndex = i + 1; // Índice no array data (dados começam em 1)
        if (!data[dataRowIndex] || data[dataRowIndex].length <= colIndexNoGrafico) continue;
        let cellValue = String(data[dataRowIndex][colIndexNoGrafico] || "").trim();
        data[dataRowIndex][colIndexNoGrafico] = cellValue; // Salva trimado

        const targetCellElement = tableRows[i]?.cells[colIndexNoGrafico + 1]; // +1 pela lixeira
        if (targetCellElement) targetCellElement.style.border = ""; // Reseta borda

        let isRowInvalid = false;
        if (!cellValue) { emptyCellRows.push(dataRowIndex + 1); isRowInvalid = true; }
        else if (!regex.test(cellValue)) { invalidFormatRows.push(dataRowIndex + 1); isRowInvalid = true; }
        if (isRowInvalid && targetCellElement) targetCellElement.style.border = "2px solid red";
    }

    let errorMessagesForAlert = [];
    if (emptyCellRows.length > 0) { const msg = `Célula vazia em "No do gráfico" (linhas: ${emptyCellRows.join(", ")})`; errorMessagesForAlert.push(msg); fileErrors[fileUploadId].push(msg); }
    if (invalidFormatRows.length > 0) { const msg = `Formato inválido em "No do gráfico" (linhas: ${invalidFormatRows.join(", ")}).`; errorMessagesForAlert.push(msg); fileErrors[fileUploadId].push(msg); }

    if (!suppressAlert && errorMessagesForAlert.length > 0) { alert("Erro na Tabela de Consulta:\n\n" + errorMessagesForAlert.join("\n")); }
    else if (errorMessagesForAlert.length === 0) { console.log("Validação 'No do gráfico' OK."); }
}

// ------------------------ Validação Geral e Continuação ------------------------ //

function extractIdentifiersFromResponseHeader(headerRow) {
    if (!Array.isArray(headerRow)) return [];
    const identifiers = new Set();
    const idRegex = /\[(\d+\.\d+\.\d+[a-zA-Z]?)\]$/;
    headerRow.forEach(header => {
        if (typeof header === 'string') {
            const match = header.trim().match(idRegex);
            if (match && match[1]) identifiers.add(match[1]);
        }
    });
    return Array.from(identifiers);
}

function validateBeforeContinue() {
    console.log("Validando tudo antes de continuar...");
    let errors = []; let warnings = [];

    // 1. Escola
    const schoolName = document.getElementById('school-name')?.value.trim();
    const schoolCity = document.getElementById('school-city')?.value.trim();
    const schoolState = document.getElementById('school-state')?.value.trim();
    const schoolResponsible = document.getElementById('school-responsible')?.value.trim();
    if (!schoolName || !schoolCity || !schoolState || !schoolResponsible) { errors.push("Preencha todas as Informações da Escola."); }

    // 2. Consulta
    const consultaFileId = "file-upload-1";
    const consultaData = tableDataMap[consultaFileId];
    const consultaEnviada = consultaData?.length > 1;
    let noGraficoColIndex = -1;
    if (!consultaEnviada) { errors.push("Tabela de Consulta não carregada ou vazia."); }
    else {
        validateNoDoGrafico(consultaFileId, true); // Revalida sem alert
        if (fileErrors[consultaFileId]?.length > 0) { fileErrors[consultaFileId].forEach(errMsg => errors.push(`Erro Tabela Consulta: ${errMsg}`)); }
        if (Array.isArray(consultaData?.[0])) {
            const headerRow = consultaData[0].map(h => String(h ?? '').trim().toLowerCase());
            noGraficoColIndex = headerRow.indexOf("no do gráfico");
            if (noGraficoColIndex === -1 && !errors.some(e => e.includes("Coluna 'No do gráfico' ausente"))) { errors.push("Erro Crítico Consulta: Coluna 'No do gráfico' ausente."); }
        } else if(!errors.some(e => e.includes("Cabeçalho da Tabela de Consulta inválido"))) { errors.push("Erro Crítico Consulta: Cabeçalho inválido."); }
    }

    // 3. Respostas e Referência
    const consultaIdentifiers = new Set(); const responseIdentifiers = new Set();
    const responseIdentifierSources = new Map(); let respostaValidaCount = 0;
    const demaisTabelasParaSalvar = {};

    if (consultaEnviada && noGraficoColIndex !== -1) {
        for (let i = 1; i < consultaData.length; i++) {
            if (consultaData[i]?.[noGraficoColIndex]) { const id = String(consultaData[i][noGraficoColIndex]).trim(); if (id) consultaIdentifiers.add(id); }
        }
    }

    for (const key in tableDataMap) {
        if (key !== consultaFileId && key !== "file-upload-complete" && tableDataMap[key]?.length > 0) {
            const responseData = tableDataMap[key]; const responseFileName = fileNameMap[key] || `Arquivo ${key}`;
            const responseErrors = fileErrors[key] || [];
            if (responseData.length <= 1) { warnings.push(`Arquivo Respostas (${responseFileName}) parece vazio.`); continue; }
            const internalErrors = responseErrors.filter(e => !e.includes("Referência"));
            if (internalErrors.length > 0) { errors.push(`Arquivo Respostas (${responseFileName}) contém erros: ${internalErrors.join(", ")}`); continue; }
            const header = responseData[0]; const idsInFile = extractIdentifiersFromResponseHeader(header);
            if (idsInFile.length === 0) { warnings.push(`Arquivo Respostas (${responseFileName}) sem colunas [ID] no cabeçalho.`); }
            idsInFile.forEach(id => {
                responseIdentifiers.add(id);
                if (!responseIdentifierSources.has(id)) responseIdentifierSources.set(id, []);
                if (!responseIdentifierSources.get(id).includes(responseFileName)) responseIdentifierSources.get(id).push(responseFileName);
            });
            respostaValidaCount++; demaisTabelasParaSalvar[responseFileName] = responseData;
        }
    }
    if (respostaValidaCount === 0 && !errors.some(e => e.includes("Nenhum arquivo de respostas"))) { errors.push("Nenhum arquivo de respostas válido carregado."); }

    if (consultaEnviada && noGraficoColIndex !== -1 && respostaValidaCount > 0) {
        consultaIdentifiers.forEach(id => { if (id && !responseIdentifiers.has(id)) { errors.push(`Erro Ref: ID '${id}' da Consulta não encontrado em Respostas.`); } });
        responseIdentifiers.forEach(id => { if (id && !consultaIdentifiers.has(id)) { const sources = responseIdentifierSources.get(id)?.join(', ') || '?'; errors.push(`Erro Ref: Coluna '[${id}]' (Arq: ${sources}) não encontrada na Consulta.`); } });
    }

    // 4. Reportar ou Continuar
    console.log("Erros de validação:", errors); // Log para depuração
    console.log("Avisos de validação:", warnings); // Log para depuração
    if (errors.length > 0) {
        alert(`Problemas encontrados:\n\n- ${errors.join("\n- ")}\n\n${warnings.length > 0 ? 'Avisos:\n- ' + warnings.join('\n- ') : ''}\n\nCorrija os problemas antes de continuar.`);
        return false;
    } else {
        if (warnings.length > 0) { if (!confirm(`Atenção:\n\n- ${warnings.join("\n- ")}\n\nDeseja continuar?`)) { return false; } }
        const finalData = { "TabelaConsulta": tableDataMap[consultaFileId], "DemaisTabelas": demaisTabelasParaSalvar };
        try {
            localStorage.setItem("dadosCompletos", JSON.stringify(finalData));
            if (loadedChartConfigs) { localStorage.setItem("loadedChartConfigs", JSON.stringify(loadedChartConfigs)); } else { localStorage.removeItem("loadedChartConfigs"); }
            schoolInfoData = { name: schoolName, city: schoolCity, state: schoolState, responsible: schoolResponsible };
            localStorage.setItem("schoolInfo", JSON.stringify(schoolInfoData));
            console.log("Dados validados e salvos."); window.location.href = "visualizacao.html"; return true;
        } catch (error) { console.error("Erro salvar localStorage:", error); alert("Erro ao salvar dados."); return false; }
    }
}


// ------------------------ Funções da Tabela de Consulta Base ------------------------ //

let consultaTableData = null;

function loadConsultaTable() {
    const btnObter = document.querySelector('.helper-links a[onclick*="loadConsultaTable"]'); // Seleciona o link correto
    const originalHTML = btnObter ? btnObter.innerHTML : 'Obter Tabela';
    if(btnObter) { btnObter.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...'; btnObter.style.pointerEvents = 'none'; } // Desabilita link visualmente

    fetch('Planilhas/tabela_de_consulta_base.xlsx')
        .then(response => { if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`); return response.arrayBuffer(); })
        .then(buffer => {
            const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            consultaTableData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
            openConsultaModal();
        })
        .catch(error => { console.error("Erro loadConsultaTable:", error); alert(`Erro ao carregar consulta base: ${error.message}`); }) // Alerta específico
        .finally(() => { if(btnObter) { btnObter.innerHTML = originalHTML; btnObter.style.pointerEvents = 'auto'; } });
}

function openConsultaModal() {
    if (!consultaTableData) { alert("Consulta base não carregada."); return; } // Alerta específico
    const fileIdBase = "consulta-upload"; currentFileUploadId = fileIdBase;
    const cleanedData = removeEmptyColumns(removeEmptyRows(consultaTableData));
    tableDataMap[fileIdBase] = JSON.parse(JSON.stringify(cleanedData));
    originalTableDataMap[fileIdBase] = JSON.parse(JSON.stringify(cleanedData));
    fileNameMap[fileIdBase] = "tabela_de_consulta_base.xlsx"; fileExtensionMap[fileIdBase] = ".xlsx";

    document.getElementById("modal-title").textContent = "Pré-visualização: Tabela Consulta Base";
    const footer = document.getElementById("modal-footer-content");
    footer.innerHTML = `
        <button class="btn btn-secondary" onclick="downloadConsultaTable()" title="Baixar original"><i class="fas fa-download"></i> Download</button>
        <button class="btn btn-secondary" onclick="cancelConsultaModal()">Cancelar</button>
        <button class="btn btn-success" onclick="useConsultaTable()" title="Usar esta tabela (editada)"><i class="fas fa-check"></i> Usar Tabela</button>
    `;
    renderTable(fileIdBase); openModal();
}

function downloadConsultaTable() {
    const link = document.createElement("a"); link.href = "Planilhas/tabela_de_consulta_base.xlsx";
    link.download = "tabela_de_consulta_base.xlsx"; document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

function useConsultaTable() {
    const fileIdBase = "consulta-upload"; const fileIdPrincipal = "file-upload-1"; const statusIdPrincipal = "status-1";
    const data = tableDataMap[fileIdBase];
    if (!data || data.length === 0) { alert("Tabela consulta base vazia ou inválida."); return; } // Alerta específico

    tableDataMap[fileIdPrincipal] = JSON.parse(JSON.stringify(data));
    originalTableDataMap[fileIdPrincipal] = JSON.parse(JSON.stringify(data));
    fileNameMap[fileIdPrincipal] = fileNameMap[fileIdBase] || "TabelaConsulta (Base)";
    fileExtensionMap[fileIdPrincipal] = fileExtensionMap[fileIdBase] || ".xlsx";
    fileErrors[fileIdPrincipal] = [];

    displayFileInfo(fileIdPrincipal, fileNameMap[fileIdPrincipal]);
    validateNoDoGrafico(fileIdPrincipal, true);
    updateStatusIcon(fileIdPrincipal, statusIdPrincipal);
    closeModal();
    alert("Tabela consulta base carregada como principal."); // Confirmação
    delete tableDataMap[fileIdBase]; delete originalTableDataMap[fileIdBase];
}

function cancelConsultaModal() {
    delete tableDataMap["consulta-upload"]; delete originalTableDataMap["consulta-upload"];
    closeModal();
}

// ------------------------ Inicialização de Listeners ------------------------ //

document.addEventListener('DOMContentLoaded', () => {
    // Inputs Iniciais
    document.getElementById('file-upload-1')?.addEventListener('change', (e) => validarArquivo(e, ["csv", "xlsx"], "status-1"));
    document.getElementById('file-upload-2')?.addEventListener('change', (e) => validarArquivo(e, ["csv", "xlsx"], "status-2"));
    document.getElementById('file-upload-complete')?.addEventListener('change', (e) => validarArquivo(e, ["json"], "status-complete"));

    // Botões View Iniciais
    attachViewButtonListener('view-1', 'file-upload-1', 0);
    attachViewButtonListener('view-2', 'file-upload-2', 1);

    // Inputs Rename Iniciais
    const renameInputResp1 = document.querySelector('#wrapper-2 .rename-input');
    if (renameInputResp1) {
         renameInputResp1.addEventListener("input", () => {
             const fileUploadId = 'file-upload-2'; const baseName = renameInputResp1.value.trim();
             const extension = fileExtensionMap[fileUploadId] || ""; // Pega extensão atual se existir
             const groupNameFallback = `Estudantes`;
             fileNameMap[fileUploadId] = baseName ? `${baseName}${extension}` : `${groupNameFallback}${extension}`;
             if (currentFileUploadId === fileUploadId) document.getElementById("modal-title").textContent = fileNameMap[fileUploadId];
         });
          // Define nome inicial no mapa
          const initialBaseName = renameInputResp1.value.trim();
          fileNameMap['file-upload-2'] = initialBaseName ? `${initialBaseName}` : `Estudantes`; // Guarda sem extensão inicialmente
    }
     // Define nome inicial para consulta (sem extensão)
     fileNameMap['file-upload-1'] = "TabelaConsulta";


    // Carrega Info Escola do LocalStorage (se houver)
    if (!schoolInfoData) {
        const storedSchoolInfo = localStorage.getItem("schoolInfo");
        if (storedSchoolInfo) {
            try {
                schoolInfoData = JSON.parse(storedSchoolInfo);
                document.getElementById('school-name').value = schoolInfoData.name || '';
                document.getElementById('school-city').value = schoolInfoData.city || '';
                document.getElementById('school-state').value = schoolInfoData.state || '';
                document.getElementById('school-responsible').value = schoolInfoData.responsible || '';
            } catch (e) { console.error("Erro parse localStorage:", e); localStorage.removeItem("schoolInfo"); }
        }
    }
});