#!/bin/bash
# COT Report Hub — avvio per macOS (doppio click)
cd "$(dirname "$0")" || exit 1
PORT=5050

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 non trovato. Installalo da https://www.python.org/downloads/ e riprova."
  read -n 1 -s -r -p "Premi un tasto per chiudere..."; exit 1
fi

if [ ! -d venv ]; then
  echo "Creo l'ambiente virtuale (solo la prima volta)..."
  python3 -m venv venv || { echo "Errore nella creazione del venv."; read -n 1 -s -r -p "Premi un tasto..."; exit 1; }
fi

echo "Controllo le dipendenze..."
./venv/bin/python -m pip install -q --disable-pip-version-check -r requirements.txt || { echo "Errore installazione dipendenze."; read -n 1 -s -r -p "Premi un tasto..."; exit 1; }

# libera la porta se un'istanza precedente è ancora attiva
OLD=$(lsof -ti :$PORT 2>/dev/null)
[ -n "$OLD" ] && kill $OLD 2>/dev/null && sleep 1

(sleep 2 && open "http://localhost:$PORT") &
echo "COT Report Hub in esecuzione su http://localhost:$PORT  (chiudi questa finestra per fermarlo)"
./venv/bin/python app.py
