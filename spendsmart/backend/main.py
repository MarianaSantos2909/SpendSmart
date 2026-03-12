from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date, timedelta
import sqlite3
import hashlib
import jwt
import os
import httpx
from categorizer import categorize_expense

SECRET_KEY = os.getenv("SECRET_KEY", "spendsmart-secret-key-change-in-prod")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

app = FastAPI(title="SpendSmart API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# ─── DB ────────────────────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect("spendsmart.db", check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    conn = sqlite3.connect("spendsmart.db")
    conn.executescript(open("schema.sql").read())
    conn.commit()
    conn.close()

# ─── Auth helpers ──────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")
    row = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Utilizador não encontrado")
    return dict(row)

# ─── Schemas ───────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class BudgetUpdate(BaseModel):
    monthly_budget: float

class ExpenseCreate(BaseModel):
    description: str
    amount: float
    category: Optional[str] = None
    subcategory: Optional[str] = None
    store: Optional[str] = None
    barcode: Optional[str] = None
    expense_date: Optional[str] = None  # ISO date string

class ShoppingItem(BaseModel):
    name: str
    quantity: Optional[int] = 1
    category: Optional[str] = None
    estimated_price: Optional[float] = None

# ─── Auth ──────────────────────────────────────────────────────────────────────

@app.post("/auth/register")
def register(body: RegisterRequest, db=Depends(get_db)):
    existing = db.execute("SELECT id FROM users WHERE email = ?", (body.email,)).fetchone()
    if existing:
        raise HTTPException(status_code=400, detail="Email já registado")
    hashed = hash_password(body.password)
    cursor = db.execute(
        "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
        (body.name, body.email, hashed),
    )
    db.commit()
    token = create_token(cursor.lastrowid)
    return {"access_token": token, "token_type": "bearer"}

@app.post("/auth/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db=Depends(get_db)):
    row = db.execute("SELECT * FROM users WHERE email = ?", (form.username,)).fetchone()
    if not row or dict(row)["password_hash"] != hash_password(form.password):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    token = create_token(dict(row)["id"])
    return {"access_token": token, "token_type": "bearer"}

@app.get("/auth/me")
def me(user=Depends(get_current_user)):
    return {k: v for k, v in user.items() if k != "password_hash"}

# ─── Budget ────────────────────────────────────────────────────────────────────

@app.put("/budget")
def update_budget(body: BudgetUpdate, user=Depends(get_current_user), db=Depends(get_db)):
    db.execute(
        "UPDATE users SET monthly_budget = ? WHERE id = ?",
        (body.monthly_budget, user["id"]),
    )
    db.commit()
    return {"monthly_budget": body.monthly_budget}

@app.get("/budget")
def get_budget(user=Depends(get_current_user), db=Depends(get_db)):
    today = date.today()
    month_start = today.replace(day=1).isoformat()
    month_end = today.isoformat()

    spent_month = db.execute(
        "SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE user_id=? AND expense_date BETWEEN ? AND ?",
        (user["id"], month_start, month_end),
    ).fetchone()["total"]

    spent_today = db.execute(
        "SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE user_id=? AND expense_date=?",
        (user["id"], today.isoformat()),
    ).fetchone()["total"]

    monthly_budget = user["monthly_budget"] or 0
    days_in_month = (today.replace(month=today.month % 12 + 1, day=1) - timedelta(days=1)).day
    days_remaining = days_in_month - today.day + 1
    budget_remaining_month = monthly_budget - spent_month
    daily_budget = budget_remaining_month / days_remaining if days_remaining > 0 else 0

    return {
        "monthly_budget": monthly_budget,
        "spent_month": round(spent_month, 2),
        "remaining_month": round(budget_remaining_month, 2),
        "spent_today": round(spent_today, 2),
        "daily_budget": round(daily_budget, 2),
        "daily_remaining": round(daily_budget - spent_today, 2),
        "days_remaining": days_remaining,
        "over_budget": budget_remaining_month < 0,
    }

# ─── Expenses ──────────────────────────────────────────────────────────────────

@app.post("/expenses", status_code=201)
def add_expense(body: ExpenseCreate, user=Depends(get_current_user), db=Depends(get_db)):
    expense_date = body.expense_date or date.today().isoformat()

    # Auto-categorize if not provided
    category = body.category
    subcategory = body.subcategory
    if not category:
        category, subcategory = categorize_expense(body.description)

    cursor = db.execute(
        """INSERT INTO expenses (user_id, description, amount, category, subcategory, store, barcode, expense_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (user["id"], body.description, body.amount, category, subcategory,
         body.store, body.barcode, expense_date),
    )

    # Save price history if barcode present
    if body.barcode and body.store:
        db.execute(
            """INSERT OR REPLACE INTO price_history (barcode, store, price, recorded_date)
               VALUES (?, ?, ?, ?)""",
            (body.barcode, body.store, body.amount, expense_date),
        )

    db.commit()
    return {"id": cursor.lastrowid, "category": category, "subcategory": subcategory}

@app.get("/expenses")
def list_expenses(
    limit: int = 20,
    offset: int = 0,
    category: Optional[str] = None,
    month: Optional[str] = None,  # YYYY-MM
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    query = "SELECT * FROM expenses WHERE user_id=?"
    params = [user["id"]]
    if category:
        query += " AND category=?"
        params.append(category)
    if month:
        query += " AND expense_date LIKE ?"
        params.append(f"{month}%")
    query += " ORDER BY expense_date DESC, id DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    rows = db.execute(query, params).fetchall()
    return [dict(r) for r in rows]

@app.delete("/expenses/{expense_id}")
def delete_expense(expense_id: int, user=Depends(get_current_user), db=Depends(get_db)):
    row = db.execute("SELECT id FROM expenses WHERE id=? AND user_id=?", (expense_id, user["id"])).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Despesa não encontrada")
    db.execute("DELETE FROM expenses WHERE id=?", (expense_id,))
    db.commit()
    return {"deleted": True}

# ─── Insights ──────────────────────────────────────────────────────────────────

@app.get("/insights")
def get_insights(user=Depends(get_current_user), db=Depends(get_db)):
    today = date.today()
    month_start = today.replace(day=1).isoformat()

    by_category = db.execute(
        """SELECT category, ROUND(SUM(amount),2) as total, COUNT(*) as count
           FROM expenses WHERE user_id=? AND expense_date >= ?
           GROUP BY category ORDER BY total DESC""",
        (user["id"], month_start),
    ).fetchall()

    daily_trend = db.execute(
        """SELECT expense_date, ROUND(SUM(amount),2) as total
           FROM expenses WHERE user_id=? AND expense_date >= ?
           GROUP BY expense_date ORDER BY expense_date""",
        (user["id"], (today - timedelta(days=29)).isoformat()),
    ).fetchall()

    top_expenses = db.execute(
        """SELECT description, ROUND(SUM(amount),2) as total
           FROM expenses WHERE user_id=? AND expense_date >= ?
           GROUP BY description ORDER BY total DESC LIMIT 5""",
        (user["id"], month_start),
    ).fetchall()

    return {
        "by_category": [dict(r) for r in by_category],
        "daily_trend": [dict(r) for r in daily_trend],
        "top_expenses": [dict(r) for r in top_expenses],
    }

# ─── Scanner / Products ────────────────────────────────────────────────────────

@app.get("/products/barcode/{barcode}")
async def lookup_barcode(barcode: str, user=Depends(get_current_user), db=Depends(get_db)):
    # Check local DB first
    local = db.execute(
        "SELECT * FROM products WHERE barcode=?", (barcode,)
    ).fetchone()
    if local:
        product = dict(local)
        prices = db.execute(
            "SELECT store, price, recorded_date FROM price_history WHERE barcode=? ORDER BY recorded_date DESC LIMIT 10",
            (barcode,),
        ).fetchall()
        return {**product, "price_history": [dict(p) for p in prices]}

    # Fallback: Open Food Facts
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
            )
        data = resp.json()
        if data.get("status") == 1:
            p = data["product"]
            name = p.get("product_name", "") or p.get("product_name_pt", "")
            category = p.get("categories_tags", [""])[0].replace("en:", "").replace("-", " ") if p.get("categories_tags") else None
            if name:
                db.execute(
                    "INSERT OR IGNORE INTO products (barcode, name, brand, category) VALUES (?,?,?,?)",
                    (barcode, name, p.get("brands", ""), category),
                )
                db.commit()
                return {"barcode": barcode, "name": name, "brand": p.get("brands", ""), "category": category, "price_history": []}
    except Exception:
        pass

    raise HTTPException(status_code=404, detail="Produto não encontrado")

@app.post("/products/categorize")
def categorize_text(body: dict, user=Depends(get_current_user)):
    description = body.get("description", "")
    category, subcategory = categorize_expense(description)
    return {"category": category, "subcategory": subcategory}

# ─── Shopping List ─────────────────────────────────────────────────────────────

@app.get("/shopping-list")
def get_shopping_list(user=Depends(get_current_user), db=Depends(get_db)):
    rows = db.execute(
        "SELECT * FROM shopping_list WHERE user_id=? ORDER BY is_checked, id DESC",
        (user["id"],),
    ).fetchall()
    return [dict(r) for r in rows]

@app.post("/shopping-list", status_code=201)
def add_to_list(body: ShoppingItem, user=Depends(get_current_user), db=Depends(get_db)):
    cursor = db.execute(
        "INSERT INTO shopping_list (user_id, name, quantity, category, estimated_price) VALUES (?,?,?,?,?)",
        (user["id"], body.name, body.quantity, body.category, body.estimated_price),
    )
    db.commit()
    return {"id": cursor.lastrowid}

@app.patch("/shopping-list/{item_id}/check")
def toggle_item(item_id: int, user=Depends(get_current_user), db=Depends(get_db)):
    row = db.execute(
        "SELECT is_checked FROM shopping_list WHERE id=? AND user_id=?", (item_id, user["id"])
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    new_val = 0 if row["is_checked"] else 1
    db.execute("UPDATE shopping_list SET is_checked=? WHERE id=?", (new_val, item_id))
    db.commit()
    return {"is_checked": bool(new_val)}

@app.delete("/shopping-list/{item_id}")
def delete_item(item_id: int, user=Depends(get_current_user), db=Depends(get_db)):
    db.execute("DELETE FROM shopping_list WHERE id=? AND user_id=?", (item_id, user["id"]))
    db.commit()
    return {"deleted": True}

# ─── Startup ───────────────────────────────────────────────────────────────────

@app.on_event("startup")
def startup():
    init_db()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
