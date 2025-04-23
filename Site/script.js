/*
 * script.js (vFinal com Critérios 50%/50%, Cálculo Teia e CORREÇÃO PERGUNTAS v4)
 * Processes data from localStorage (TabelaConsulta, DemaisTabelas, savedChartConfigs)
 * Generates window.visualizacaoData for chart initialization.
 * Creates special 'TeiaPair' items based on 50%/50% criteria.
 * Calculates percentages for BOTH Teia Normal and TeiaPair data HERE.
 * CORRIGIDO v4: Handles multi-column Bar charts by creating sub-groups (a), (b)
 *              based on columns found, NOT markers in question text.
 * CORRIGIDO v3: Removes prefixes from questions.
 * CORRIGIDO v2: Collects questions from response table headers.
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log("Processing data for visualization...");

    // --- Carrega Dados Essenciais ---
    const dadosCompletos = JSON.parse(localStorage.getItem("dadosCompletos"));
    const savedConfigsString = localStorage.getItem('loadedChartConfigs');
    let savedChartConfigs = {};
    if (savedConfigsString) { /* ... (load config) ... */
         try { savedChartConfigs = JSON.parse(savedConfigsString); console.log(`Loaded ${Object.keys(savedChartConfigs).length} saved configurations.`); } catch (e) { console.error("Error parsing savedChartConfigs:", e); }
    } else { console.log("No saved chart configurations found."); }
    if (!dadosCompletos?.TabelaConsulta?.length || !dadosCompletos.DemaisTabelas) { /* ... (validation) ... */ return; }
    const { TabelaConsulta: originalTabelaConsulta, DemaisTabelas: demaisTabelas } = dadosCompletos;
    console.log(`Data loaded. Response tables: ${Object.keys(demaisTabelas).length}`);

    // --- Helper Functions ---
    const isValidResponse = (value) => value != null && String(value).trim() !== '';
    const verificarCategoria = (categoria) => { /* ... (função original Teia Normal) ... */
        const catString = String(categoria ?? '').trim(); if (!catString) return []; const partes = catString.split(/,\s*(?![^()]*\))/); const novasCategorias = []; if (partes.length > 0) { const primeiraParte = partes[0].trim(); if (primeiraParte) novasCategorias.push(primeiraParte); } for (let i = 1; i < partes.length; i++) { const parte = partes[i].trim(); if (parte && (novasCategorias.length === 0 || /^[A-ZÀ-ÖØ-Ý]/.test(parte))) { novasCategorias.push(parte); } else if (novasCategorias.length > 0 && parte) { novasCategorias[novasCategorias.length - 1] += `, ${parte}`; novasCategorias[novasCategorias.length - 1] = novasCategorias[novasCategorias.length - 1].trim(); } } return novasCategorias.filter(cat => cat);
    };

    // --- Função de Análise Teia Especial (Critérios 50%/50%) ---
    const analyzeSpecialTeiaFormat = (rawResponsesArray) => { /* ... (função da versão anterior - sem mudanças aqui) ... */
        let totalValidResponses = 0; let responsesMeetingPartCriterion = 0; const aggregatedCounts = {}; const foundCategories = new Set(); const specialPartRegex = /^(.*?)\s+\(([^)]+)\)$/; const MIN_PART_PERCENTAGE = 0.5;
        for (const rawResponse of rawResponsesArray) { if (!isValidResponse(rawResponse)) continue; totalValidResponses++; const responseString = String(rawResponse).trim(); const parts = responseString.split(/,\s*/).map(p => p.trim()).filter(p => p !== ''); const totalParts = parts.length; if (totalParts === 0) continue; let partsMatching = 0; const tempCategorizedForThisResponse = {}; const categoriesInThisResponse = new Set(); for (const part of parts) { const match = part.match(specialPartRegex); if (match) { partsMatching++; const responseText = match[1].trim(); const category = match[2].trim(); if (!tempCategorizedForThisResponse[category]) tempCategorizedForThisResponse[category] = {}; if (!tempCategorizedForThisResponse[category][responseText]) tempCategorizedForThisResponse[category][responseText] = 0; tempCategorizedForThisResponse[category][responseText]++; categoriesInThisResponse.add(category); } } if ((partsMatching / totalParts) >= MIN_PART_PERCENTAGE) { responsesMeetingPartCriterion++; categoriesInThisResponse.forEach(cat => foundCategories.add(cat)); for (const cat in tempCategorizedForThisResponse) { if (!aggregatedCounts[cat]) aggregatedCounts[cat] = {}; for (const resp in tempCategorizedForThisResponse[cat]) { if (!aggregatedCounts[cat][resp]) aggregatedCounts[cat][resp] = 0; aggregatedCounts[cat][resp] += tempCategorizedForThisResponse[cat][resp]; } } } } return { totalValidResponses, responsesMeetingPartCriterion, aggregatedCounts, foundCategories };
    };

    // --- Função identificarTipoDeGrafico (ORIGINAL) ---
    const identificarTipoDeGrafico = (todasRespostas, infoGrupos) => { /* ... (função original) ... */
         const respostasValidas = todasRespostas.filter(isValidResponse).map(r => String(r).trim()); const totalRespostasConsideradas = todasRespostas.length; if (totalRespostasConsideradas > 0 && (totalRespostasConsideradas - respostasValidas.length) / totalRespostasConsideradas > 0.6) return 'Quadro de respostas abertas'; if (!respostasValidas.length) return 'Quadro de respostas abertas'; const ehTeia = respostasValidas.some(r => verificarCategoria(r).length > 1 || /\(.+\)/.test(r)); if (ehTeia) return 'Teia'; const frequencyMap = new Map(); respostasValidas.forEach(resp => { frequencyMap.set(resp, (frequencyMap.get(resp) || 0) + 1); }); let foundUniqueLongAnswer = false; for (const [resp, count] of frequencyMap.entries()) { const wordCount = resp.split(/\s+/).filter(Boolean).length; if (count === 1 && wordCount > 6) { foundUniqueLongAnswer = true; break; } } if (foundUniqueLongAnswer) return 'Quadro de respostas abertas'; const uniqueValidCount = frequencyMap.size; return uniqueValidCount <= 6 ? 'Barra' : 'Quadro de respostas abertas';
    };

    // --- getColumnIndicesAndHeaders (CORRIGIDO para remover prefixo) ---
    const getColumnIndicesAndHeaders = (table, identificador) => {
        const header = table?.[0]; if (!header) return []; const regexId = new RegExp(`\\s*\\[${identificador}\\]\\s*$`); const regexPrefix = /^\s*\d+[a-zA-Z]?\.?\s*/;
        return header.reduce((results, colName, j) => { if (typeof colName === 'string') { const trimmedColName = colName.trim(); if (regexId.test(trimmedColName)) { let cleanHeaderText = trimmedColName.replace(regexId, '').trim(); cleanHeaderText = cleanHeaderText.replace(regexPrefix, '').trim(); results.push({ index: j, headerText: cleanHeaderText }); } } return results; }, []);
    };

    // --- Part 1: Update Consultation Table with Chart Types (ORIGINAL) ---
    const getUpdatedTabelaConsulta = () => { /* ... (função original) ... */
         const headerConsulta = originalTabelaConsulta[0]; const indexNoGrafico = headerConsulta?.indexOf("No do gráfico"); if (indexNoGrafico == null || indexNoGrafico === -1) { console.error("'No do gráfico' column not found."); return null; } const novoHeader = [...headerConsulta.slice(0, indexNoGrafico + 1), "Tipo do gráfico", ...headerConsulta.slice(indexNoGrafico + 1)]; const novaTabelaConsulta = [novoHeader]; for (let i = 1; i < originalTabelaConsulta.length; i++) { const rowOriginal = originalTabelaConsulta[i]; const identificador = rowOriginal?.[indexNoGrafico]; if (!identificador) { console.warn(`Row ${i + 1} missing identifier.`); continue; } const todasRespostas = []; for (const [, table] of Object.entries(demaisTabelas)) { if (!table || table.length < 2) continue; const colunasInfo = getColumnIndicesAndHeaders(table, identificador); if (colunasInfo.length > 0) { for (const colInfo of colunasInfo) { const resp = table.slice(1).map(row => (row && row.length > colInfo.index) ? row[colInfo.index] : undefined); todasRespostas.push(...resp); } } } const tipoGrafico = identificarTipoDeGrafico(todasRespostas); const novaLinha = [...rowOriginal.slice(0, indexNoGrafico + 1), tipoGrafico, ...rowOriginal.slice(indexNoGrafico + 1)]; novaTabelaConsulta.push(novaLinha); } console.log(`TabelaConsulta updated with chart types for ${novaTabelaConsulta.length - 1} items.`); return novaTabelaConsulta;
    };

    const tabelaConsultaAtualizada = getUpdatedTabelaConsulta();
    if (!tabelaConsultaAtualizada) { /* ... (erro) ... */ return; }

    // --- Separa Configurações Salvas por Tipo (ORIGINAL) ---
    const separateConfigsByType = (allConfigs) => { /* ... (função original) ... */
         const configBar={}; const configTeia={}; const configRespostas={}; const configPerguntas={}; for (const key in allConfigs) { if (Object.hasOwnProperty.call(allConfigs, key)) { const config = allConfigs[key]; if (key.startsWith('bar_')) configBar[key.substring(4)] = config; else if (key.startsWith('radar_')) configTeia[key.substring(6)] = config; else if (key.startsWith('table_')) configRespostas[key.substring(6)] = config; else if (key.startsWith('perguntas_')) configPerguntas[key.substring(10)] = config; else console.warn(`Saved config with unknown/missing prefix: ${key}`); } } return { configBar, configTeia, configRespostas, configPerguntas };
    };
    const { configBar, configTeia, configRespostas, configPerguntas } = separateConfigsByType(savedChartConfigs);
    window.configBar = configBar; window.configTeia = configTeia; window.configRespostas = configRespostas; window.configPerguntas = configPerguntas;
    console.log("Saved configurations separated by type:", { Bar: Object.keys(configBar).length, Teia: Object.keys(configTeia).length, Respostas: Object.keys(configRespostas).length, Perguntas: Object.keys(configPerguntas).length });
    // --- FIM: Separação ---

    // --- Helper para Preparar Dados de Sub-Gráfico TeiaPair (COM CÁLCULO DE %) ---
    const prepareChartDataFromCounts = (categoryCountsData, groupSizesMap, chartTitle) => { /* ... (código anterior) ... */
        if (!categoryCountsData || Object.keys(categoryCountsData).length === 0) return null; const groupNames = Object.keys(categoryCountsData).sort(); const allResponsesInCat = new Set(); groupNames.forEach(group => { Object.keys(categoryCountsData[group] || {}).forEach(resp => allResponsesInCat.add(resp)); }); const uniqueResponses = [...allResponsesInCat].sort(); if (uniqueResponses.length === 0) return null; const percentageData = groupNames.map(group => { const totalRespondents = groupSizesMap[group]; if (totalRespondents === undefined || totalRespondents === null) console.warn(`prepareChartData: groupSize não encontrado para ${group}.`); const responseCountsForGroup = categoryCountsData[group] || {}; return uniqueResponses.map(resp => { const count = responseCountsForGroup[resp] || 0; const percentage = (totalRespondents && totalRespondents > 0) ? Math.round((count / totalRespondents) * 100) : 0; if (percentage > 100) { console.warn(`prepareChartData (${chartTitle}): % > 100% (${count}/${totalRespondents}) para ${group} - ${resp}. Limitando.`); return 100; } return percentage; }); }); const dfDados = { index: groupNames, columns: uniqueResponses, data: percentageData }; return { dfDados, title: chartTitle, groupSizes: groupSizesMap };
    };

    // --- Part 2: Generate Final visualizacaoData JSON (CORRIGIDO dfPerg v4 - Multi-colunas Barra) ---
    const nomeColunaTitulo = "Título do gráfico"; const nomeColunaDimensao = "Dimensão"; const nomeColunaIndicador = "Indicador";
    const ordemCategoriasBarra = ['Bastante', 'Médio', 'Pouco', 'Nada', 'Outros'];

    const gerarVisualizacaoData = (consultaAtualizada, tabelasDados) => {
        const visualizacaoDataFinal = {}; const intermediateSpecialTeiaData = {}; const processedSpecialIds = new Set();
        const novoHeader = consultaAtualizada[0];
        const grupoSizesMap = Object.entries(tabelasDados).reduce((map, [fileName, table]) => { const grupo = fileName.replace(/\.xlsx?$/i, ""); map[grupo] = (table || []).slice(1).filter(row => row?.some(cell => isValidResponse(cell))).length; return map; }, {});
        const findIndex = (colName) => novoHeader.indexOf(colName);
        const indiceNoGrafico = findIndex("No do gráfico"); const indiceTipoGrafico = findIndex("Tipo do gráfico");
        const indiceTitulo = findIndex(nomeColunaTitulo); const indiceDimensao = findIndex(nomeColunaDimensao); const indiceIndicador = findIndex(nomeColunaIndicador);

        // --- Loop Principal ---
        for (let i = 1; i < consultaAtualizada.length; i++) {
            const linhaConsulta = consultaAtualizada[i]; if (!linhaConsulta) continue;
            const getVal = (index, clean = true) => { if (index === -1 || index >= linhaConsulta.length || linhaConsulta[index] == null) return null; const val = String(linhaConsulta[index]); return clean ? val.trim().replace(/\n/g, ' ') : val; };
            const identificador = getVal(indiceNoGrafico, false); const tipoGrafico = getVal(indiceTipoGrafico, false);
            if (!identificador || !tipoGrafico) { console.warn(`Row ${i + 1} missing ID or Type.`); continue; }
            const idParts = typeof identificador === 'string' ? identificador.split('.') : []; const numeroDimensao = idParts[0] || null; const numeroIndicador = idParts[1] || null;

            const currentItemData = { /* ... (estrutura base) ... */
                id: identificador, type: tipoGrafico, title: getVal(indiceTitulo) || `Vis. ${identificador}`, dimensionNumber: numeroDimensao, dimensionName: getVal(indiceDimensao) || `Dim. ${numeroDimensao || '?'}`, indicatorNumber: numeroIndicador, indicatorName: getVal(indiceIndicador) || `Ind. ${numeroIndicador || '?'}`, dfPerg: { columns: ['Grupo', 'Pergunta'], data: [] }, groupSizes: {}, subGroupToBaseGroup: {}
            };

            // --- Coleta dados brutos E perguntas (v4 - prioriza múltiplas colunas para Barra) ---
            const rawDataPorSubGrupo = {}; const subGruposConsiderados = new Set();
            const perguntasColetadas = new Map(); // Evita duplicar pergunta

            for (const [fileName, table] of Object.entries(tabelasDados)) {
                const grupoBaseReal = fileName.replace(/\.xlsx?$/i, "");
                const colunasDadosInfo = getColumnIndicesAndHeaders(table, identificador); // [{ index, headerText (limpo) }]

                if (colunasDadosInfo.length > 0) {

                    // *** NOVA LÓGICA: Prioriza múltiplas colunas para BARRA ***
                    if (tipoGrafico === 'Barra' && colunasDadosInfo.length > 1) {
                        console.log(`   ID ${identificador}, Grupo ${grupoBaseReal}: Detectadas ${colunasDadosInfo.length} colunas -> Tratando como subgrupos (a), (b)...`);
                        colunasDadosInfo.forEach((colInfo, k) => {
                            const marker = String.fromCharCode(97 + k); // Gera 'a', 'b', 'c'...
                            const subGrupoNomeReal = `${grupoBaseReal} (${marker})`;
                            const perguntaTextoLimpa = colInfo.headerText; // Texto limpo do header da coluna

                            // Adiciona pergunta ao dfPerg se válida e não duplicada
                            if (isValidResponse(perguntaTextoLimpa) && !perguntasColetadas.has(subGrupoNomeReal)) {
                                currentItemData.dfPerg.data.push([subGrupoNomeReal, `(${marker}) ${perguntaTextoLimpa}`]); // Adiciona marcador ao texto
                                perguntasColetadas.set(subGrupoNomeReal, true);
                            }

                            subGruposConsiderados.add(subGrupoNomeReal);
                            currentItemData.subGroupToBaseGroup[subGrupoNomeReal] = grupoBaseReal;
                            // Coleta dados brutos da coluna k
                            if (table?.length > 1 && colInfo.index < table[0].length) { if (!rawDataPorSubGrupo[subGrupoNomeReal]) rawDataPorSubGrupo[subGrupoNomeReal] = []; for (let r = 1; r < table.length; r++) { if (table[r]) rawDataPorSubGrupo[subGrupoNomeReal].push(table[r][colInfo.index]); } } else { rawDataPorSubGrupo[subGrupoNomeReal] = []; }
                        });
                    } else { // Caso de UMA coluna (ou tipo não-Barra)
                        const grupoNomeFinalReal = grupoBaseReal;
                        const colInfo = colunasDadosInfo[0]; // Usa a primeira coluna
                        const perguntaTextoLimpa = colInfo.headerText;

                        if (isValidResponse(perguntaTextoLimpa) && !perguntasColetadas.has(grupoNomeFinalReal)) {
                            currentItemData.dfPerg.data.push([grupoNomeFinalReal, perguntaTextoLimpa]);
                            perguntasColetadas.set(grupoNomeFinalReal, true);
                        }

                        subGruposConsiderados.add(grupoNomeFinalReal);
                        currentItemData.subGroupToBaseGroup[grupoNomeFinalReal] = grupoBaseReal;
                        // Coleta dados brutos
                        if (table?.length > 1 && colInfo.index < table[0].length) { if (!rawDataPorSubGrupo[grupoNomeFinalReal]) rawDataPorSubGrupo[grupoNomeFinalReal] = []; for (let r = 1; r < table.length; r++) { if (table[r]) rawDataPorSubGrupo[grupoNomeFinalReal].push(table[r][colInfo.index]); } } else { rawDataPorSubGrupo[grupoNomeFinalReal] = []; }
                        if (colunasDadosInfo.length > 1 && tipoGrafico !== 'Quadro de respostas abertas' && tipoGrafico !== 'Teia') { console.warn(`ID ${identificador}, Grupo ${grupoBaseReal}: Multiple columns found but not Barra type. Using first.`); }
                    }
                } // Fim if colunasDadosInfo.length > 0
            } // Fim loop tabelasDados

            console.log(`   ID ${identificador}: dfPerg finalizado com perguntas de ${perguntasColetadas.size} grupos/subgrupos reais.`);

            // --- Atribui groupSizes (USA NOMES REAIS) ---
            subGruposConsiderados.forEach(subGrupoReal => { /* ... (lógica original) ... */
                 const baseGroupReal = currentItemData.subGroupToBaseGroup[subGrupoReal] || subGrupoReal; if (baseGroupReal && grupoSizesMap.hasOwnProperty(baseGroupReal)) { currentItemData.groupSizes[baseGroupReal] = grupoSizesMap[baseGroupReal]; if (subGrupoReal !== baseGroupReal) currentItemData.groupSizes[subGrupoReal] = grupoSizesMap[baseGroupReal]; } else { console.warn(`Group size not found for: ${subGrupoReal}`); currentItemData.groupSizes[subGrupoReal] = 0; if (baseGroupReal && subGrupoReal !== baseGroupReal) currentItemData.groupSizes[baseGroupReal] = 0; }
            });
            const subGruposReaisParaProcessar = [...subGruposConsiderados];

            // --- Processamento Específico por Tipo ---
            let isSpecialTeiaDetected = false;

            // --- DETECÇÃO REAL Teia Especial ---
            if (tipoGrafico === 'Teia') { /* ... (lógica de detecção 50%/50% anterior) ... */
                 let overallTotalValidResponses = 0; let overallResponsesMeetingCriterion = 0; const overallAggregatedCounts = {}; const overallFoundCategories = new Set(); const MIN_RESPONSE_PERCENTAGE = 0.5;
                 for (const subGrupoReal of subGruposReaisParaProcessar) { const baseGroupReal = currentItemData.subGroupToBaseGroup[subGrupoReal] || subGrupoReal; const rawResponses = rawDataPorSubGrupo[subGrupoReal] || []; const analysisResult = analyzeSpecialTeiaFormat(rawResponses); overallTotalValidResponses += analysisResult.totalValidResponses; overallResponsesMeetingCriterion += analysisResult.responsesMeetingPartCriterion; analysisResult.foundCategories.forEach(cat => overallFoundCategories.add(cat)); for (const category in analysisResult.aggregatedCounts) { if (!overallAggregatedCounts[category]) overallAggregatedCounts[category] = {}; if (!overallAggregatedCounts[category][baseGroupReal]) overallAggregatedCounts[category][baseGroupReal] = {}; const responseCounts = analysisResult.aggregatedCounts[category]; for (const responseText in responseCounts) { if (!overallAggregatedCounts[category][baseGroupReal][responseText]) overallAggregatedCounts[category][baseGroupReal][responseText] = 0; overallAggregatedCounts[category][baseGroupReal][responseText] += responseCounts[responseText]; } } }
                 const overallPercentage = (overallTotalValidResponses > 0) ? (overallResponsesMeetingCriterion / overallTotalValidResponses) : 0.0; const MIN_PART_PERCENTAGE_Display = 0.5; console.log(`   ID ${identificador}: Análise Teia Especial - ${overallResponsesMeetingCriterion}/${overallTotalValidResponses} resp. válidas (${(overallPercentage * 100).toFixed(1)}%) atenderam critério.`);
                 if (overallPercentage >= MIN_RESPONSE_PERCENTAGE && overallFoundCategories.size > 0) { isSpecialTeiaDetected = true; currentItemData.isSpecial = true; currentItemData.categorizedCounts = overallAggregatedCounts; currentItemData.foundCategories = [...overallFoundCategories].sort(); console.log(`>>> ID ${identificador} MARCADO COMO TEIA ESPECIAL. Categorias: ${currentItemData.foundCategories.join(', ')}`); const baseId = identificador.endsWith('b') ? identificador.slice(0, -1) : identificador; const partKey = identificador.endsWith('b') ? 'b' : 'a'; if (!intermediateSpecialTeiaData[baseId]) intermediateSpecialTeiaData[baseId] = { a: null, b: null }; intermediateSpecialTeiaData[baseId][partKey] = currentItemData; processedSpecialIds.add(identificador); }
            }

            // --- Processa tipos NORMAIS ou Teia NÃO especial ---
            if (!isSpecialTeiaDetected && !processedSpecialIds.has(identificador)) {
                const potentialBaseId = identificador.endsWith('b') ? identificador.slice(0, -1) : null;
                const isPartOfSpecialPair = potentialBaseId && intermediateSpecialTeiaData[potentialBaseId]?.a?.isSpecial;
                if (!isPartOfSpecialPair) {
                    switch (tipoGrafico) {
                        case 'Barra': {
                             // Usa NOMES REAIS (subGruposReaisParaProcessar) para indexar dados
                            const respVal = {}; subGruposReaisParaProcessar.forEach(sg => { respVal[sg] = (rawDataPorSubGrupo[sg] || []).filter(isValidResponse).map(r => String(r).trim()); });
                            const allRespFlat = Object.values(respVal).flat(); const catSet = new Set(allRespFlat);
                            const catsUnicas = [...catSet].sort((a, b) => { const iA=ordemCategoriasBarra.indexOf(a); const iB=ordemCategoriasBarra.indexOf(b); if(iA!==-1 && iB!==-1) return iA-iB; if(iA!==-1)return -1; if(iB!==-1)return 1; return a.localeCompare(b); });
                            currentItemData.dfDados = { index: [], columns: catsUnicas, data: [] }; // Estrutura para contagens
                            subGruposReaisParaProcessar.forEach(sgReal => {
                                // Verifica se há pergunta para este subgrupo REAL OU dados
                                const hasQ = currentItemData.dfPerg.data.some(p => p[0] === sgReal);
                                if ((respVal[sgReal]?.length > 0) || hasQ) {
                                    currentItemData.dfDados.index.push(sgReal); // USA NOME REAL no índice
                                    const respSG = respVal[sgReal] || [];
                                    currentItemData.dfDados.data.push(catsUnicas.map(cat => respSG.filter(r => r === cat).length)); // Contagens
                                }
                            });
                            break;
                        }
                        case 'Teia': { // Teia NORMAL (CALCULA %)
                            /* ... (lógica anterior Teia Normal com NOMES REAIS) ... */
                             console.log(`   ID ${identificador} processado como Teia Normal.`); const respValBaseReal = {}; subGruposReaisParaProcessar.forEach(sgReal => { const bgReal = currentItemData.subGroupToBaseGroup[sgReal] || sgReal; if (!respValBaseReal[bgReal]) respValBaseReal[bgReal] = []; const respSG = (rawDataPorSubGrupo[sgReal] || []).filter(isValidResponse).map(r=>String(r).trim()); respValBaseReal[bgReal].push(...respSG); }); const totaisCatBase = {}; Object.values(respValBaseReal).flat().forEach(respStr => { verificarCategoria(respStr).forEach(cat => { totaisCatBase[cat] = (totaisCatBase[cat] || 0) + 1; }); }); const catsUnicasT = Object.keys(totaisCatBase).sort((a,b) => (totaisCatBase[b]||0) - (totaisCatBase[a]||0) || a.localeCompare(b)); currentItemData.dfDados = { index: [], columns: catsUnicasT, data: [] }; const currentGroupSizes = currentItemData.groupSizes;
                             Object.keys(respValBaseReal).forEach(bgReal => { const hasQ = currentItemData.dfPerg.data.some(p => p[0] === bgReal); if ((respValBaseReal[bgReal]?.length > 0) || hasQ) { currentItemData.dfDados.index.push(bgReal); const totalRespondents = currentGroupSizes[bgReal]; if (totalRespondents === undefined || totalRespondents === null) console.warn(`Teia Normal ${identificador}: groupSize não encontrado para ${bgReal}.`); currentItemData.dfDados.data.push(catsUnicasT.map(c => { const countInCategory = (respValBaseReal[bgReal]||[]).filter(rs => verificarCategoria(rs).includes(c)).length; const percentage = (totalRespondents && totalRespondents > 0) ? Math.round((countInCategory / totalRespondents) * 100) : 0; if (percentage > 100) { console.warn(`Teia Normal ${identificador}: % > 100% (${countInCategory}/${totalRespondents}) para ${bgReal} - ${c}. Limitando.`); return 100; } return percentage; })); } });
                             if (currentItemData.dfDados.index.length === 0 && subGruposReaisParaProcessar.length > 0) console.warn(`Teia Normal ${identificador}: No data aggregated.`);
                             break;
                        }
                        case 'Quadro de respostas abertas': { /* ... (lógica anterior Quadro com NOMES REAIS) ... */
                             currentItemData.dfRespostas = {}; subGruposReaisParaProcessar.forEach(sgReal => { const respSG = (rawDataPorSubGrupo[sgReal] || []).filter(isValidResponse).map(r => String(r).trim()); const hasQ = currentItemData.dfPerg.data.some(p => p[0] === sgReal); if (respSG.length > 0 || hasQ) { currentItemData.dfRespostas[sgReal] = respSG; } });
                             break;
                         }
                        default: { /* ... (lógica original Default) ... */
                            console.warn(`Unhandled chart type "${tipoGrafico}" for item ${identificador}.`); currentItemData.type = 'NaoTratado'; currentItemData.dfRespostas = {}; subGruposReaisParaProcessar.forEach(sg => { currentItemData.dfRespostas[sg] = (rawDataPorSubGrupo[sg] || []).filter(isValidResponse).map(r => String(r).trim()); });
                        }
                    } // Fim switch

                    // Adiciona item normal ao resultado final
                    const hasChartData = currentItemData.dfDados?.index?.length > 0; const hasResponseData = currentItemData.dfRespostas && Object.keys(currentItemData.dfRespostas).length > 0; const hasQuestions = currentItemData.dfPerg?.data?.length > 0;
                    if (hasQuestions || hasChartData || hasResponseData) { visualizacaoDataFinal[identificador] = currentItemData; }
                } else { /* ... (skip parte 'b') ... */ }
            } // Fim if !isSpecialTeiaDetected
        } // --- Fim Loop Principal ---

        // --- Pós-Processamento: Cria Itens 'TeiaPair' ---
        console.log(`Post-processing ${Object.keys(intermediateSpecialTeiaData).length} potential Teia Special pairs.`);
        for (const baseId in intermediateSpecialTeiaData) { /* ... (lógica anterior - sem mudanças aqui) ... */
             const pairData = intermediateSpecialTeiaData[baseId]; const dataItemA = pairData.a; const dataItemB = pairData.b; if (!dataItemA || !dataItemA.isSpecial) { console.error(`Error TeiaPair: Data 'a' for ${baseId} invalid.`); continue; } const allCategories = new Set([...(dataItemA.foundCategories || [])]); if (dataItemB?.foundCategories) { dataItemB.foundCategories.forEach(cat => allCategories.add(cat)); } const finalCategories = [...allCategories].sort(); if (finalCategories.length === 0) { console.warn(`No categories for pair ${baseId}.`); continue; }
             finalCategories.forEach(category => {
                 const sanitizedCategory = category.replace(/[^a-zA-Z0-9]/g, '_'); const newItemId = `${baseId}_${sanitizedCategory}`;
                 const chartDataA = prepareChartDataFromCounts( dataItemA.categorizedCounts?.[category], dataItemA.groupSizes, `${dataItemA.title || baseId + '(a)'} - ${category}` );
                 let chartDataB = null; if (dataItemB?.categorizedCounts?.[category]) { chartDataB = prepareChartDataFromCounts( dataItemB.categorizedCounts[category], dataItemB.groupSizes, `${dataItemB.title || baseId + '(b)'} - ${category}` ); }
                 let combinedPergData = JSON.parse(JSON.stringify(dataItemA.dfPerg || { columns: ['Grupo', 'Pergunta'], data: [] })); if (dataItemB?.dfPerg?.data?.length > 0) { const existingPergKeys = new Set(combinedPergData.data.map(r => `${r[0]}_${r[1]}`)); dataItemB.dfPerg.data.forEach(rowB => { const keyB = `${rowB[0]}_${rowB[1]}`; if (!existingPergKeys.has(keyB)) combinedPergData.data.push(rowB); }); }
                 const newItem = { id: newItemId, type: "TeiaPair", title: category, dimensionNumber: dataItemA.dimensionNumber, dimensionName: dataItemA.dimensionName, indicatorNumber: dataItemA.indicatorNumber, indicatorName: dataItemA.indicatorName, categoryName: category, originalIds: { a: dataItemA.id, b: dataItemB?.id || null }, groupSizes: { ...dataItemA.groupSizes, ...(dataItemB?.groupSizes || {}) }, dfPerg: combinedPergData, chartDataA: chartDataA, chartDataB: chartDataB };
                 if (newItem.chartDataA || newItem.chartDataB || newItem.dfPerg?.data?.length > 0) { visualizacaoDataFinal[newItemId] = newItem; } else { console.warn(`TeiaPair item ${newItemId} skipped.`); }
             });
        } // Fim loop pós-processamento

        console.log(`Final visualizacaoData generated with ${Object.keys(visualizacaoDataFinal).length} items.`);
        return visualizacaoDataFinal; // Retorna o objeto final
    }; // Fim gerarVisualizacaoData

    // --- Final Assignment and Event Dispatch ---
    window.visualizacaoData = gerarVisualizacaoData(tabelaConsultaAtualizada, demaisTabelas);
    window.tabelaConsultaAtualizada = tabelaConsultaAtualizada;
    document.dispatchEvent(new CustomEvent('visualizacaoDataReady'));
    console.log("Data processing complete. 'visualizacaoDataReady' event dispatched.");
    console.log("Global 'visualizacaoData' and saved configs are now available.");

}); // Fim DOMContentLoaded