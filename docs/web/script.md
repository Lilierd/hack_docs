# Script

## Automatisation des premières étapes d'un pentest web
### Explication
Voici un petit script que j'ai créé permettant de lancer un nmap, un subfinder et un ffuf sur un domaine ou une adresse IP.

Vous pouvez le lancer comme ceci :

```
./start.sh domaine <nom de domaine> --onmap=/path/to/outputnmap.txt --offuf=/path/to/outputffuf.json --osub=/path/to/outputsubfinder.txt --wordlist=/path/to/wordlist.txt --rate=<number>
```
### Script
```
#!/bin/bash

set -Eeuo pipefail

MODE=""
TARGET=""
NMAP_OUTPUT=""
FFUF_OUTPUT=""
SUB_OUTPUT=""
WORDLIST=""
RATE="${RATE:-40}"
HTTP="https"

usage() {
    cat <<EOF
Usage:
  $0 <ip|domaine> <cible> [options]

Options:
  --onmap=FILE       Sortie Nmap
  --offuf=FILE       Sortie FFUF
  --osub=FILE        Sortie Subfinder
  --wordlist=FILE    Wordlist FFUF
  --rate=N           Nombre de threads FFUF (défaut : 40)
  --http=SCHEMA      http ou https (défaut : https)
  -h, --help         Afficher cette aide

Exemples:
  $0 ip 192.168.1.10 \\
    --onmap=nmap.txt \\
    --offuf=ffuf.json \\
    --wordlist=wordlist.txt

  $0 domaine exemple.com \\
    --onmap=nmap.txt \\
    --offuf=ffuf.json \\
    --osub=subdomains.txt \\
    --wordlist=wordlist.txt
EOF
}

[[ $# -ge 2 ]] || {
    usage
    exit 1
}

MODE="$1"
TARGET="$2"
shift 2

for arg in "$@"; do
    case "$arg" in
        --onmap=*) NMAP_OUTPUT="${arg#*=}" ;;
        --offuf=*) FFUF_OUTPUT="${arg#*=}" ;;
        --osub=*) SUB_OUTPUT="${arg#*=}" ;;
        --wordlist=*) WORDLIST="${arg#*=}" ;;
        --rate=*) RATE="${arg#*=}" ;;
        --http=*) HTTP="${arg#*=}" ;;
        -h|--help) usage; exit 0 ;;
        *)
            echo "[!] Argument inconnu : $arg"
            exit 1
            ;;
    esac
done

# Vérification des paramètres
[[ -n "$NMAP_OUTPUT" ]] || {
    echo "[!] --onmap obligatoire"
    exit 1
}

[[ -n "$FFUF_OUTPUT" ]] || {
    echo "[!] --offuf obligatoire"
    exit 1
}

[[ -n "$WORDLIST" && -f "$WORDLIST" ]] || {
    echo "[!] Wordlist introuvable"
    exit 1
}

for tool in nmap ffuf; do
    command -v "$tool" >/dev/null 2>&1 || {
        echo "[!] $tool manquant"
        exit 1
    }
done

# Validation du schéma
case "${HTTP,,}" in
    http|https) HTTP="${HTTP,,}" ;;
    *)
        echo "[!] --http doit valoir 'http' ou 'https' (valeur reçue : $HTTP)"
        exit 1
        ;;
esac

if [[ "$MODE" == "domaine" ]]; then
    [[ -n "$SUB_OUTPUT" ]] || {
        echo "[!] --osub obligatoire en mode domaine"
        exit 1
    }

    command -v subfinder >/dev/null 2>&1 || {
        echo "[!] Subfinder manquant"
        exit 1
    }
fi

# Préparation des répertoires
for file in "$NMAP_OUTPUT" "$FFUF_OUTPUT"; do
    mkdir -p "$(dirname "$file")"
done

if [[ "$MODE" == "domaine" ]]; then
    mkdir -p "$(dirname "$SUB_OUTPUT")"
fi

echo "[+] Mode : $MODE"
echo "[+] Cible : $TARGET"
echo "[+] Nmap output : $NMAP_OUTPUT"
echo "[+] FFUF output : $FFUF_OUTPUT"
echo "[+] Schéma : $HTTP"
echo "[+] Threads FFUF : ${RATE:-40}"

if [[ "$MODE" == "domaine" ]]; then
    echo "[+] Subfinder output : $SUB_OUTPUT"
fi

echo "[+] Configuration validée."
echo "[+] Prêt pour les opérations sur une cible autorisée."

# Tableau des PIDs lancés
PIDS=()
NAMES=()
OUTPUTS=()

launch() {
    local name="$1"
    shift
    echo "[+] Lancement de $name..."
    "$@" &
    PIDS+=("$!")
    NAMES+=("$name")
    OUTPUTS+=("")
}

# --- Construction des commandes ---

NMAP_CMD=(nmap -p- -T4 -oN "$NMAP_OUTPUT" "$TARGET")
FFUF_CMD=(ffuf -s -w "$WORDLIST" -u "${HTTP}://${TARGET}/FUZZ" -o "$FFUF_OUTPUT" -of json -t "$RATE")

# --- Lancement en parallèle ---

launch "Nmap" "${NMAP_CMD[@]}"
launch "FFUF" "${FFUF_CMD[@]}" > /dev/null 2>&1

if [[ "$MODE" == "domaine" ]]; then
    launch "Subfinder" subfinder -d "$TARGET" -o "$SUB_OUTPUT"
fi

# --- Attente et vérification des codes de sortie ---

FAIL=0
for i in "${!PIDS[@]}"; do
    pid="${PIDS[$i]}"
    name="${NAMES[$i]}"
    if wait "$pid"; then
        echo "[+] $name terminé avec succès (PID $pid)"
    else
        rc=$?
        echo "[!] $name a échoué (PID $pid, code $rc)"
        FAIL=1
    fi
done

if [[ "$FAIL" -eq 0 ]]; then
    echo "[+] Tous les outils ont terminé avec succès."
else
    echo "[!] Un ou plusieurs outils ont échoué."
    exit 1
fi
```
### Récriture du résultat de la sortie du ffuf
La sortie du ffuf en format json est pour moi imbuvable, j'ai donc fais un petit script python permettant de prendre ce json et l'écrire de manière plus jolie dans notre terminal sous la forme :

```
status : <Status code>, length : <length of the page>, url : <url>
```

Vous pouvez l'exécuter comme ceci : 

```
python3 cleanFfuf.py ffufoutput.json
```

### Script

```

#!/usr/bin/env python3

import json
import sys

def extract_urls(filename):
    try:
        with open(filename, "r", encoding="utf-8") as file:
            data = json.load(file)

        results = data.get("results", [])

        for item in results:
            url = item.get("url")
            status = item.get("status", [])
            length = item.get("length", [])
            if url:
                print(f"status : {status}, length : {length}, url : {url}")

    except FileNotFoundError:
        print(f"[!] Fichier introuvable : {filename}")
    except json.JSONDecodeError:
        print("[!] JSON invalide")
    except Exception as e:
        print(f"[!] Erreur : {e}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(f"Usage : python3 {sys.argv[0]} fichier.json")
        sys.exit(1)

    extract_urls(sys.argv[1])
```