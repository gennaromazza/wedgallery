#!/bin/bash
# Script per generare la build di produzione e preparare i file per Netsons

# Imposta l'ambiente di produzione
export NODE_ENV=production

# Colori per output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Iniziando la build di produzione...${NC}"

# Controlla se la cartella dist esiste e la svuota
if [ -d "dist" ]; then
  echo "Pulisco la cartella dist esistente..."
  rm -rf dist/*
else
  echo "Creo la cartella dist..."
  mkdir -p dist
fi

# Esegui la build del client
echo -e "${YELLOW}Eseguendo build del client...${NC}"
cd client && npm run build
build_status=$?

if [ $build_status -ne 0 ]; then
  echo -e "${RED}Errore durante la build del client!${NC}"
  exit 1
fi

# Copia il file .htaccess nella cartella di output
echo -e "${YELLOW}Copiando configurazione .htaccess...${NC}"
cp client/public/.htaccess dist/public/

# Crea un file README con istruzioni per il deployment
echo -e "${YELLOW}Creando istruzioni di deployment...${NC}"
cat > dist/README.txt << EOL
ISTRUZIONI PER IL DEPLOYMENT SU NETSONS

1. Caricare tutti i file della cartella 'public' nella sottocartella 'wedgallery' 
   del tuo hosting Netsons dove è presente WordPress.

2. Assicurarsi che il file .htaccess sia stato caricato correttamente.

3. Verificare che il modulo mod_rewrite di Apache sia abilitato sul server.

4. Impostare i permessi corretti (in genere 644 per i file e 755 per le cartelle).

5. Verificare che il sito sia accessibile all'URL: https://tuodominio.it/wedgallery/

Per problemi di routing:
- Verificare che le regole nel file .htaccess funzionino correttamente
- Controllare che non ci siano conflitti con la configurazione di WordPress

Per ulteriori informazioni, consultare la documentazione.
EOL

echo -e "${GREEN}Build completata con successo!${NC}"
echo -e "${GREEN}I file di produzione sono disponibili nella cartella:${NC} dist/public"
echo -e "${YELLOW}Consulta dist/README.txt per le istruzioni di deployment.${NC}"