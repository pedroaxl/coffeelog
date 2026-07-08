# CoffeeLog — Especificação Funcional v1
*App pessoal de gestão de café especial, self-hosted na rede local*

> **Escopo v1 confirmado:** Catálogo de cafés + Doses/Falcon tubes + Etiquetas (Niimbot B1).
> Motor de receitas fica de fora do app na v1 — a discussão e definição de receitas continua acontecendo aqui, comigo, café a café (você manda foto + características, a gente discute juntos). O app registra o resultado dessa conversa como referência (campo de notas), sem motor de regras/versionamento embutido por enquanto.
> Ambiente: Mini PC com Proxmox (containers/VMs) — o app roda como mais um serviço lá. Uso single-user, sem necessidade de autenticação complexa.
> **Idioma:** projeto pensado para ser publicado como open source. A spec e as conversas continuam em português, mas a UI, o código, nomes de variáveis e a documentação do repositório (README etc.) devem ser em inglês. Dados pessoais (nomes de cafés, notas de prova, receitas) ficam no idioma que o Pedro digitar — normalmente português.

---

## 1. Contexto e objetivo

Referência de inspiração: app iOS de catálogo pessoal de cafés com foco em:
- Catálogo de cafés (dados do pacote)
- Autofill por foto (Apple Intelligence)
- Lembretes de descanso pós-torra
- Rastreamento de doses/porções por peso
- Vínculo físico↔digital via NFC/QR em potes
- Dados 100% locais, sem conta/nuvem

Isso cobre bem o "bag to brew" genérico. **O que falta pro seu fluxo** é a parte que você mais faz no dia a dia: construir e iterar **receitas de extração por método/moedor**, com feedback de degustação guiando ajustes. O Coffee Library não tem esse "motor de receita" — ele para na dose, você quer ir até a xícara.

**Diferenciais do CoffeeLog vs. Coffee Library:**
| | Coffee Library | CoffeeLog (seu) |
|---|---|---|
| Hospedagem | App iOS, dados no device | Self-hosted, rede local |
| Acesso | Só iPhone | Web responsivo — celular, tablet, desktop |
| Foco | Catálogo + doses | Catálogo + doses **+ receitas + iteração** |
| Receitas | Não tem | Núcleo do app |
| Etiquetas | NFC stickers proprietários | Integração com Niimbot B1 (QR/código curto) |
| Multi-usuário | N/A | Pode compartilhar na rede de casa |

---

## 2. Modelo de dados (entidades principais)

**Coffee (Café)**
- Nome
- **Origem do grão** (`beanOrigin`): região + país onde foi cultivado
- **Torrefação** (`roastery`): nome + país onde foi torrado (pode ser diferente do país de origem do grão)
- Variedade, processo (natural/washed/honey/anaeróbico...), altitude
- Torra (light/medium/dark), data de torra, data de compra
- Notas de prova declaradas (do rótulo)
- Foto do pacote
- Status: derivado das unidades de armazenamento (disponível / arquivado — sem "descansando/pronto", já que o indicador de descanso foi pro backlog)
- **Score (1–5)**: só pode ser atribuído depois da primeira extração (antes disso fica em branco/não definido) — pra achar rápido "quero algo excepcional hoje" vs. "só um café OK pro dia a dia"
- **Receita atual** (v1 — semi-estruturada, conforme protótipo no Claude Design): campos dedicados para Método, Dose e Moedor+cliques, mais um campo de texto livre para o protocolo (temperatura, bloom, vertidas, meta de dreno). Resultado das conversas aqui no chat sobre cada café novo.

**Storage Unit (unidade de armazenamento)** — substitui o antigo "Batch/Dose"
- Vinculada a um Coffee — **um café pode ter várias unidades simultâneas** (ex: pacote fechado ainda congelado + pacote aberto descongelado em uso + 5 tubos Falcon congelados)
- Tipo: `pacote` ou `tubo Falcon`
- Peso — **variável por unidade individual** (ex: 2 tubos com 20g e 3 tubos com 15g do mesmo café)
- **Estado, conforme o tipo**:
  - **Pacote**: duas dimensões independentes — Fechado/Aberto + Congelado/Descongelado (ex: fechado+congelado; aberto+descongelado em uso)
  - **Tubo Falcon**: estado único — Congelado / Descongelado / Consumido (um tubo é consumido inteiro, não parcialmente)
- Código curto + QR próprio por unidade (cada tubo tem a sua etiqueta, com o peso correto daquele tubo específico)

**Equipment (catálogo fixo) — backlog v2**
- Métodos: V60 02, Origami (cônico/wave), Hario Switch, Timemore B75
- Moedores: 1Zpresso ZP6, 1Zpresso K-Ultra (ajuste por cliques)
- Acessórios: Nucleus Paragon (sim/não)
- Na v1 esses dados ficam só dentro dos campos da receita (seção 3.3) como texto digitado, sem dropdown/catálogo próprio

**Recipe (Receita estruturada) — backlog v2**
- Vinculada a um Coffee
- Método + filtro, moedor + cliques
- Dose (g) / Ratio / Água final (g)
- Temperatura
- Protocolo de despejo (blooms, pulsos, tempos)
- Uso do Paragon (sim/não, tempo no pote)
- Meta de tempo de dreno
- Tabela de ajuste (o que mudar se dreno rápido/lento, se ácido/amargo etc.)
- Versão (v1, v2... conforme você itera)

**Brew Log (Sessão de extração) — backlog v2**
- Vinculado a uma Recipe + Batch
- Data/hora
- Tempo de dreno real
- TDS/EY (se medir)
- Notas sensoriais (texto livre)
- Avaliação (nota ou like/dislike rápido)
- Gera sugestão de próximo ajuste (regra simples baseada nos princípios abaixo)

---

## 3. Funcionalidades da v1 (MVP)

### 3.1 Catálogo de cafés
- CRUD de cafés com todos os campos acima
- **Score (1–5)**: campo editável a qualquer momento (você pode dar a nota inicial e ajustar depois de provar)
- Busca/filtro por processo, torra, status **e score** — ex: "mostrar só cafés 5 estrelas" pra ocasiões especiais, ou "score ≥3" pro dia a dia
- ~~Indicador de janela de descanso~~ → movido pro backlog (seção 4) — você já gerencia isso mentalmente

### 3.2 Armazenamento (pacotes + tubos Falcon)
- Um café pode ter **múltiplas unidades de armazenamento ao mesmo tempo**: pacote inteiro ainda congelado, pacote aberto/descongelado em uso no dia a dia, e vários tubos Falcon congelados — tudo visível junto na tela do café
- Ao abrir um pacote pra porcionar: criar N tubos Falcon com **peso individual** (ex: 2 de 20g + 3 de 15g), marcando quanto sobrou no pacote original (se for continuar usando descongelado)
- Pacote tem estado composto (Fechado/Aberto + Congelado/Descongelado); tubo tem estado único (Congelado/Descongelado/Consumido) — cada unidade atualizada independente das outras
- Baixa automática ao marcar uma unidade como consumida
- Alerta de "últimas unidades" de um café

### 3.3 Campo de receita (semi-estruturado, sem motor)
- Campos dedicados por café: Método, Dose, Moedor+cliques — mais um campo de texto livre para o protocolo (temperatura, bloom, vertidas, meta de dreno)
- Preenchido a partir do resultado da conversa aqui no chat — sem versionamento nem tabela de ajuste automatizada na v1, isso continua sendo trabalho de conversa, não de sistema
- Serve de "cola" rápida pra você consultar no fone enquanto prepara o café

### 3.4 Etiquetas (Niimbot B1)
- **Fase 1 (v1):** gerar QR/código curto por unidade de armazenamento, exportado como imagem PNG — você importa manualmente no app do Niimbot pra imprimir. Simples e já destrava o fluxo de porcionar → identificar doses no freezer.
- Cada etiqueta reflete o **peso individual daquela unidade** (já que tubos do mesmo café podem ter pesos diferentes — ex: 20g vs. 15g)
- **Fase 2 (depois que você testar o B1 e conhecer a interface de import dele):** avaliar se dá pra gerar o layout já pronto (dimensões da etiqueta, texto formatado, QR posicionado) direto do app, eliminando o passo manual. Complexidade depende do que o app do Niimbot aceitar importar (imagem pronta vs. algum formato/API específico) — decidimos isso com base no que você descobrir usando o aparelho.
- Tela de impressão em lote (porcionou 5 tubos → gera/exporta 5 QRs de uma vez, cada um com o peso correto), independente da fase
- Escanear/tocar (via câmera do celular) para abrir a unidade e ver café + receita associada

### 3.5 Painel inicial (Home)
- Cafés prontos para uso hoje (não esgotados)
- Unidades restantes por café (pacote/tubos, com peso de cada uma)
- Acesso rápido por score: "café excepcional hoje" (score 5) vs. "café do dia a dia" (score ≤3)
- Acesso rápido: escanear/abrir unidade → ver café + receita anotada

### 3.6 Acesso multi-dispositivo
- Web app responsivo (mobile-first), acessível via IP local (ex: `coffeelog.local` ou IP fixo) a partir de celular, tablet e desktop
- Uso single-user (só você) — sem necessidade de login/PIN na v1

### 3.7 Configurações (limiares de alerta)
- Tela de settings com limiares editáveis que alimentam os alertas do painel inicial (3.5): "avisar se não congelado após N dias" (default sugerido: 3) e "avisar se congelado há mais de N dias" (default sugerido: 40)
- Unidade de peso (gramas, fixo na v1)
- Status da conexão com o servidor local e versão do app

---

## 4. Fora do escopo da v1 (backlog v2+)

- **Indicador automático de janela de descanso** (dias pós-torra → descansando/ideal/passou do pico) — você gerencia isso mentalmente por enquanto
- **Motor de receitas completo**: formulário estruturado, versionamento (v1/v2/v3 por café), tabela de ajuste automatizada
- **Equipment estruturado**: catálogo fixo de métodos (V60 02, Origami cônico/wave, Hario Switch, Timemore B75), moedores (ZP6, K-Ultra) e acessórios (Nucleus Paragon) como entidades próprias, permitindo selecionar em dropdown em vez de digitar no texto livre
- **Log de extração**: registro de dreno real, TDS, notas por sessão, comparação entre versões de receita
- **Sugestão automática de método/moedor** para um café novo, com base em processo/torra/notas (regras tipo as que já usamos: naturais → imersão pra construir doçura; lavados → clareza no pour-over; Geshas → K-Ultra pela clareza)
- Autofill de dados do pacote por foto (via Claude Vision)
- Gráficos de evolução (dreno, nota, TDS ao longo das versões de receita)
- Estatísticas de consumo (g/mês, café favorito, custo por xícara)
- Integração real com NFC
- Modo "brew assistant" com timer guiado passo a passo (bloom → pulso 1 → pulso 2...)

*Observação: a discussão de receita (qual método, qual moedor, protocolo) continua acontecendo aqui no chat, café a café, como já fazemos — o app só guarda o resultado como referência (campo 3.3). Se depois de usar o app você sentir falta do histórico estruturado de versões, promovemos o "motor de receitas" pra v2.*

---

## 5. Sugestão técnica (leve, para rodar no Proxmox)

- **Deploy**: LXC container (mais leve que VM completa, ideal pro caso de uso) rodando Docker, ou Docker direto dentro de uma VM existente se você já tem uma VM de serviços. LXC costuma ser o caminho mais econômico em recursos no Proxmox.
- **Backend**: Node/Express ou Python/FastAPI + SQLite (arquivo único, sem servidor de banco separado — fácil de fazer backup, basta copiar o arquivo)
- **Frontend**: web app responsivo, servido pelo mesmo backend, acessível via IP fixo ou hostname local (ex: registrar `coffeelog.local` no seu DNS interno, se tiver, ou só IP:porta)
- **QR code**: gerado no backend (lib padrão) — export de imagem PNG pra você imprimir no app do Niimbot B1
- **Backup**: como é single-user e dados não críticos, um snapshot periódico do container/VM no Proxmox (ou backup do arquivo SQLite) já resolve
- Claude Code cuida da implementação; Claude Design pode ser usado pra desenhar as telas antes de implementar

---

## 7. Identidade visual e telas (definidas no Claude Design)

Protótipo hi-fi completo em `CoffeeLog_dc.html`, mobile-first + variante desktop. Paleta terrosa/quente (tons de café: `#5C3D28`, `#BE6A3A`, `#F3EBDF`), tipografia serifada (Spectral) para títulos + sans (IBM Plex Sans) para o resto.

**Logo:** variante **2a** — grão de café sólido em tile terracota.

**Telas finalizadas** (selo de referência no protótipo):
- **5a** — Home: dois alertas (Porcionar & congelar / Congelados há muito tempo) + chips de filtro (Estrelas, +tempo, Recentes, Porcionar) + lista de cafés disponíveis
- **7a-7c** — Onboarding de café novo (3 passos: identificação, ficha do grão, estoque inicial) — score fica em branco até a primeira extração
- **7d-7f** — Fluxo de porcionar & congelar (fonte → definir tubos com peso individual → confirmar)
- **9a-9c** — Fluxo de consumir: escolher unidade → do pacote aberto (por grama) ou tubo congelado (porção inteira, com opção de só descongelar)
- **6a-6c** — Unidades de armazenamento, etiqueta com QR, scanner
- **10a** — Detalhe da unidade (entry point do scanner)
- **8a/8b** — Desktop: catálogo em grade + detalhe em duas colunas com sidebar fixa (Home/Catálogo/Etiquetas/Scanner)

**Decisão confirmada:** a receita usa campos dedicados (Método, Dose, Moedor+cliques) mais um campo de texto livre pro protocolo — mais estruturado do que o texto 100% livre original, mantendo a simplicidade (sem versionamento).

---

## 8. Correções pontuais no protótipo (aplicar via instrução no handoff, não regenerar)

O protótipo do Claude Design (`CoffeeLog_dc.html`) tem 3 dados de exemplo que não batem com seu setup real. Como são conteúdo de exemplo (não estrutura visual), a correção entra como instrução textual no prompt pro Claude Code, sem precisar voltar no Claude Design:

1. **Impressora**: tela de Settings mostra "Niimbot D110" → deve ser **Niimbot B1**
2. **Método**: editor de receita usa chips fixos "V60 / Espresso / Aeropress" → as opções reais são **V60 02, Origami (filtro cônico ou wave), Hario Switch, Timemore B75**. Nenhum espresso ou Aeropress no seu setup.
3. **Moedor de exemplo**: mock usa "Comandante C40" → seus moedores são **1Zpresso ZP6 e 1Zpresso K-Ultra**. O campo continua texto livre (não é dropdown na v1), mas o exemplo/seed não deve usar C40.

---

## 9. Próximos passos

1. ✅ Escopo da v1 definido: Catálogo de cafés + Doses/Falcon tubes + Etiquetas (Niimbot B1)
2. ✅ Etiquetas: começar só com QR/PNG exportado (fase 1); layout completo pro Niimbot fica pra fase 2, depois de você testar o aparelho e entender a interface de import dele
3. ✅ Telas desenhadas no Claude Design (ver seção 7) — logo 2a, receita semi-estruturada
4. ✅ Modelo de dados refinado: origem/torrefação estruturadas, estado composto do pacote, limiares de alerta configuráveis (ver seção 2 e 3.7)
5. Levar esta spec + o protótipo (`CoffeeLog_dc.html`) + as correções da seção 8 pro Claude Code, rodando como LXC/container no Proxmox — pedindo explicitamente UI/código/README em inglês, já que o plano é publicar como open source
6. Continuamos discutindo receitas normalmente aqui no chat, café a café — quando o app existir, você já tem onde registrar o resultado de cada conversa (campo 3.3)
