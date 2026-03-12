# SpendSmart — Gestor de Consumo Inteligente

App mobile-first para controlo de despesas diárias com scanner de código de barras e categorização automática.

## Stack
- **Frontend**: React 18 + Vite + TailwindCSS
- **Backend**: FastAPI + SQLite
- **Scanner**: ZXing (open source)
- **Produtos**: Open Food Facts API

---

## Estrutura do projeto

```
spendsmart/
├── backend/
│   ├── main.py          # FastAPI app + endpoints
│   ├── categorizer.py   # Motor de categorização automática
│   ├── schema.sql       # Schema SQLite
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── contexts/AuthContext.jsx
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── RegisterPage.jsx
    │   │   ├── DashboardPage.jsx
    │   │   ├── AddExpensePage.jsx
    │   │   ├── ScannerPage.jsx
    │   │   ├── BudgetPage.jsx
    │   │   └── ShoppingListPage.jsx
    │   ├── components/Layout.jsx
    │   └── utils/api.js
    ├── package.json
    └── vite.config.js
```

---

## Como correr localmente

### 1. Backend

```bash
cd backend

# Criar ambiente virtual (recomendado)
python -m venv venv
source venv/bin/activate      # Mac/Linux
# venv\Scripts\activate       # Windows

# Instalar dependências
pip install -r requirements.txt

# Iniciar servidor
python main.py
# → http://localhost:8000
# → Swagger UI: http://localhost:8000/docs
```

### 2. Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
# → http://localhost:3000
```

---

## Endpoints da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/auth/register` | Criar conta |
| POST | `/auth/login` | Login |
| GET | `/auth/me` | Perfil atual |
| GET | `/budget` | Orçamento + gastos |
| PUT | `/budget` | Atualizar orçamento mensal |
| GET | `/expenses` | Listar despesas |
| POST | `/expenses` | Adicionar despesa |
| DELETE | `/expenses/{id}` | Apagar despesa |
| GET | `/insights` | Gráficos e análise |
| GET | `/products/barcode/{code}` | Lookup de produto |
| POST | `/products/categorize` | Categorização automática |
| GET | `/shopping-list` | Lista de compras |
| POST | `/shopping-list` | Adicionar item |
| PATCH | `/shopping-list/{id}/check` | Marcar como comprado |
| DELETE | `/shopping-list/{id}` | Remover item |

---

## Base de dados (SQLite)

### Tabelas
- **users** — conta do utilizador + orçamento mensal
- **expenses** — despesas com categoria, loja, data
- **products** — cache de produtos por código de barras
- **price_history** — histórico de preços por loja
- **shopping_list** — lista de compras

---

## Fluxo do Scanner

```
Câmara → ZXing (deteta código) → GET /products/barcode/{code}
                                         ↓
                                 DB local (cache)
                                         ↓ (se não encontrar)
                                 Open Food Facts API
                                         ↓
                                 Preenche formulário automaticamente
                                         ↓
                              Utilizador adiciona preço e loja
                                         ↓
                                 POST /expenses + price_history
```

---

## Categorização automática

O sistema `categorizer.py` usa um índice de palavras-chave em português:

- `café` → Estilo de Vida › Cafés
- `supermercado`, `leite`, `pão` → Necessidades › Supermercado
- `farmácia`, `medicamento` → Necessidades › Farmácia
- `uber`, `metro` → Necessidades › Transportes
- `zara`, `roupa` → Desejos › Roupa
- etc.

---

## Roadmap MVP → V3

### ✅ MVP (incluído)
- Autenticação JWT
- Dashboard com orçamento diário/mensal
- Registo manual de despesas
- Categorização automática
- Scanner de código de barras (ZXing + Open Food Facts)
- Lista de compras
- Gráfico por categorias

### V2
- Alertas por email quando orçamento excedido
- Notificações push (PWA)
- Filtros por data e categoria
- Exportar CSV

### V3
- Foto do produto com IA (Vision API)
- Lista partilhada em tempo real (WebSockets)
- Comparação de preços entre lojas
- Insights com médias e tendências avançadas
