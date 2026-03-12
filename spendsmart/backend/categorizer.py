"""
Automatic expense categorization using keyword rules.
Returns (category, subcategory) tuple.
"""

from typing import Tuple

# category → subcategory → [keywords]
RULES = {
    "Necessidades": {
        "Supermercado": [
            "pão", "leite", "ovos", "arroz", "massa", "feijão", "frango", "carne", "peixe",
            "vegetais", "legumes", "fruta", "iogurte", "queijo", "manteiga", "azeite", "sal",
            "açúcar", "farinha", "café", "chá", "agua", "água", "sumo", "cerveja", "vinho",
            "continente", "pingo doce", "lidl", "aldi", "mercadona", "minipreço", "intermarché",
            "supermercado", "mercearia", "hortifruti",
        ],
        "Farmácia": [
            "farmácia", "farmacia", "medicamento", "comprimido", "xarope", "aspirina",
            "paracetamol", "ibuprofeno", "vitamina", "suplemento", "penso", "gel",
        ],
        "Transportes": [
            "uber", "bolt", "táxi", "taxi", "metro", "comboio", "autocarro", "bus",
            "gasolina", "gasóleo", "portagem", "estacionamento", "parking", "cp ", "carris",
        ],
        "Utilidades": [
            "luz", "eletricidade", "electricidade", "água", "gás", "internet", "net",
            "telemóvel", "telefone", "meo", "nos ", "vodafone", "nowo",
        ],
        "Renda": ["renda", "aluguer", "hipoteca"],
    },
    "Estilo de Vida": {
        "Cafés": [
            "café", "bica", "galão", "cappuccino", "latte", "espresso", "pastelaria",
            "starbucks", "delta", "nespresso",
        ],
        "Restaurantes": [
            "restaurante", "almoço", "jantar", "pizza", "burger", "hambúrguer", "sushi",
            "mcdonald", "mcdonalds", "kfc", "subway", "pizza hut", "nando", "refeição",
            "menu", "take away", "takeaway", "delivery", "glovo", "uber eats",
        ],
        "Ginásio": ["ginásio", "gym", "health club", "fitness", "yoga", "pilates"],
        "Lazer": [
            "cinema", "teatro", "concerto", "festival", "espetáculo", "museu",
            "netflix", "spotify", "disney", "hbo", "prime video", "apple tv",
        ],
    },
    "Desejos": {
        "Roupa": [
            "roupa", "calças", "camisa", "camisola", "sapatos", "ténis", "vestido", "casaco",
            "zara", "h&m", "pull&bear", "primark", "mango", "nike", "adidas",
        ],
        "Tecnologia": [
            "telemóvel", "portátil", "computador", "tablet", "auriculares", "carregador",
            "apple", "samsung", "xiaomi", "fnac", "worten", "mediamarkt",
        ],
        "Decoração": [
            "ikea", "decoração", "candeeiro", "tapete", "almofada", "quadro", "vaso",
        ],
        "Cuidado Pessoal": [
            "cabeleireiro", "barbeiro", "manicure", "spa", "massagem",
            "perfume", "maquilhagem", "shampoo", "gel de duche",
        ],
    },
}

# Quick keyword → (category, subcategory) index
_INDEX: dict = {}
for cat, subs in RULES.items():
    for sub, keywords in subs.items():
        for kw in keywords:
            _INDEX[kw.lower()] = (cat, sub)


def categorize_expense(description: str) -> Tuple[str, str]:
    """Return (category, subcategory) for a given expense description."""
    text = description.lower().strip()

    # Exact and substring match
    for kw, result in _INDEX.items():
        if kw in text:
            return result

    # Default
    return ("Outros", "Geral")
