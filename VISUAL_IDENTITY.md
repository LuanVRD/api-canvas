# Identidade Visual Portátil — Technical Dark UI

> Este documento é uma especificação visual e também uma instrução para agentes de IA. Ele deve ser copiado para a raiz de qualquer projeto front-end cujo produto precise reproduzir a identidade visual do ApiCanvas. A implementação é independente de framework: funciona com HTML/CSS, React, Vue, Angular, Svelte, Flutter Web ou qualquer biblioteca de componentes.

## 1. Contrato de execução para a IA

Ao criar, alterar ou revisar qualquer interface neste projeto, siga este documento como fonte de verdade visual.

- Preserve a linguagem **dark, técnica, compacta, sóbria e orientada a dados**.
- Use os tokens definidos aqui; não introduza cores, raios, sombras, tamanhos ou espaçamentos arbitrários.
- Adapte a estrutura ao produto e ao framework atual, mas não mude a personalidade visual.
- Reutilize componentes existentes antes de criar variações.
- Quando o projeto já possuir um design system, aplique estes valores por tema/tokens, sem acoplar a solução a uma biblioteca específica.
- Se um detalhe não estiver especificado, escolha a alternativa mais discreta, densa e funcional.
- Priorize legibilidade, hierarquia, consistência e velocidade de uso. Decoração é secundária.
- Não copie conceitos de domínio que não façam sentido. Os badges de métodos HTTP, por exemplo, são uma extensão opcional; os princípios visuais são obrigatórios.
- Não altere regras de negócio, conteúdo ou arquitetura apenas para aplicar a identidade visual.

Palavras normativas neste arquivo:

- **DEVE / NÃO DEVE**: regra obrigatória.
- **PREFIRA**: padrão recomendado; desvie apenas por uma necessidade real do produto.
- **PODE**: recurso opcional compatível com a identidade.

## 2. Essência da identidade

A interface deve parecer uma ferramenta profissional de trabalho, não uma landing page promocional. A referência mental é um ambiente de desenvolvimento moderno: fundo grafite profundo, superfícies em camadas próximas, bordas finas, texto claro, azul para foco/navegação e cores semânticas controladas.

### Atributos centrais

1. **Técnica** — dados, identificadores, atalhos, tipos, caminhos e metadados usam tipografia monoespaçada.
2. **Compacta** — controles têm 26–36 px de altura; texto de interface fica majoritariamente entre 11 e 14 px.
3. **Plana** — a separação acontece por bordas e mudança sutil de superfície, não por sombras ou gradientes.
4. **Hierárquica** — o contraste do texto comunica importância: primário, secundário e muted.
5. **Semântica** — cores fortes aparecem apenas para ação, seleção, status, alerta ou informação de domínio.
6. **Rápida** — feedback de hover/focus ocorre em 80–150 ms; animações são curtas e funcionais.
7. **Precisa** — raios pequenos, alinhamento rigoroso, espaçamentos em uma base de 4 px e ícones discretos.

### Impressão desejada

`confiável` · `engenharia` · `controle` · `clareza` · `densidade` · `baixo ruído`

### Impressão a evitar

`lúdica` · `orgânica` · `luxuosa` · `neon` · `glassmorphism` · `marketing` · `excessivamente espaçosa`

## 3. Tokens canônicos

Estes valores são a base visual. Os nomes podem ser adaptados à convenção do projeto, mas seus papéis e valores devem ser preservados.

```css
:root {
  color-scheme: dark;

  /* Superfícies */
  --canvas-bg: #0d1117;
  --canvas-surface: #161b22;
  --canvas-surface-elevated: #21262d;
  --canvas-border: #30363d;
  --canvas-border-subtle: #21262d;

  /* Texto */
  --canvas-text-primary: #e6edf3;
  --canvas-text-secondary: #8b949e;
  --canvas-text-muted: #6e7681;
  --canvas-text-link: #58a6ff;

  /* Estados */
  --color-success: #2ea043;
  --color-warning: #bb8009;
  --color-danger: #da3633;
  --color-info: #1f6feb;

  /* Ações */
  --action-primary: #238636;
  --action-primary-hover: #2ea043;
  --action-primary-text: #ffffff;
  --action-hover-surface: #282e37;

  /* Tipografia */
  --font-sans: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", Consolas, Monaco, monospace;

  /* Forma */
  --radius-xs: 2px;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;

  /* Movimento */
  --motion-fast: 80ms;
  --motion-base: 120ms;
  --motion-slow: 150ms;
  --ease-standard: ease;
  --ease-enter: cubic-bezier(0.16, 1, 0.3, 1);

  /* Estrutura recorrente */
  --header-height: 48px;
  --control-height-sm: 26px;
  --control-height-md: 28px;
  --control-height-lg: 32px;
  --control-height-hero: 36px;
}
```

### Camadas de superfície

| Nível | Token | Uso |
|---|---|---|
| 0 | `--canvas-bg` | fundo da aplicação, editores, áreas de código e interior rebaixado |
| 1 | `--canvas-surface` | cards, sidebar, header, painéis e modais |
| 2 | `--canvas-surface-elevated` | itens ativos, cabeçalhos internos, campos, badges neutros e hover |
| Divisor | `--canvas-border-subtle` | divisões internas de baixa ênfase |
| Contorno | `--canvas-border` | borda externa de cards, campos, tabelas e controles |

Não crie muitas camadas intermediárias. A identidade depende de diferenças pequenas, porém consistentes, entre essas três superfícies.

### Cores semânticas

- **Azul `#58a6ff`**: foco, link, seleção, navegação ativa e informação acionável.
- **Verde `#238636` / `#2ea043`**: ação primária positiva e sucesso.
- **Vermelho `#da3633` / `#f85149`**: erro, destruição e conteúdo inválido.
- **Âmbar `#bb8009` / `#d29922`**: atenção, pendência e resposta intermediária.
- **Ciano `#38bdf8`**: segurança, autenticação ou informação técnica especial.
- **Roxo `#a371f7`**: categoria incomum ou desconhecida; use com parcimônia.

Para fundos semânticos, use a mesma cor com opacidade entre `0.08` e `0.15`. Para a borda, use opacidade entre `0.25` e `0.35`. Nunca preencha grandes áreas com uma cor saturada.

## 4. Base global

```css
html,
body {
  height: 100%;
  margin: 0;
  background: var(--canvas-bg);
  color: var(--canvas-text-primary);
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

code,
pre,
kbd,
.font-mono {
  font-family: var(--font-mono);
}

::selection {
  background: rgba(88, 166, 255, 0.28);
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--canvas-bg);
}

::-webkit-scrollbar-thumb {
  background: var(--canvas-border);
  border-radius: var(--radius-sm);
}

::-webkit-scrollbar-thumb:hover {
  background: #484f58;
}
```

## 5. Tipografia

### Família sans-serif

Use Inter quando disponível, com a pilha de sistema como fallback. É a fonte de leitura, navegação, ações, descrições e títulos.

### Família monoespaçada

Use JetBrains Mono ou Fira Code quando disponível. Aplique a mono apenas onde ela comunica natureza técnica:

- código, JSON, logs e saída de console;
- URLs, paths, IDs, versões e valores literais;
- tipos, contagens, atalhos de teclado e metadados;
- badges técnicos e status numéricos.

Não use mono em parágrafos, títulos principais ou ações comuns.

### Escala tipográfica

| Papel | Tamanho | Peso | Observação |
|---|---:|---:|---|
| Título principal de página | 20 px | 600 | tracking de `-0.2px` |
| Título de painel destacado | 18 px | 700 | tracking de `-0.3px` |
| Título secundário | 16 px | 600 | curto e direto |
| Identidade/header | 14–15 px | 600–700 | alta legibilidade |
| Corpo | 13–14 px | 400 | line-height `1.5–1.6` |
| Controle | 12–13 px | 500–600 | botões, linhas e inputs |
| Label/seção | 11 px | 600–700 | uppercase opcional, tracking `0.5–0.6px` |
| Badge/metadado | 9–11 px | 600–700 | mono quando técnico |

Regras:

- Títulos devem ser curtos e funcionais.
- Labels em caixa alta servem apenas para agrupamento e metadados, nunca para parágrafos.
- Use no máximo três níveis de contraste textual numa mesma região.
- Não use pesos 800/900, títulos gigantes ou contraste branco puro em todo o conteúdo.

## 6. Espaçamento e densidade

A grade base é **4 px**. Valores preferenciais:

`2 · 4 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 24 · 28 · 32 · 48`

### Aplicação

- Entre ícone e texto: `4–6px`.
- Entre controles relacionados: `6–10px`.
- Padding de controles: `0 8px`, `0 10px` ou `0 12px`.
- Padding de linha: `6–10px` vertical e `10–14px` horizontal.
- Padding de card/seção: `12–16px`.
- Padding de página: `24–32px` desktop, `16px` mobile.
- Gap entre seções de uma página: `20–24px`.
- Gap interno entre blocos: `10–14px`.

Evite espaços vazios grandes sem função. A densidade deve acomodar informação sem parecer apertada.

## 7. Forma, bordas, elevação e ícones

### Raios

- `2px`: controles segmentados e microbadges.
- `4px`: padrão para botões, inputs, badges, itens e cards pequenos.
- `6px`: painéis, seções técnicas e modais.
- `8px`: limite superior; use raramente.

Não use pills totalmente arredondadas, salvo indicadores circulares de status. Não use raios de 12–24 px.

### Bordas

- Espessura padrão: `1px`.
- Painéis e campos: `--canvas-border`.
- Divisões internas: `--canvas-border-subtle`.
- Seleção pode usar uma borda esquerda azul de `1–3px`.
- Empty states podem usar borda tracejada.

### Sombras

Cards comuns **não devem ter sombra**. Sombras existem apenas quando a posição espacial precisa ficar inequívoca:

- modal: `0 16px 36px rgba(0, 0, 0, 0.5)`;
- drawer lateral: `-4px 0 24px rgba(0, 0, 0, 0.5)`;
- menu flutuante: sombra curta e escura equivalente.

Não use glow, sombra colorida ou múltiplas sombras decorativas.

### Ícones

- Prefira ícones outline/geometricamente simples.
- Tamanho usual: `14–18px`; vazio ou destaque: `24–44px`.
- Ícones herdam a cor do texto; azul e cores semânticas são reservados para significado.
- Ícone sem texto precisa de nome acessível (`aria-label`, tooltip ou equivalente).
- Não use emoji como ícone de interface.

## 8. Layout e composição

### Shell da aplicação

- O fundo ocupa a viewport e evita scroll no shell quando houver áreas internas roláveis.
- Header superior: `48px`, superfície nível 1, borda inferior e padding horizontal de `16px`.
- Conteúdo principal: fundo nível 0 e scroll próprio quando necessário.
- Sidebar: `250px` ideal, mínimo `220px`, máximo `320px`, superfície nível 1 e borda direita.
- Conteúdo legível centralizado: `max-width` entre `1080px` e `1360px`, conforme densidade.

### Composição típica

```text
┌──────────────── header 48px ────────────────┐
│ identidade / contexto        ações / status │
├──────── sidebar ────────┬──── conteúdo ─────┤
│ filtro                  │ título + metadata │
│ navegação compacta      │ seções técnicas   │
│                         │ tabelas / painéis  │
└─────────────────────────┴────────────────────┘
```

- Use bordas e alinhamento para separar regiões.
- Painéis são retangulares e compactos.
- Em workbenches, duas colunas iguais podem ser usadas até `992px`; abaixo disso, empilhe.
- Conteúdo textual longo deve truncar com ellipsis quando estiver em header, linha ou sidebar; ofereça acesso ao valor completo por tooltip ou detalhe.

## 9. Componentes

### 9.1 Botões

Todos os botões devem ser `inline-flex`, centralizados, com gap de `4–6px`, raio de `4px` e transição de `120ms`.

#### Primário

- Altura: `32px` (ou `36px` na ação principal de uma tela simples).
- Fundo: `#238636`; hover: `#2ea043`.
- Texto: branco, `12–13px`, peso `600`.
- Uso: uma ação principal por região; salvar, executar, conectar, confirmar.

#### Secundário

- Altura: `28–32px`.
- Fundo: `--canvas-surface-elevated`.
- Borda: `--canvas-border`.
- Texto: primário ou secundário, `12px`, peso `500`.
- Hover: fundo `#282e37`, borda/texto com mais contraste.

#### Ghost

- Altura: `28px`.
- Fundo e borda transparentes.
- Hover: superfície elevada e borda sutil.
- Uso: ações leves, toolbar e fechar.

#### Destrutivo

- Texto `#f85149`, fundo `rgba(248, 81, 73, 0.12)` e borda `rgba(248, 81, 73, 0.30)`.
- Hover aumenta o fundo para aproximadamente `0.20` de opacidade.
- Nunca use o verde primário para confirmar uma ação destrutiva.

#### Desabilitado

`opacity: 0.5` e `cursor: not-allowed`. O estado não pode depender apenas da cor; mantenha o atributo semântico `disabled`.

### 9.2 Inputs, selects e textareas

- Fundo: `--canvas-surface` ou `--canvas-bg` em filtros embutidos.
- Borda: `1px solid --canvas-border`.
- Raio: `4px`.
- Texto: `12–13px`; valores técnicos podem usar mono.
- Altura compacta: `26–28px`; campo principal pode chegar a `36–40px`.
- Padding horizontal: `8–10px`.
- Placeholder: `--canvas-text-muted`, `11–12px`.
- Focus: borda `--canvas-text-link`; não adicione glow amplo.
- Erro: borda/fundo vermelho translúcido e mensagem curta abaixo do campo.
- Textarea de código: fundo rebaixado, mono `12px`, line-height `1.6`, padding `10px`.

Labels ficam acima do campo ou em uma coluna estável; evite placeholder como único label.

### 9.3 Cards e seções técnicas

- Fundo: `--canvas-surface`.
- Borda: `--canvas-border`.
- Raio: `4–6px`.
- Padding: `12–16px`.
- Sem sombra.
- Cabeçalho interno pode usar superfície elevada, altura `32–44px` e borda inferior.
- Seções irmãs usam gaps de `16–24px`.

### 9.4 Navegação e listas

- Item: padding `7px 10px`, texto `12–13px`, raio `4px`.
- Padrão: fundo transparente e texto secundário.
- Hover: superfície elevada e texto primário.
- Ativo: superfície elevada, texto azul, peso `600`; adicione borda esquerda azul quando útil.
- Linhas clicáveis devem responder a teclado e exibir foco.

### 9.5 Tabelas

- Container com borda, raio pequeno e overflow horizontal.
- Header sticky quando houver rolagem longa.
- Cabeçalho: `11px`, peso `600`, uppercase, tracking `0.5px`, texto secundário.
- Célula: `12px`, padding `6px 12px`, borda inferior sutil.
- Hover de linha: `rgba(255, 255, 255, 0.035)`.
- Tipos, IDs e valores estruturados usam mono.
- Coluna de ações fica estreita (`~90px`) e alinhada à direita.
- Não use zebra striping forte.

### 9.6 Badges e metadados

- Altura visual compacta, padding `1–2px 4–6px`.
- Fonte `9–11px`, geralmente mono, peso `600–700`.
- Raio `2–4px`.
- Badge neutro: superfície elevada, texto muted/secundário, borda sutil.
- Badge semântico: texto saturado, fundo e borda translúcidos da mesma família.
- Não use badges grandes como decoração.

### 9.7 Alertas

- Layout horizontal com ícone, conteúdo e ação opcional.
- Padding `8–12px`, gap `8–10px`, raio `4px`.
- Fundo em opacidade `0.08–0.15`, borda em `0.25–0.35`.
- Título `11–12px` peso `700`; descrição `11–13px`.
- Use `role="alert"` para erros imediatos e `aria-live="polite"` para atualizações não urgentes.

### 9.8 Modais e drawers

- Backdrop: preto com opacidade `0.65–0.75`; blur de `2px` é permitido.
- Modal: largura máxima `660–680px`, altura máxima `90vh`, raio `6px`.
- Header: `44px`, superfície elevada, borda inferior.
- Body: padding `14px`, scroll vertical próprio.
- Footer: ações alinhadas à direita, separadas por borda superior.
- Drawer: preso à lateral, altura total, largura adequada ao conteúdo e máximo de `90vw`.
- Abertura em `120–180ms`; backdrop faz fade e painel usa entrada curta.
- Escape fecha quando seguro; o foco deve ficar contido e retornar ao acionador.

### 9.9 Empty, loading e erro

- Empty state: centralizado, ícone muted, título curto e descrição de uma ou duas linhas.
- Dentro de painel, use padding `24–36px` e borda tracejada quando ajudar a delimitar a área.
- Loading: spinner de borda `2px`, trilha `--canvas-border`, arco azul, rotação linear de `650–800ms`.
- Erro: vermelho semântico, mensagem acionável e opção de tentar novamente quando aplicável.
- Não use skeleton brilhante ou animação chamativa.

### 9.10 Código, JSON e consoles

- Fundo interno: `--canvas-bg`.
- Borda externa: `--canvas-border`.
- Header técnico: `32px`, superfície nível 1, metadados muted e ação de copiar.
- Conteúdo: mono `12px`, line-height `1.5–1.6`, padding `10–12px`.
- Preserve whitespace; quebre palavras apenas quando necessário para impedir overflow.

## 10. Interação e movimento

- Hover de linha: `80ms`.
- Botões, campos e itens: `120–150ms`.
- Modal/drawer: `120–180ms`.
- Anime apenas `background-color`, `border-color`, `color`, `opacity` e pequenos `transform`.
- Um chevron pode deslocar `2px`; não use grandes escalas ou saltos.
- Spinner é a única animação contínua padrão.
- Nunca use transições lentas, bounce, parallax ou animação ornamental.

Inclua redução de movimento:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 11. Responsividade

Breakpoints de referência:

- `> 992px`: workbench pode usar duas colunas.
- `769–992px`: empilhe colunas complexas e reduza padding lateral.
- `≤ 768px`: esconda metadados secundários, transforme linhas complexas em blocos e use padding de página de `16px`.
- `≤ 640px`: esconda tagline e elementos de identidade não essenciais.

Regras universais:

- Preserve a ação principal e o contexto atual antes de esconder elementos.
- Tabelas técnicas podem rolar horizontalmente; não esmague colunas até ficarem ilegíveis.
- Sidebars devem virar drawer, painel recolhível ou navegação superior compacta em telas estreitas.
- Use `min-width: 0` em filhos flex/grid que contenham texto truncável.
- Use `max-width: 90–95vw` em modais e drawers.
- Alvos de toque no mobile devem chegar a pelo menos `40–44px`, mesmo que o visual interno permaneça compacto.

## 12. Acessibilidade

- Contraste deve atender WCAG AA: `4.5:1` para texto comum e `3:1` para texto grande/controles essenciais.
- Todo elemento interativo deve operar por teclado.
- Focus global para controles não textuais:

```css
*:focus-visible:not(input):not(textarea):not(select) {
  outline: 2px solid var(--canvas-text-link);
  outline-offset: 1px;
}
```

- Inputs controlam foco pela borda azul, evitando outline duplicado.
- Cor nunca pode ser o único indicador de erro, sucesso, seleção ou método; combine com texto, ícone, posição ou label.
- Use landmarks (`header`, `nav`, `main`, `aside`), headings em ordem e nomes acessíveis.
- Tabelas visuais devem manter semântica de tabela ou roles equivalentes.
- Modais usam `role="dialog"`, `aria-modal="true"` e título associado.
- Ícones decorativos usam `aria-hidden="true"`.

## 13. Extensão opcional para produtos de API/HTTP

Use apenas quando o domínio tiver métodos HTTP. Em outros produtos, remova esta extensão sem substituir as cores por categorias arbitrárias.

```css
:root {
  --http-get: #3fb950;
  --http-get-bg: rgba(63, 185, 80, 0.12);
  --http-get-border: rgba(63, 185, 80, 0.30);

  --http-post: #58a6ff;
  --http-post-bg: rgba(88, 166, 255, 0.12);
  --http-post-border: rgba(88, 166, 255, 0.30);

  --http-put: #d29922;
  --http-put-bg: rgba(210, 153, 34, 0.12);
  --http-put-border: rgba(210, 153, 34, 0.30);

  --http-patch: #db61a2;
  --http-patch-bg: rgba(219, 97, 162, 0.12);
  --http-patch-border: rgba(219, 97, 162, 0.30);

  --http-delete: #f85149;
  --http-delete-bg: rgba(248, 81, 73, 0.12);
  --http-delete-border: rgba(248, 81, 73, 0.30);
}
```

Badge HTTP: fonte mono `11px`, peso `700`, uppercase, tracking `0.5px`, padding `2px 6px`, borda `1px` e raio `4px`.

## 14. Anti-padrões — não fazer

- Não criar tema claro automaticamente.
- Não usar gradientes, blur generalizado, glassmorphism ou transparência decorativa.
- Não adicionar sombras a cards comuns.
- Não usar border-radius grande ou pills em todo componente.
- Não usar cores saturadas em grandes superfícies.
- Não transformar o azul em cor de preenchimento de todos os botões; a ação primária é verde.
- Não usar fonte mono em toda a aplicação.
- Não aumentar a tipografia para uma escala de landing page.
- Não criar cards excessivamente grandes e vazios.
- Não usar animações acima de `200ms` sem motivo funcional.
- Não depender apenas de hover; inclua focus e estados para touch.
- Não criar variação visual nova quando um componente existente resolve o caso.
- Não expor detalhes do framework na identidade; tokens e regras são agnósticos.

## 15. Processo esperado da IA ao implementar uma tela

1. Identifique o tipo de tela, sua ação primária, regiões de navegação e densidade de dados.
2. Mapeie cada superfície para nível 0, 1 ou 2.
3. Use os tokens canônicos e componentes existentes.
4. Aplique a hierarquia textual antes de adicionar cores.
5. Reserve cores semânticas para significado real.
6. Implemente todos os estados: default, hover, focus-visible, active/selected, disabled, loading, empty, error e success quando aplicáveis.
7. Verifique desktop, `992px`, `768px` e `640px`.
8. Teste navegação por teclado, truncamento, overflow, contraste e redução de movimento.
9. Remova qualquer decoração que não comunique estrutura, interação ou estado.
10. Compare o resultado com o checklist abaixo antes de concluir.

## 16. Checklist de conformidade

### Visual

- [ ] O fundo principal é `#0d1117` e os painéis usam apenas as superfícies definidas.
- [ ] Cards comuns usam borda fina e nenhuma sombra.
- [ ] Raios ficam entre `2px` e `8px`, predominantemente `4px`.
- [ ] A hierarquia de texto usa primário, secundário e muted corretamente.
- [ ] Ação principal é verde; azul representa navegação, foco ou informação.
- [ ] Cores fortes ocupam áreas pequenas e têm significado.
- [ ] Tipografia e controles mantêm densidade compacta.
- [ ] Dados técnicos usam mono; texto humano usa sans.
- [ ] Ícones são simples, pequenos e consistentes.

### Interação

- [ ] Todo controle tem hover e focus-visible.
- [ ] Desabilitado usa semântica real, opacidade e cursor adequado.
- [ ] Loading, empty, error e success estão previstos.
- [ ] Transições ficam entre `80ms` e `180ms`.
- [ ] `prefers-reduced-motion` é respeitado.

### Layout e acessibilidade

- [ ] A grade de espaçamento deriva de 4 px.
- [ ] O layout não quebra em `992px`, `768px` e `640px`.
- [ ] Tabelas e código tratam overflow sem perder legibilidade.
- [ ] Conteúdo flexível usa `min-width: 0` quando necessário.
- [ ] Contraste, teclado, foco, landmarks e nomes acessíveis foram verificados.
- [ ] Modais controlam foco e têm semântica apropriada.

## 17. Prompt curto para iniciar uma implementação

Quando necessário, forneça este texto à IA junto com o arquivo:

> Implemente a interface solicitada seguindo integralmente `VISUAL_IDENTITY.md`. Trate o documento como fonte de verdade visual, preserve os padrões funcionais e arquiteturais do projeto atual e reutilize seus componentes. A solução deve ser responsiva, acessível, completa em estados e independente das tecnologias usadas no documento de referência. Não introduza estilos fora dos tokens sem justificar uma necessidade funcional.

---

Esta especificação descreve a identidade visual observada no ApiCanvas. Ela preserva o núcleo da linguagem visual e separa extensões de domínio, permitindo que o mesmo padrão seja aplicado de forma consistente a qualquer tipo de front-end.
