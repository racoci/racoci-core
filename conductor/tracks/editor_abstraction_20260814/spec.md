# Specification: Generic TextMate-based Editor, Indexer, and Autocomplete Widget

**Track ID:** `editor_abstraction_20260814`  
**Título:** Generic TextMate-based Editor, Indexer, and Autocomplete Widget  
**Fronteira:** `ui/src/lib/` (Reutilizável)  

---

## 1. Visão Geral (Overview)
Abstrair a implementação do editor de texto altamente acoplado `HCypherEditor.svelte` em um componente genérico, reutilizável e de alto desempenho chamado **`CyberEditor.svelte`**. 

Este componente será alimentado por um arquivo JSON compacto que segue o padrão da indústria **TextMate Grammar (`.tmLanguage.json`)** para definir sintaxe e escopos semânticos. Ele indexará em tempo real as palavras digitadas baseando-se nesses escopos, exibirá sugestões inteligentes de autocomplete em um painel flutuante acompanhando o cursor (`caret`), e oferecerá um **seletor de cores nativo (Color Picker)** in-place através de popups flutuantes ao interagir com códigos hexadecimais de cores.

---

## 2. Requisitos Funcionais (Functional Requirements)

### 2.1 Colorização por Gramática TextMate (`.tmLanguage.json`)
* O componente receberá uma propriedade `grammar` contendo as regras lidas de um arquivo `.tmLanguage.json` compacto.
* Um analisador léxico local e leve em JavaScript processará o texto com base no dicionário de padrões de expressão regular e nos escopos semânticos do arquivo de gramática (ex: `entity.name.node.hcypher`, `keyword.control.hcypher`, `comment.line.double-slash`).
* O editor manterá uma sobreposição visual de camadas (`textarea` invisível de edição à frente, camada `.highlights` de exibição formatada atrás), preservando sincronia absoluta de tamanho de fonte, largura de caractere, padding de bordas e rolagem de scroll.

### 2.2 Indexador Híbrido Reativo (Svelte 5 Runes)
* Um analisador em segundo plano lerá as atualizações de texto e rastreará os símbolos correspondentes aos escopos de identificadores (como `entity.name.node.hcypher` para nós, `entity.name.membrane.hcypher` para membranas).
* Esse índice criará um banco de dados local temporário contendo todos os termos lidos organizados por categoria.
* O componente poderá receber sugestões estáticas adicionais via propriedade (ex: palavras-chave, funções de API externa).

### 2.3 Painel Flutuante de Autocompletação (Autocomplete Overlays)
* O painel de autocomplete surgirá de forma flutuante logo abaixo da posição atual do cursor de texto (obtendo as coordenadas em pixel `(X, Y)` relativas ao caractere sob edição).
* Ele será ativado automaticamente ao digitar prefixos ou gatilhos de sintaxe (como `:`, `[`, `(`, `#`).
* **Experiência de Navegação:**
  * Teclas de seta `Up/Down` movem o foco entre as sugestões.
  * Tecla `Enter` ou `Tab` confirma e insere o termo selecionado no cursor.
  * Tecla `Escape` fecha o painel de sugestões.

### 2.4 Popover Flutuante com Color Picker In-Place
* O editor detectará automaticamente a presença de códigos de cores hexadecimais no texto (padrão regex: `#[0-9a-fA-F]{6}`).
* Ao passar o mouse (hover) ou posicionar o cursor sobre o código de cor:
  * Uma pequena tooltip flutuante será aberta diretamente acima do texto.
  * Ela exibirá um preview redondo da cor ativa e um botão de ação.
  * Clicar no preview abrirá o seletor de cores nativo do sistema operacional (`<input type="color">`).
  * Mudar a cor no seletor atualizará o código hexadecimal diretamente no texto em tempo de digitação, sincronizando todas as visualizações (2D/3D) na mesma hora!

---

## 3. Critérios de Aceitação (Acceptance Criteria)
1. **Compilação Perfeita:** O projeto Svelte 5 compila com 0 erros e 0 warnings no Vite.
2. **Estabilidade de Layout:** A sobreposição de texto em tempo de edição deve ser perfeita, sem desalinhamentos em zoom do navegador de 80% a 150%.
3. **Não-Bloqueante:** O indexador híbrido roda de forma assíncrona, mantendo a digitação no editor suave a 60 FPS estáveis mesmo com arquivos grandes.
4. **Fidelidade de Autocomplete:** A seleção e inserção de sugestões atualiza a string de texto no cursor sem perder a posição do foco da digitação.

---

## 4. Fora de Escopo (Out of Scope)
* Suporte completo a regex com retrocesso (Oniguruma completo de C++) que exija dependências pesadas de WebAssembly fora do kernel de Rust. (Utilizaremos um subconjunto ultra-veloz baseado nas regex nativas de JS).
