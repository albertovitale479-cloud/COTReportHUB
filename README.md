# COT Report Hub

Dashboard locale per l'analisi COT (Commitment of Traders): asset database con board per bias,
Agriculture (COT Index), Stock Picking e raccolta di Tools.

## Avvio

Serve solo **Python 3** installato.

- **Mac:** doppio click su `Avvia COT Hub (Mac).command`
  (prima volta: tasto destro → Apri). Da terminale: `./run.sh`
- **Windows:** doppio click su `Avvia COT Hub (Windows).bat`

Al primo avvio lo script crea il tuo ambiente virtuale, installa le dipendenze e crea il tuo
database (`data.json`) con i dati di partenza. Poi si apre http://localhost:5050.

## Dati

Ogni utente ha il proprio `data.json` locale (non è versionato su Git). Per ripartire da zero basta
cancellarlo: verrà ricreato al prossimo avvio.
