# Deploy — Blog Letícia Rufino Arquitetura

## Estrutura do projeto

```
blog-project/
├── backend/
│   ├── server.js          ← API Node.js + Express + SQLite
│   ├── package.json
│   ├── .env.example       ← Copie para .env e preencha
│   ├── blog.db            ← Criado automaticamente ao rodar
│   └── uploads/           ← Criado automaticamente (imagens de capa)
│
└── frontend/
    ├── blog.html          ← Página pública do blog
    ├── admin/
    │   └── index.html     ← Painel de gerenciamento
    └── assets/            ← Mesmos assets do site principal
```

---

## Opção A — Deploy na Render.com (grátis / recomendado para começar)

### 1. Prepare o repositório
```bash
# Na pasta backend/
git init
git add .
git commit -m "init"
# Suba para um repositório no GitHub
```

### 2. Crie o serviço na Render
1. Acesse https://render.com e crie uma conta gratuita
2. Clique em **New → Web Service**
3. Conecte seu repositório GitHub
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Environment:** Node
5. Em **Environment Variables**, adicione:
   ```
   JWT_SECRET=uma-string-longa-e-aleatoria-aqui
   FRONTEND_URL=https://seudominio.com.br
   ```
6. Clique em **Create Web Service**

A Render vai te dar uma URL tipo `https://blog-leticia.onrender.com`.

> ⚠️ No plano gratuito da Render, o servidor "dorme" após 15 min sem requisições.
> Para produção real, use o plano Starter ($7/mês) ou a Opção B abaixo.

---

## Opção B — VPS com PM2 (produção robusta, ~R$30/mês)

### Provedores recomendados: Hostinger VPS, DigitalOcean, Vultr

```bash
# 1. Conecte ao servidor via SSH
ssh root@IP-DO-SERVIDOR

# 2. Instale Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 3. Instale PM2 (gerenciador de processos)
npm install -g pm2

# 4. Clone ou suba o projeto
git clone https://github.com/seu-usuario/blog-leticia.git /var/www/blog
cd /var/www/blog/backend

# 5. Configure o .env
cp .env.example .env
nano .env
# Preencha: JWT_SECRET, FRONTEND_URL, PORT=3001

# 6. Instale dependências e inicie
npm install
pm2 start server.js --name blog-api
pm2 save          # salva para reiniciar após reboot
pm2 startup       # configura autostart

# 7. Instale Nginx como proxy reverso
apt-get install -y nginx

# 8. Configure o Nginx
nano /etc/nginx/sites-available/blog
```

**Conteúdo do arquivo Nginx:**
```nginx
server {
    listen 80;
    server_name seudominio.com.br;

    # Frontend (arquivos estáticos)
    root /var/www/blog/frontend;
    index blog.html;

    location / {
        try_files $uri $uri/ =404;
    }

    # API (proxy para o Node)
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /uploads/ {
        proxy_pass http://localhost:3001;
    }
}
```

```bash
# 9. Ative e teste
ln -s /etc/nginx/sites-available/blog /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# 10. HTTPS gratuito com Certbot
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d seudominio.com.br
```

---

## Opção C — Coolify (self-hosted, mais fácil que VPS manual)

Coolify é uma interface gráfica open-source que simplifica o deploy em VPS.

1. Instale Coolify na VPS:
   ```bash
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
   ```
2. Acesse `http://IP-DO-SERVIDOR:8000`
3. Crie uma aplicação **Node.js** apontando para o repositório
4. Configure as variáveis de ambiente pelo painel
5. Coolify gerencia PM2, Nginx e SSL automaticamente

---

## Frontend — onde hospedar os arquivos HTML

Os arquivos `blog.html` e `admin/index.html` são HTML estáticos.

**Opção 1 — Mesmo servidor Nginx** (Opção B acima)
- Coloque em `/var/www/blog/frontend/`
- Já está configurado no Nginx acima

**Opção 2 — Vercel / Netlify (grátis)**
- Suba a pasta `frontend/` como um projeto estático
- Configure a variável `API` no `blog.html` e `admin/index.html`:
  ```js
  // Troque esta linha nos dois arquivos:
  const API = 'http://localhost:3001';
  // Por:
  const API = 'https://blog-leticia.onrender.com'; // URL da sua API
  ```

---

## Configuração pós-deploy

### Primeiro acesso ao painel admin

1. Acesse `https://seudominio.com.br/admin/`
2. Login padrão (criado automaticamente na primeira execução):
   ```
   E-mail: admin@leticia.com
   Senha:  admin123
   ```
3. **Troque a senha imediatamente** pelo painel (menu → Alterar senha)

### Apontar o domínio

No painel do seu registrador de domínio (Registro.br, GoDaddy etc.):
```
Tipo A:  @   →  IP-DO-SERVIDOR
Tipo A:  www →  IP-DO-SERVIDOR
```

---

## Segurança em produção

```bash
# .env — nunca suba para o Git
echo ".env" >> .gitignore
echo "blog.db" >> .gitignore
echo "uploads/" >> .gitignore

# Gere um JWT_SECRET forte:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Adicione ao `.gitignore`:
```
.env
blog.db
uploads/
node_modules/
```

---

## Comandos úteis (VPS com PM2)

```bash
pm2 status              # ver se a API está rodando
pm2 logs blog-api       # ver logs em tempo real
pm2 restart blog-api    # reiniciar após mudanças
pm2 stop blog-api       # parar

# Atualizar o código:
cd /var/www/blog
git pull
cd backend && npm install
pm2 restart blog-api
```

---

## Resumo rápido de custos

| Opção          | Custo          | Ideal para            |
|---------------|----------------|----------------------|
| Render grátis  | R$ 0/mês       | Testes e desenvolvimento |
| Render Starter | ~R$ 40/mês     | Produção leve        |
| VPS Hostinger  | ~R$ 25/mês     | Produção completa    |
| DigitalOcean   | ~R$ 30/mês     | Produção completa    |

> **Recomendação:** Comece com Render grátis para validar, migre para VPS Hostinger quando quiser algo mais estável.
