"""COT Report Hub — server locale (Flask) con persistenza su data.json."""
import json
import threading
import uuid
from datetime import datetime
from pathlib import Path

from flask import Flask, abort, jsonify, request

BASE = Path(__file__).parent
DATA_FILE = BASE / "data.json"
LOCK = threading.Lock()
app = Flask(__name__, static_folder="static", template_folder="templates")


def _id():
    return uuid.uuid4().hex[:8]


def seed():
    def asset(name, emoji, cat, bias, lt, nc, st, skew):
        return dict(id=_id(), name=name, emoji=emoji, bias=bias, cat=cat,
                    longTerm=lt, netChange=nc, shortTerm=st, skew=skew)

    assets = [
        asset("EUR", "🇪🇺", "Forex", "Molto Short", "Short", "In Calo", "Molto Short", "negativa quasi 1:2"),
        asset("AUD", "🇦🇺", "Forex", "Molto Short", "Short", "In Calo", "Molto Short", "negativa 1 a 2"),
        asset("Gold (XAU)", "🥇", "Metalli", "Short", "Molto Long", "In Calo", "Molto Short", "Più di 1:6 positiva"),
        asset("Palladium (PA)", "⚪", "Metalli", "Bilanciato", "Short", "In Calo", "Short", "Negativa quasi 1 a 2"),
        asset("USD", "🇺🇸", "Forex", "Bilanciato", "Poco Long", "Stabile", "Bilanciato", "Quasi 1:2 long"),
        asset("Platinum (PL)", "⚪", "Metalli", "Bilanciato", "Molto Long", "In Aumento", "Short", "1 a 2 positiva"),
        asset("Silver (XAG)", "🥈", "Metalli", "Bilanciato", "Molto Long", "In Calo", "Short", "1:3 positiva"),
        asset("Copper (HG)", "🟤", "Metalli", "Bilanciato", "Molto Long", "In Calo", "Molto Short", "1:2 positiva"),
        asset("Crude Oil (WTI)", "🛢️", "Energia", "Bilanciato", "Poco Long", "In Calo", "Poco Long", "Positiva"),
        asset("GBP", "🇬🇧", "Forex", "Poco Long", "Molto Short", "In Aumento", "Molto Long", "Negativa 1 a 2"),
        asset("JPY", "🇯🇵", "Forex", "Molto Long", "Poco Long", "In Aumento", "Molto Long", "Positiva quasi 1:2"),
        asset("CAD", "🇨🇦", "Forex", "Molto Long", "Short", "In Aumento", "Molto Long", "negativa"),
    ]

    def idea(section, idea_, asset_, conf, direction, season):
        return dict(id=_id(), section=section, idea=idea_, asset=asset_, confluence=conf,
                    direction=direction, seasonality=season)

    ideas = [
        idea("forex", "", "GBPUSD", "GBP debole, USD forte", "Short", "Neutra"),
        idea("forex", "", "EURCAD", "EUR debole, CAD forte", "Short", "Favorevole"),
        idea("forex", "", "USDJPY", "JPY fortissimo, USD debole", "Short", "Contraria"),
        idea("forex", "", "GBPCAD", "GBP debole di LT e CAD forte", "Short", "Favorevole"),
    ]

    agri = [dict(id=_id(), name=n, emoji=e, cotIndex=50, change="Stabile") for n, e in [
        ("Sugar (SB)", "🍭"), ("Soybeans (ZS)", "🌱"), ("Corn (ZC)", "🌽"), ("Coffee (KC)", "☕"),
        ("Soybean Meal (ZM)", "🪷"), ("Cotton (CT)", "☁️"), ("Cocoa (CC)", "🍬"),
        ("Soybean Oil (ZL)", "🪴"), ("Lean Hogs (HE)", "🐷"), ("Feeder Cattle (GF)", "🐂"),
        ("Wheat (ZW)", "🌾"), ("Live Cattle (LE)", "🐄")]]

    def tool(group, name, emoji, cat, desc, url, bank=""):
        return dict(id=_id(), group=group, name=name, emoji=emoji, cat=cat, desc=desc, url=url, bank=bank)

    tools = [
        tool("primary", "Dark Index", "🌑", "Sentiment", "GEX di lungo termine", "squeezemetrics.com/monitor/dix"),
        tool("primary", "Bonds", "💱", "Forex", "Analisi dei bond", "www.worldgovernmentbonds.com"),
        tool("primary", "Finviz", "🔍", "Sentiment", "Tool di analisi stock settoriali e singole stock", "finviz.com"),
        tool("primary", "Tradingster", "📡", "COT", "Grafici COT interattivi — posizionamenti netti su tutti i futures", "www.tradingster.com"),
        tool("primary", "Forecaster Terminal", "🌱", "Stagionalità", "Stagionalità storica e pattern ricorrenti. Confluenza con analisi COT", "terminal.forecaster.biz"),
        tool("primary", "Myfxbook Sentiment", "💹", "Sentiment", "Sentiment retail in tempo reale. Contrarian indicator vs istituzionali", "www.myfxbook.com/community/outlook"),
        tool("primary", "Mataf", "🌐", "Forex", "Correlazioni valutarie e statistiche forex per il mercato FX", "www.mataf.net/en/"),
        tool("secondary", "COT Reports Weekly", "📋", "COT", "Sommario settimanale COT report", "cot-reports.com"),
        tool("secondary", "DIX Monitor", "🔬", "Sentiment", "Dark Pool Index — acquisti istituzionali", "squeezemetrics.com/monitor/dix"),
        tool("secondary", "Pi Cycle Top", "⬆️", "Bitcoin", "Pi Cycle Top per identificare i massimi di ciclo", "charts.bitbo.io/pi-cycle-top/"),
        tool("secondary", "Stock-to-Flow", "🔄", "Bitcoin", "Modello Stock-to-Flow per Bitcoin", "charts.bitbo.io/stock-to-flow/"),
        tool("secondary", "Trading Economics", "🌍", "Sentiment", "Dati macroeconomici globali", "tradingeconomics.com"),
        tool("secondary", "Check On Chain", "⛓️", "On-Chain", "Dashboard on-chain Bitcoin", "charts.checkonchain.com"),
        tool("secondary", "Barchart", "📊", "COT", "Dati futures, opzioni e COT report", "barchart.com"),
        tool("rates", "Condor Edge", "🦅", "Multi-CB", "All banks", "condoredge.com", "Multi-CB"),
        tool("rates", "RBA Watch", "🇦🇺", "RBA", "Aspettative tassi RBA in tempo reale", "rbaratewatch.com", "RBA"),
        tool("rates", "ECB Watch", "🇪🇺", "ECB", "Aspettative tassi BCE in tempo reale", "ecb-watch.eu", "ECB"),
        tool("rates", "Central Bank Watch", "🌍", "Multi-CB", "Dashboard globale aspettative tassi", "centralbank.watch", "Multi-CB"),
    ]
    return dict(updated=datetime.now().isoformat(timespec="seconds"),
                assets=assets, ideas=ideas, agri=agri, stocks=[], tools=tools)


URL_FIXES = {"worldgovernmentbonds.com": "www.worldgovernmentbonds.com", "tradingster.com": "www.tradingster.com",
             "myfxbook.com/community/outlook": "www.myfxbook.com/community/outlook", "mataf.net": "www.mataf.net/en/"}


def migrate(data):
    """Porta data.json esistenti al modello corrente."""
    changed = False
    fresh = None
    if any("longTerm" not in a for a in data.get("assets", [])):
        fresh = fresh or seed()
        data["assets"] = fresh["assets"]; changed = True
    if "rates" in data:
        del data["rates"]; changed = True
    if "stocks" not in data:
        data["stocks"] = []; changed = True
    for r in data.get("agri", []):
        if "cotIndex" not in r:
            r["cotIndex"] = 50; r.pop("position", None); changed = True
    for t in data.get("tools", []):
        if t.get("url") in URL_FIXES:
            t["url"] = URL_FIXES[t["url"]]; changed = True
    return changed


def load():
    if not DATA_FILE.exists():
        save(seed())
    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    if migrate(data):
        save(data)
    return data


def save(data):
    data["updated"] = datetime.now().isoformat(timespec="seconds")
    DATA_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


COLLECTIONS = {"assets", "ideas", "agri", "stocks", "tools"}


def _check(col):
    if col not in COLLECTIONS:
        abort(404)


@app.get("/")
def index():
    return (BASE / "templates" / "index.html").read_text(encoding="utf-8")


@app.get("/api/data")
def all_data():
    with LOCK:
        return jsonify(load())


@app.post("/api/<col>")
def create(col):
    _check(col)
    with LOCK:
        data = load()
        item = {**(request.get_json(silent=True) or {}), "id": _id()}
        data[col].append(item)
        save(data)
    return jsonify(item), 201


@app.put("/api/<col>/<item_id>")
def update(col, item_id):
    _check(col)
    with LOCK:
        data = load()
        for i, it in enumerate(data[col]):
            if it["id"] == item_id:
                data[col][i] = {**it, **(request.get_json(silent=True) or {}), "id": item_id}
                save(data)
                return jsonify(data[col][i])
    abort(404)


@app.delete("/api/<col>/<item_id>")
def delete(col, item_id):
    _check(col)
    with LOCK:
        data = load()
        n = len(data[col])
        data[col] = [it for it in data[col] if it["id"] != item_id]
        if len(data[col]) == n:
            abort(404)
        save(data)
    return "", 204


if __name__ == "__main__":
    load()
    print("\n  COT Report Hub → http://localhost:5050\n")
    app.run(host="127.0.0.1", port=5050, debug=False)
