# DeckLayout v2 🚢🏗️

Ferramenta avançada de planejamento de mobilização offshore e engenharia de instalação subsea.

## 🚀 Principais Módulos

### 1. Deck Layout 2D & 3D
- **Canvas Konva (2D)**: Redesign realista com casco SVG dinâmico, arcos de raio de guindaste coloridos por utilização, zonas proibidas de slew e indicação visual de status dos equipamentos.
- **Three.js Viewer (3D)**: Casco volumétrico realista (gray/red hull), mar translúcido com shading, cabos de rigging visíveis e presets de câmera (Top, Port, Bow, Stern).

### 2. Engenharia de Içamento & Rigging
- **Rigging Library**: Cadastro centralizado de lingas (slings), manilhas (shackles) e spreader bars.
- **Cálculos de Rigging**: Hook loads, sling forces (com ângulos), verificação de WLL/MBL e arranjos customizados por equipamento.

### 3. Estabilidade do Navio
- **Vessel Particulars**: Gestão de LBP, Beam, Draft, Displacement e DP Class.
- **Estabilidade Intacta**: Cálculos automáticos de KG (Vertical CoG) carregado, verificação de GM mínimo, Trim e List (Heel) baseados no layout do convés.

### 4. Sea-Fastening & Trânsito
- **Análise de Acelerações**: Cálculo de forças longitudinais, transversais e verticais baseadas em Hs/Tp de trânsito.
- **Grillage & Tie-downs**: Verificação de pressão no convés e especificação de peação (correntes/cabos) necessária.

### 5. Análise de Zona de Splash (DNV-ST-N001)
- **Análise Dinâmica**: Uso de RAOs por período para cálculo de DAF (Dynamic Amplification Factor).
- **Operabilidade**: Grid de Hs vs Tp com verificação de viabilidade (crane capacity, residual tension, snap loads).

### 6. Relatórios & IA
- **PDF Report**: Geração de memória de cálculo detalhada para MWS, incluindo o DNV Calculation Trail.
- **AI Assistant**: Assistente integrado via Gemini 1.5 Pro com ferramentas de consulta de engenharia e comparação de cenários.

## 🛠️ Stack Técnica
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui.
- **Canvas/3D**: Konva.js, Three.js (@react-three/fiber).
- **Backend/DB**: Supabase (PostgreSQL, Edge Functions, Auth).
- **Testes**: Vitest (242 testes unitários).

## 📊 Status
- **Versão**: 2.1.0-release
- **Build**: Success ✅
- **Testes**: 242/242 Pass ✅
- **Deploy**: GitHub Pages ✅

---
*Desenvolvido pelo DevBot para moliveirauff.*
