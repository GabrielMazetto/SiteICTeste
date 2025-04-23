/* help-tooltips.js */
/* Gerencia a exibição de balões de ajuda (tooltips) ao passar o mouse sobre ícones específicos. */

(function() { // IIFE para evitar poluição global

    // --- 1. Central de Textos de Ajuda ---
    // Adicione ou modifique chaves e textos conforme necessário.
    // A 'chave' deve corresponder ao valor do atributo 'data-help-key' no HTML.
    const helpTexts = {
        // --- Geral ---
        obterForms:"Modelos dos formulários (Microsoft Forms). Para obter sua própria cópia editável e aplicar o questionário: 1. Clique no link do grupo desejado. 2. Na página que abrir, clique em 'Duplicar este formulário'. 3. Entre com sua conta Microsoft. Não tem? Clique em 'Crie uma!' (gratuito) e siga os passos de criação de conta. 4. A cópia estará salva em seus Forms.",
        obterTabelaConsulta: "Clique no botão 'Obter Tabela' para baixar um modelo (.xlsx) da 'Tabela de Consulta' ou para poder utilizar a tabela base.",
        arquivosSeparados: "Use esta opção se você possui a 'Tabela de Consulta' e os arquivos de respostas de cada grupo (Estudantes, Familiares, etc.) em arquivos Excel (.xlsx) ou CSV (.csv) separados. Pelo menos a Tabela de Consulta e um arquivo de respostas são necessários.",
        arquivoCompleto: "Use esta opção se você já salvou todas as informações e configurações anteriormente em um único arquivo. Isso restaurará o estado anterior, incluindo informações da escola e configurações de gráficos.",
        tabelaConsulta: "Esta tabela é o 'mapa' que conecta as perguntas dos formulários aos indicadores e gráficos corretos. Ela guia a organização dos dados.",

        baixarJson: "Salva todos os dados e configurações atuais em um único arquivo. Este arquivo pode ser carregado na página anterior (em 'Importar Todos os Dados de Uma Vez') para restaurar esta sessão rapidamente.",
        truncarRotulo: "Encurta automaticamente os textos se forem muito longos.",
        nPalavrasTruncar: "Define quantas palavras mostrar antes de encurtar o texto (requer 'Truncar Rótulos' ativado).",
        largMaxRotulo: "Define a largura máxima para o nome da categoria antes de quebrar a linha ou encurtar.",
        adjustScale: "Aplica um 'zoom' automático no gráfico se os resultados estiverem concentrados em valores baixos, facilitando a visualização das diferenças.",

        
    };

    // --- 2. Criação e Gerenciamento do Tooltip ---
    let tooltipElement = null; // Guarda referência ao tooltip ativo

    function createTooltip(targetElement, helpKey) {
        // Remove qualquer tooltip existente
        removeTooltip();

        const text = helpTexts[helpKey];
        if (!text) {
            console.warn(`Help text not found for key: ${helpKey}`);
            return; // Não mostra tooltip se o texto não for encontrado
        }

        // Cria o elemento tooltip
        tooltipElement = document.createElement('div');
        tooltipElement.className = 'help-tooltip'; // Classe para estilização
        tooltipElement.textContent = text; // Define o texto
        tooltipElement.style.position = 'absolute'; // Necessário para posicionamento
        tooltipElement.style.zIndex = '1001'; // Garante que fique acima de outros elementos (ajuste se necessário)

        // Adiciona ao corpo do documento (ou a um container específico se preferir)
        document.body.appendChild(tooltipElement);

        // Posiciona o tooltip
        positionTooltip(targetElement);
    }

    function positionTooltip(targetElement) {
        if (!tooltipElement) return;

        const targetRect = targetElement.getBoundingClientRect();
        const tooltipRect = tooltipElement.getBoundingClientRect();
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;

        // Posicionamento padrão: abaixo e centralizado/ligeiramente à direita do ícone
        let top = targetRect.bottom + scrollY + 5; // 5px abaixo do ícone
        let left = targetRect.left + scrollX + (targetRect.width / 2) - (tooltipRect.width / 2); // Centralizado

        // Ajuste básico para não sair da tela (pode ser melhorado)
        // Verifica se sai pela direita
        if (left + tooltipRect.width > window.innerWidth) {
            left = window.innerWidth - tooltipRect.width - 10; // 10px de margem da direita
        }
        // Verifica se sai pela esquerda
        if (left < 0) {
            left = 10; // 10px de margem da esquerda
        }
         // Verifica se sai por baixo (menos comum de ajustar, mas possível)
         if (top + tooltipRect.height > window.innerHeight + scrollY) {
             // Tenta posicionar acima
             top = targetRect.top + scrollY - tooltipRect.height - 5; // 5px acima
         }

        tooltipElement.style.top = `${top}px`;
        tooltipElement.style.left = `${left}px`;
        tooltipElement.style.opacity = '1'; // Garante visibilidade após posicionar
    }

    function removeTooltip() {
        if (tooltipElement) {
            tooltipElement.remove();
            tooltipElement = null;
        }
    }

    // --- 3. Event Listeners (Delegação) ---
    // Escuta eventos no 'body' para capturar interações com ícones de ajuda,
    // mesmo que eles sejam adicionados dinamicamente.
    document.body.addEventListener('mouseover', (event) => {
        // Encontra o elemento .help-icon mais próximo que foi alvo do evento
        const helpIcon = event.target.closest('.help-icon');
        if (helpIcon) {
            const helpKey = helpIcon.getAttribute('data-help-key');
            if (helpKey) {
                createTooltip(helpIcon, helpKey);
            }
        }
    });

    document.body.addEventListener('mouseout', (event) => {
        // Remove o tooltip se o mouse sair do ícone de ajuda
        const helpIcon = event.target.closest('.help-icon');
        // Verifica se o mouse não está indo para o próprio tooltip (relatedTarget)
        // Isso permite que o tooltip permaneça se o mouse se mover brevemente para ele.
        // No entanto, para simplicidade, removeremos ao sair do ícone.
        // Para manter o tooltip ao passar sobre ele, a lógica seria mais complexa.
         if (helpIcon) {
             // Verifica se o mouse está realmente saindo da área do ícone e não indo para o tooltip
             // (Esta verificação pode ser um pouco complexa, vamos simplificar por agora)
              removeTooltip(); // Remove ao sair do ícone
         }
    });

    // Opcional: Remover tooltip se o usuário clicar em qualquer lugar
    document.body.addEventListener('click', removeTooltip, true); // Usa captura para pegar antes

    console.log("Help Tooltips script initialized.");

})();