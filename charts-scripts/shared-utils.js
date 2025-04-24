/* shared-utils.js */
/* Contém dados globais, configurações padrão, funções utilitárias compartilhadas e plugins. */

// Dados reais organizados pelo script.js
window.visualizacaoData = window.visualizacaoData || {};
  
  window.defaultBarSettings = {
    title: "Distribuição por Grupo",
    pad_title: 20,
    figsize: [400, 300],
    fontsize: [16, 10, 10, 10], // [title, x-ticks, legend, y-ticks]
    color_title: '#28282B',
    percent_text_color: '#000000',
    legendPos: 'right',
    bar_colorsMap: { // Preferencial para cores por categoria
      "Bastante": "#4169e1",
      "Médio": "#4682b4",
      "Pouco": "#6495ed",
      "Nada": "#add8e6"
    },
    bar_colors: ['#4169e1', '#4682b4', '#6495ed', '#add8e6'], // Fallback se map não encontrar
    bgColor: "#ffffff",
    textColor: '#000000' // Cor padrão para textos (eixos, legenda)
  };
  
  window.defaultTeiaSettings = {
    title: "Gráfico de Teia Padrão",
    pad_title: 20,
    figsize: [400, 400],
    fontsize: [16, 10, 10], // [title, pointLabels, legend]
    color_title: '#28282B',
    linesColor: ['#B3CDE3', '#D9D9D9', '#F6C5D9', '#CAB2D6'], // Cores por dataset (grupo)
    gridLinesColor: '#cccccc',
    bgColor: "#ffffff",
    lineWidth: 2,
    pointRadius: 3,
    pointBorderColor: '#ffffff',
    textColor: '#000000', // Cor padrão para textos (categorias, legenda)
    legendPos: 'top', // Posição padrão da legenda para teia
    enablePointLabelTruncation: true,
    pointLabelTruncateWords: 3,
    pointLabelMaxWidthPixels: 80,
  };
  
  window.defaultTableSettings = {
    title: "Quadro de Respostas",
    titleFontSize: 16,
    titleColor: "#000000",
    headColor: "#b0c4de",
    cellColor: "#f0f8ff",
    bgColor: "#ffffff",
    headFontSize: 14,
    cellFontSize: 12,
    borderSize: 1,
    borderColor: "#000000",
    headAlign: "center",
    cellAlign: "justify"
  };
  
  // Registro global de instâncias de gráficos/tabelas
  window.charts = window.charts || {};
  
  // ==== Funções Utilitárias ====
  
  // -- DOM & Valores --
  const getEl = (id) => document.getElementById(id);
  const getVal = (id) => getEl(id)?.value;
  const getIntVal = (id, defaultVal) => {
    const value = getVal(id);
    if (value === null || value === undefined) { // Se o elemento não existe ou não tem valor
        return defaultVal;
    }
    const parsed = parseInt(value, 10); // Tenta parsear para inteiro base 10
    // Retorna o valor parseado SOMENTE se for um número válido (isNaN retorna false para números)
    // Caso contrário (string vazia, texto, etc.), retorna o valor default.
    // Isso trata corretamente o caso onde parsed é 0.
    return !isNaN(parsed) ? parsed : defaultVal;
  };
  const getFloatVal = (id, defaultVal) => parseFloat(getVal(id)) || defaultVal;
  const isChecked = (id) => getEl(id)?.checked;
  const safeGet = (obj, path, defaultValue) => path.split('.').reduce((o, k) => (o && o[k] !== undefined && o[k] !== null) ? o[k] : undefined, obj) ?? defaultValue;
  const on = (id, evt, callback) => getEl(id)?.addEventListener(evt, e => callback(e.target.value, e.target));
  const onClick = (id, callback) => getEl(id)?.addEventListener('click', callback);
  
  // -- Cores --
  const clarearCor = (corHex, fator) => {
    corHex = corHex.startsWith('#') ? corHex.slice(1) : corHex;
    if (corHex.length !== 6) return '#cccccc'; // Fallback
    let [r, g, b] = [0, 2, 4].map(i => parseInt(corHex.slice(i, i + 2), 16));
    [r, g, b] = [r, g, b].map(x => Math.min(255, Math.floor(x + (255 - x) * fator)));
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  };

  const rgbToHex = (rgbString) => {
    if (!rgbString || typeof rgbString !== 'string') return '#ffffff'; // Retorna branco se inválido

    // Tenta extrair números de rgb(r, g, b) ou rgba(r, g, b, a)
    const result = rgbString.match(/\d+/g);
    if (!result || result.length < 3) {
         // Se não for formato rgb/rgba válido, verifica se já é hex
         if (/^#[0-9A-F]{6}$/i.test(rgbString)) {
            return rgbString; // Já é hex válido
         }
         // Tenta nomes de cores (limitado) ou retorna default
         // Poderia adicionar uma conversão nome->hex aqui se necessário, mas #ffffff é mais seguro
         console.warn(`Formato de cor inválido para conversão: ${rgbString}. Usando #ffffff.`);
         return '#ffffff';
    }

    const r = parseInt(result[0], 10);
    const g = parseInt(result[1], 10);
    const b = parseInt(result[2], 10);

    // Converte cada componente para hex e garante 2 dígitos
    const toHex = (c) => {
        const hex = c.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  /**
     * Quebra uma string longa em múltiplas linhas baseada na largura máxima.
     * @param {CanvasRenderingContext2D} ctx O contexto 2D do canvas para medir o texto.
     * @param {string} text O texto completo a ser quebrado.
     * @param {number} maxWidth A largura máxima permitida para uma linha em pixels.
     * @returns {string[]} Um array de strings, onde cada string é uma linha.
     */
  function wrapText(ctx, text, maxWidth) {
    if (!text || typeof text !== 'string') return [];
    const words = text.trim().split(' ');
    let lines = [];
    if (words.length === 0) return [];
    let currentLine = words[0];
    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine + ' ' + word;
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth <= maxWidth) {
            currentLine = testLine;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
  }


  const titleAutoWrapPlugin = {
    id: 'titleAutoWrap',
    beforeUpdate(chart, args, options) {
        const title = chart.options.plugins?.title;
        const chartId = chart.canvas?.id || 'unknown-chart';

        // *** PASSO 1: Obter o texto-fonte da nossa propriedade customizada ***
        const intendedText = title?._intendedText; // Lê o texto original que ARMAZENAMOS

        // *** PASSO 2: Verificar se devemos processar ***
        // Processa se o título estiver habilitado (display=true) e intendedText for uma string válida
        if (!title || !title.display || typeof intendedText !== 'string' || !intendedText.trim()) {
            // Se o título NÃO deve ser exibido ou não tem texto válido:
            // Garante que o `title.text` renderizado seja vazio (array vazio [])
            // para evitar exibir um título antigo que foi quebrado anteriormente.
            if (title && title.display && (!intendedText || !intendedText.trim())) {
                 // Verifica se já é um array vazio para evitar updates desnecessários
                const currentText = title.text;
                if (!Array.isArray(currentText) || currentText.length > 0) {
                    // console.log(`[${chartId}] titleAutoWrap: Intended text é vazio/inválido, limpando title.text para [].`);
                    chart.options.plugins.title.text = []; // Define como array vazio
                }
            }
             // console.log(`[${chartId}] titleAutoWrap: Skipping - Título não visível ou intendedText inválido.`);
            return; // Não faz mais nada
        }

        // Se chegamos aqui, temos um título válido em intendedText
        const textToWrap = intendedText;

        // *** PASSO 3: Calcular MaxWidth (usando canvas width, mais seguro em beforeUpdate) ***
        let maxWidth;
        const canvasWidth = chart.width;
        const padding = 40; // Padding lateral estimado
        if (canvasWidth > padding) {
             maxWidth = Math.max(canvasWidth - padding, 50); // Largura - padding, min 50px
        } else {
             maxWidth = Math.max(canvasWidth * 0.9, 30); // Fallback: 90% ou min 30px
        }
         // console.log(`[${chartId}] titleAutoWrap: maxWidth = ${maxWidth?.toFixed(2)} for text: "${textToWrap}"`);
        if (maxWidth <= 0) { return; } // Segurança

        // *** PASSO 4: Obter Fonte (igual antes) ***
        const fontConfig = title.font || {};
        const fontSize = fontConfig.size || Chart.defaults.font.size || 12;
        const fontStyle = fontConfig.style || Chart.defaults.font.style || 'normal';
        const fontWeight = fontConfig.weight || Chart.defaults.font.weight || 'normal';
        const fontFamily = fontConfig.family || Chart.defaults.font.family || 'sans-serif';

        // *** PASSO 5: Quebrar Texto (igual antes, usando textToWrap) ***
        const ctx = chart.ctx;
        if (!ctx) { console.warn(`[${chartId}] titleAutoWrap: Contexto não disponível.`); return; }
        const originalFont = ctx.font;
        ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
        const wrappedLines = wrapText(ctx, textToWrap, maxWidth); // Chama a função utilitária
        ctx.font = originalFont;
        // console.log(`[${chartId}] titleAutoWrap: Linhas calculadas:`, wrappedLines);


        // *** PASSO 6: Comparar e Atualizar ***
        // Compara o resultado (wrappedLines) com o que está atualmente em title.text
        const currentDisplayValue = title.text;
        // Trata o caso inicial onde title.text ainda pode ser a string original
        const currentDisplayLines = Array.isArray(currentDisplayValue) ? currentDisplayValue : [String(currentDisplayValue)];

        // Atualiza title.text SOMENTE se o array calculado for diferente do atual
        if (JSON.stringify(currentDisplayLines) !== JSON.stringify(wrappedLines)) {
            // console.log(`[${chartId}] titleAutoWrap: Atualizando title.text de`, currentDisplayLines, `para`, wrappedLines);
            chart.options.plugins.title.text = wrappedLines; // Define o array para renderização
        }
        // else {
        //     console.log(`[${chartId}] titleAutoWrap: Nenhuma atualização necessária para title.text.`);
        // }
    }
};

// Registra o plugin (inalterado)
try {
    if (Chart.registry.plugins.get('titleAutoWrap')) {
        Chart.unregister(titleAutoWrapPlugin);
    }
    Chart.register(titleAutoWrapPlugin);
} catch (e) {
    if (typeof Chart !== 'undefined' && !e.message.includes('is already registered')) {
         console.error("Erro ao registrar plugin 'titleAutoWrap':", e);
    } else if (typeof Chart === 'undefined'){
         console.warn("Chart.js não carregado. Plugin 'titleAutoWrap' não registrado.");
    }
}


  
  // -- Modal --
  const createOverlay = () => {
    let overlay = document.querySelector('.modal-overlay.modal-component');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'modal-overlay modal-component';
        document.body.appendChild(overlay);
    }
    overlay.innerHTML = ""; // Limpa conteúdo anterior
    overlay.style.display = 'block';
    return overlay;
  };
  
  const closeModal = (overlay) => {
    if (overlay) {
      overlay.style.display = 'none';
      overlay.innerHTML = ''; // Limpa para liberar memória
    }
  };

  const createEl = (tag, { classes = [], attributes = {}, text = '', html = '' } = {}) => {
    const el = document.createElement(tag);
    if (classes.length) el.classList.add(...classes.filter(Boolean));
    Object.entries(attributes).forEach(([key, value]) => {
        if (value !== null && value !== undefined) el.setAttribute(key, value);
    });
    if (text) el.textContent = text;
    if (html) el.innerHTML = html;
    return el;
};
  
  // -- HTML Building Helpers --
  const buildOptions = (optionsArray, selectedValue, defaultValue) => {
    const effectiveValue = selectedValue ?? defaultValue;
    return optionsArray.map(opt =>
      `<option value="${opt}" ${effectiveValue === opt ? 'selected' : ''}>${opt.charAt(0).toUpperCase() + opt.slice(1)}</option>`
    ).join('');
  };


  const buildInput = (type, id, value, label, options = {}) => {
    // Espera atributos em options.props, como { props: { min: "0", step: "1" } }
    const props = Object.entries(options.props || {}).map(([k, v]) => `${k}="${v}"`).join(' '); // Usa options.props

    // Determina 'checked' para checkboxes
    const checkedProp = (type === 'checkbox' && value) ? 'checked' : '';
    // Define 'value' apenas para tipos que o utilizam diretamente
    const valProp = (type !== 'checkbox' && type !== 'select' && value !== null && value !== undefined) ? `value="${value}"` : '';

    let inputHtml;
    if (type === 'select') {
        // Para select, usa options.optionHTML para o conteúdo interno
        inputHtml = `<select id="${id}" ${props}>${options.optionHTML || ''}</select>`;
    } else {
        // Para outros inputs
        inputHtml = `<input type="${type}" id="${id}" ${valProp} ${props} ${checkedProp}>`;
    }

    // Cria o label e o grupo
    const labelFor = `for="${id}"`; // Sempre usar 'for' no label
    return `<div class="settings-group"><label ${labelFor}>${label}:</label>${inputHtml}</div>`;
  };
  
  // -- Aplicação de Ações (Apply/Reset) --
  // (Adaptado para receber o objeto de configurações diretamente no actionFn)
  const applyScopedAction = (chartTypePrefix, targetInstance, scope, actionFn) => {
      const applyFn = instance => actionFn(instance); // actionFn agora recebe só a instância
  
      if (scope === 'this') {
          if (targetInstance) { // Verifica se a instância alvo existe
               applyFn(targetInstance);
          } else {
              console.warn(`applyScopedAction: Target instance for prefix ${chartTypePrefix} not provided or invalid.`);
          }
      } else if (scope === 'all') {
          Object.keys(window.charts || {})
              .filter(key => key.startsWith(chartTypePrefix))
              .forEach(key => {
                  const instance = window.charts[key];
                  if (instance) {
                      applyFn(instance);
                  } else {
                       console.warn(`applyScopedAction: Instance ${key} not found during 'all' scope application.`);
                  }
              });
      } else {
           console.error(`applyScopedAction: Invalid scope "${scope}". Use 'this' or 'all'.`);
      }
  };
  
  
  // ==== Plugin Chart.js para Porcentagens (Compartilhado) ====
  const percentPlugin = {
    id: 'percentPlugin',
    afterDatasetsDraw: chart => {
      const { ctx, options, data: { labels } } = chart;
      const pctColor = options.percent_text_color ?? options.plugins?.percent_text_color ?? defaultBarSettings.percent_text_color ?? 'black';
      const pctFont = options.percentFontSize ?? options.plugins?.percentFontSize ?? safeGet(options, 'fontsize.1', 10);
  
      // Verifica se é gráfico de barras empilhadas
      if (chart.config.type !== 'bar' || !safeGet(chart.options, 'scales.x.stacked')) {
          return; // Não aplica em outros tipos ou não empilhados
      }
  
      labels.forEach((_, idx) => {
        // Soma total para a barra no índice 'idx'
        const total = chart.data.datasets.reduce((sum, dataset) => {
          // Considera apenas datasets visíveis
          const meta = chart.getDatasetMeta(dataset.index);
          if (!meta.hidden && dataset.data[idx] !== undefined && dataset.data[idx] !== null) {
            return sum + Math.abs(parseFloat(dataset.data[idx]) || 0);
          }
          return sum;
        }, 0);
  
        if (total <= 0) return; // Evita divisão por zero e barras sem valor
  
        // Encontra os 2 maiores segmentos (visíveis)
        const segments = chart.data.datasets
          .map((ds, i) => ({ value: ds.data[idx], datasetIndex: i, label: ds.label, hidden: chart.getDatasetMeta(i).hidden }))
          .filter(seg => !seg.hidden && seg.value > 0) // Considera apenas visíveis e com valor > 0
          .sort((a, b) => b.value - a.value)
          .slice(0, 2); // Pega os dois maiores
  
        segments.forEach(seg => {
          const bar = chart.getDatasetMeta(seg.datasetIndex)?.data[idx];
          if (bar) {
            const { x: centerX, base, y: barY } = bar;
            const barHeight = Math.abs(base - barY);
            // Só exibe se a altura da barra for suficiente (ex: > 10 pixels)
            // E se o valor for significativo (ex: > 5%)
            if (barHeight > 10 && seg.value > 5) {
                const centerY = (barY + base) / 2;
                ctx.save();
                ctx.fillStyle = pctColor;
                ctx.font = `${pctFont}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                // Arredonda para inteiro para exibição
                ctx.fillText(`${Math.round(seg.value)}%`, centerX, centerY);
                ctx.restore();
            }
          }
        });
      });
    }
  };
  
  // Garante que o plugin seja registrado apenas uma vez
  if (typeof Chart !== 'undefined' && !Chart.registry.plugins.get('percentPlugin')) {
    Chart.register(percentPlugin);
  } else if (typeof Chart === 'undefined') {
      console.warn("Chart.js não carregado. Plugin 'percentPlugin' não registrado.");
  }