# Implementation Plan: Generic TextMate-based Editor, Indexer, and Autocomplete Widget

**Track ID:** `editor_abstraction_20260814`  
**Título:** Generic TextMate-based Editor, Indexer, and Autocomplete Widget  

---

## 🛠️ FASE 1: Fundações, Parser TextMate e Renderização (TDD)
O objetivo desta fase é criar o analisador léxico baseado no padrão TextMate e o container visual esteticamente isolado de digitação.

### 1.1 [x] Task: Testes Unitários de Tokenização TextMate
* **Descrição:** Criar testes unitários rápidos que validem a leitura de arquivos JSON de gramática e a quebra correta de strings em tokens com escopos semânticos.
* **Teste Automatizado:** `node test-textmate-parser.js`
* **Documentação:** Criar seção explicativa em `ui/src/lib/TextMateLexer.md`.

### 1.2 [x] Task: Implementar Analisador Léxico TextMate (`TextMateLexer.ts`)
* **Descrição:** Construir o analisador leve em TypeScript que traduz expressões regulares recursivas e repositórios de padrões do padrão `.tmLanguage.json` em blocos de estilização CSS nativos.
* **Critério de Conclusão:** O arquivo `TextMateLexer.ts` compila sem warnings e passa em todos os testes unitários da Task 1.1.

### 1.3 [x] Task: Construir o Componente Base `CyberEditor.svelte`
* **Descrição:** Criar a estrutura HTML/CSS de sobreposição de camadas. Integrar o `TextMateLexer.ts` para colorizar em tempo real o texto digitado na camada de destaque por trás da `textarea` invisível.
* **Teste Automatizado:** `node test-dom-render.js` (atualizado para instanciar o novo editor headless).
* **Documentação:** Seção dedicada ao funcionamento das camadas em `ui/src/lib/CyberEditor.md`.

### 1.4 [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
* **Descrição:** Validação manual da digitação em zoom e redimensionamento, confirmando alinhamento de pixel entre a textarea e os destaques CSS no navegador.

---

## 🧭 FASE 2: Indexador Semântico e Painel de Autocompletação (TDD)
O objetivo desta fase é rastrear o vocabulário semântico digitado e projetar as sugestões em um popover acompanhando as coordenadas do cursor.

### 2.1 [x] Task: Testes de Indexação e Coordenadas do Caret
* **Descrição:** Escrever testes que validem o scanner de símbolos (extraindo termos por escopo de tag) e a função matemática que traduz o índice do caractere em coordenadas `(X, Y)` na tela.
* **Teste Automatizado:** `node test-semantic-indexer.js`
* **Documentação:** Descrição da lógica de posicionamento geométrico do caret em `ui/src/lib/CaretGeometry.md`.

### 2.2 [x] Task: Implementar Indexador Híbrido Reativo (Svelte 5 Runes)
* **Descrição:** Criar o helper reativo que monitora a string de texto, extrai e agrupa identificadores únicos (como nós e membranas) em dicionários de autocompletação baseando-se em seus escopos semânticos.
* **Critério de Conclusão:** Os testes de `test-semantic-indexer.js` passam com 100% de sucesso.

### 2.3 [x] Task: Painel Flutuante e Navegação por Teclado
* **Descrição:** Criar a interface flutuante do autocompleter. Adicionar escutadores de eventos de teclado (`keydown`) na `textarea` para interceptar as setas direcionais, selecionar e aplicar as palavras-chave sugeridas in-place com retorno de foco.
* **Teste Automatizado:** `node test-dom-render.js` (verificando injeção de texto).

### 2.4 [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
* **Descrição:** Validação de renderização e foco do autocomplete ao digitar `:`, `[`, `(`, `#`.

---

## 🎨 FASE 3: Color Picker Popover, Integração Holds e Controle de Débito (TDD)
O objetivo desta fase é integrar o seletor de cores, substituir o editor antigo H-Cypher e validar as margens de performance.

### 3.1 [x] Task: Testes de Popover de Cores
* **Descrição:** Escrever testes que validem a detecção por regex de strings hexadecimais de cor e a renderização do gatilho popover sobre o local das coordenadas do texto.
* **Teste Automatizado:** `node test-color-popover.js`

### 3.2 [x] Task: Implementar Popover Flutuante com Color Picker In-Place
* **Descrição:** Construir a tooltip flutuante de hover sobre códigos hexadecimais de cor. Injetar o elemento `<input type="color">` de forma oculta/estilizada para alterar o texto da textarea in-place.
* **Critério de Conclusão:** Os testes em `test-color-popover.js` passam com sucesso.

### 3.3 [x] Task: Integração de Dicionário e Gramática H-Cypher no Holds
* **Descrição:** Escrever o arquivo `hcypher.tmLanguage.json` contendo a gramática estrita do Holds. Substituir `HCypherEditor.svelte` por `CyberEditor.svelte` alimentado por essa gramática e mapeado para o `workspaceState` do nosso projeto!
* **Teste Automatizado:** `npm test` (toda a nossa suíte de testes de regressão doHolds deve continuar passando limpa!).

### 3.4 [x] Task: Mitigação de Riscos de Performance de Longos Arquivos (Gargalo FinOps/Tech Debt)
* **Descrição:** Adicionar proteção de paginação virtual ou de throttling na análise léxica do Svelte para arquivos gigantes de texto (acima de 5.000 linhas), impedindo que digitações intensas travem a thread principal do navegador.
* **Critério de Conclusão:** Testes de latência de digitação sob arquivos massivos de texto mostram tempo de execução estável abaixo de 8ms por frame.

### 3.5 [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
* **Descrição:** Validação final e build de produção completo do Vite com 0 warnings.
