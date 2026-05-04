# ASA Atacadista — Site Institucional
**Versão:** 1.0.0  
**Data:** 2026-02-24

---

## 📁 Estrutura do Projeto

```
asa-atacadista/
│
├── index.html                  # Markup principal (HTML semântico, acessível)
│
├── css/
│   ├── reset.css               # Normalize cross-browser
│   ├── tokens.css              # Design tokens (variáveis CSS)
│   ├── layout.css              # Header, footer, container, grid global
│   ├── components.css          # Componentes por seção (hero, sobre, etc.)
│   ├── animations.css          # Sistema de reveal + keyframes
│   └── responsive.css          # Breakpoints mobile-first
│
├── js/
│   └── main.js                 # JS modular (App, Header, MobileMenu,
│                               #   Reveal, Counter, Toast, Form, Year)
│
├── assets/
│   └── icons/                  # Ícones SVG (opcional)
│
└── README.md                   # Este arquivo
```

---

## 🎨 Design System

| Token            | Valor                    |
|------------------|--------------------------|
| Cor primária     | `#4ade80` (verde neon)   |
| Cor secundária   | `#22c55e` (verde médio)  |
| Background       | `#060c04`                |
| Fonte display    | Barlow Condensed         |
| Fonte corpo      | Barlow                   |
| Border radius XL | `28px`                   |

---

## 📱 Responsividade

| Breakpoint | Largura     | Comportamento                          |
|------------|-------------|----------------------------------------|
| xl         | > 1024px    | Layout completo desktop                |
| lg         | ≤ 1024px    | Menu hamburger, grids simplificados    |
| md         | ≤ 768px     | Colunas únicas, form simplificado      |
| sm         | ≤ 640px     | Hero visual oculto, stats compactos    |
| xs         | ≤ 480px     | Botões em coluna, mínimo visual        |

---

## 🔢 Versionamento

Siga **Semantic Versioning** (semver):

```
MAJOR.MINOR.PATCH
  │     │     └── Correções de bugs / ajustes visuais pequenos
  │     └──────── Novas seções ou funcionalidades (sem quebrar)
  └────────────── Reestruturação total de código/design
```

### Como versionar

1. Atualize a versão no cabeçalho de **cada arquivo** modificado.
2. Atualize `VERSION` em `js/main.js` (linha `const VERSION = '...'`).
3. Atualize o atributo `footer__version` no `index.html`.
4. Crie uma tag Git: `git tag v1.1.0`

### Exemplo de histórico
```
v1.0.0 — Lançamento inicial
v1.0.1 — Correção de alinhamento mobile no hero
v1.1.0 — Adição de seção "Portfólio de Marcas"
v2.0.0 — Redesign visual completo
```

---

## 🚀 Deploy

### Netlify (recomendado)
1. Faça upload da pasta `asa-atacadista/` como site estático.
2. Defina o **Publish directory** como raiz (`/`).

### Servidor próprio (Apache/Nginx)
Copie todos os arquivos para a pasta pública (`/var/www/html` ou equivalente).

---

## 📡 Integração do Formulário

Em `js/main.js`, dentro do módulo `Form.handleSubmit()`, substitua o bloco de simulação pelo fetch real:

```js
const data = new FormData(form);
const res  = await fetch('/contato.php', { method: 'POST', body: data });
if (!res.ok) throw new Error(`HTTP ${res.status}`);
```

---

## ♿ Acessibilidade

- Markup semântico: `<header>`, `<main>`, `<nav>`, `<section>`, `<footer>`
- `aria-label` em todos os elementos interativos
- `role="list"` / `role="listitem"` em listas de conteúdo
- `aria-expanded` / `aria-hidden` no menu mobile
- `prefers-reduced-motion` respeita preferências do usuário
- Foco visível via `:focus-visible`

---

## 📞 Contato da Empresa

| Campo    | Valor                          |
|----------|--------------------------------|
| Telefone | (64) 98401-3872                |
| E-mail   | comercial@asaatacadista.com.br |
| Site     | www.asaatacadista.com.br       |
| Local    | Catalão/GO — BR-050            |
