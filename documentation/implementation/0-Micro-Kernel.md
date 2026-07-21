# Documentação Técnica de Engenharia: Holds Micro-Kernel (Estágio 0)

## Visão Geral da Arquitetura de Baixo Nível

O Micro-Kernel tem um único objetivo: provar e sustentar a topologia matemática do sistema antes que qualquer linguagem de alto nível (como H-Cypher) seja introduzida. Para atingir a escala de hipergrafos contínuos sem colapso de memória, a implementação repudia o uso de ponteiros tradicionais (como `Box<T>` ou `Rc<T>` no Rust) e adota um modelo de **Memória Orientada a Dados (Data-Oriented Design)**.

---

## 1. Alocador de Memória Contígua (Arena Allocator)

Linguagens tradicionais sofrem de *Pointer Chasing* (perseguição de ponteiros), onde a CPU perde ciclos valiosos buscando nós espalhados aleatoriamente na memória RAM (Cache Miss). O Holds resolve isso empacotando todo o hipergrafo em um único vetor sequencial (Arena).

### Especificação de Estrutura (Rust)

```rust
// Usamos u32 em vez de usize ou ponteiros de 64 bits para economizar 50% de RAM.
// Um limite de 4.2 bilhões de nós por Arena/Membrana local é suficiente para o Wasm.
pub type NodeId = u32;

/// Primitivas Topológicas estritas do Holds.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum Topology {
    /// Átomos: Dados brutos e folhas do grafo.
    Atom(Vec<u8>), 
    
    /// Adjacências: Arestas M:N que conectam múltiplos nós.
    /// Não têm direção estrita nativa, a semântica define o fluxo.
    Adjacency(Vec<NodeId>), 
    
    /// Membranas: Escopos de domínio (Agrupamentos).
    Membrane(Vec<NodeId>), 
}

/// A Arena Contígua. O verdadeiro "Banco de Dados" em tempo de execução.
pub struct HypergraphArena {
    /// O vetor plano onde todos os nós residem fisicamente.
    nodes: Vec<Topology>,
}

impl HypergraphArena {
    pub fn new() -> Self {
        HypergraphArena {
            // Pré-alocação agressiva para evitar realocações durante o bootstrap
            nodes: Vec::with_capacity(1_000_000), 
        }
    }

    /// Método interno inseguro (sem deduplicação) - uso restrito ao motor de Identidade.
    fn allocate_raw(&mut self, topo: Topology) -> NodeId {
        let id = self.nodes.len() as NodeId;
        self.nodes.push(topo);
        id
    }
}

```

**Decisão de Design:** Ao usar índices `u32`, a serialização do grafo para transmissão na rede P2P torna-se trivial. Um "ponteiro" é apenas um número inteiro, o que significa que o grafo inteiro pode ser copiado em bloco de memória (`memcpy`) sem quebrar referências.

---

## 2. Motor de Identidade Estrutural e Deduplicação ($H_{id}$)

O Holds opera sob o princípio de que "a forma é a identidade". Não existem dois nós com o mesmo conteúdo físico na memória. Se mil regras pedem a criação da adjacência `[A, B, C]`, o sistema deve alocá-la apenas uma vez e retornar o mesmo `NodeId` para todas (Padrão *Flyweight*).

### Lógica de Canonicalização e Hashing

Para calcular o $H_{id}$, utilizamos uma função de hash criptográfica rápida (como **BLAKE3**). O identificador estrutural de um nó $N$ é definido recursivamente:

$$H_{id}(N) = \text{BLAKE3}(\text{Tipo} \oplus \text{Dados} \oplus \text{Sort}(\sum H_{id}(\text{Filhos})))$$

*Nota Crítica:* Para coleções não ordenadas (como algumas Adjacências), os hashes dos filhos devem ser **ordenados** antes de hashear o pai, garantindo uma representação canônica única.

### Especificação de Implementação (Rust)

```rust
use std::collections::HashMap;
use blake3::Hash;

pub struct IdentityEngine {
    arena: HypergraphArena,
    // Tabela de Interning: Mapeia o Hash Topológico exato para sua localização física (NodeId)
    intern_pool: HashMap<Hash, NodeId>,
}

impl IdentityEngine {
    /// O único ponto de entrada para criar estruturas no Holds.
    pub fn intern(&mut self, topo: Topology) -> NodeId {
        let hash = self.compute_hash(&topo);

        // Deduplicação O(1): Se a estrutura já existe, retorne o ponteiro existente.
        if let Some(&existing_id) = self.intern_pool.get(&hash) {
            return existing_id;
        }

        // Se não existe, aloca fisicamente e registra na tabela.
        let new_id = self.arena.allocate_raw(topo);
        self.intern_pool.insert(hash, new_id);
        
        new_id
    }

    fn compute_hash(&self, topo: &Topology) -> Hash {
        let mut hasher = blake3::Hasher::new();
        match topo {
            Topology::Atom(data) => {
                hasher.update(b"ATOM");
                hasher.update(data);
            },
            Topology::Adjacency(children) | Topology::Membrane(children) => {
                let prefix = if matches!(topo, Topology::Adjacency(_)) { b"ADJ" } else { b"MEM" };
                hasher.update(prefix);
                
                // Extrai os hashes dos filhos, ordena para garantir canonicalização
                let mut child_hashes: Vec<Hash> = children.iter()
                    .map(|&id| self.get_hash_by_id(id)) // Busca O(1) na tabela reversa
                    .collect();
                
                child_hashes.sort_unstable(); // Ordenação essencial para isomorfismo
                
                for ch in child_hashes {
                    hasher.update(ch.as_bytes());
                }
            }
        }
        hasher.finalize()
    }
}

```

---

## 3. Avaliador Primitivo e Motor de Reescrita ($L \implies R$)

Com a memória deduplicada, o sistema precisa processar mutações de estado sem ferir a imutabilidade subjacente. A reescrita topológica é a mecânica de identificar um isomorfismo de subgrafo ($L$) e instanciar sua transformação ($R$).

O algoritmo não "apaga" $L$. Ele constrói $R$ na arena (reaproveitando nós inalterados via deduplicação) e move o ponteiro da membrana raiz para a nova estrutura.

### Especificação de Execução (Rust)

```rust
/// Representa o mapeamento de variáveis de ligação (Bindings) capturadas no lado Esquerdo (L).
type BindingMap = HashMap<String, NodeId>;

pub struct PrimitiveEvaluator<'a> {
    engine: &'a mut IdentityEngine,
}

impl<'a> PrimitiveEvaluator<'a> {
    /// Executa a reescrita A => B. Retorna o ID da nova topologia raiz.
    pub fn evaluate_rewrite(&mut self, root_id: NodeId, rule_l: &Pattern, rule_r: &Pattern) -> Result<NodeId, &'static str> {
        let mut bindings = BindingMap::new();

        // 1. MATCH: Tenta casar o padrão L com o subgrafo atual.
        if self.match_subgraph(root_id, rule_l, &mut bindings) {
            // 2. TRANSFORM: Se casou, gera a nova topologia R baseada nos bindings capturados.
            let new_root = self.inject_subgraph(rule_r, &bindings);
            
            // 3. INJECT RESIDUE: Cria a trilha causal para permitir viagem no tempo.
            self.create_residue_edge(root_id, new_root);

            Ok(new_root)
        } else {
            Err("Pattern matching failed: Divergence detected.")
        }
    }

    /// Resolve recursivamente o isomorfismo.
    fn match_subgraph(&self, current: NodeId, pattern: &Pattern, bindings: &mut BindingMap) -> bool {
        // [Lógica omitida por brevidade]:
        // Compara recursivamente a estrutura de 'current' com 'pattern'.
        // Se 'pattern' for uma variável (ex: 'x'), salva `bindings.insert("x", current)`.
        // Retorna true se a geometria for exatamente igual.
        true 
    }

    /// Instancia a nova topologia utilizando a deduplicação absoluta do motor.
    fn inject_subgraph(&mut self, pattern: &Pattern, bindings: &BindingMap) -> NodeId {
        // [Lógica omitida por brevidade]:
        // Para cada instrução no 'pattern' direito, busca o valor em 'bindings'.
        // Constrói as instâncias chamando `self.engine.intern(Topology::...)`.
        // Retorna o NodeId do nó de mais alto nível criado.
        0 // ID fictício
    }
}

```

### Mecânica de Resiliência (`sys::residue`)

Após uma transição de estado, o nó antigo (raiz de $L$) fica orfão na árvore de projeção atual. O kernel injeta um `Topology::Adjacency` especial (o resíduo) ligando a raiz antiga à nova, carimbado com um hash temporal. Isso significa que *viagens no tempo* são literais no Holds: você pode percorrer a aresta de resíduo no sentido reverso para carregar o hipergrafo exato de 10 minutos atrás na UI.