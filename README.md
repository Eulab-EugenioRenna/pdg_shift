# Grace Services - Gestione Volontari per Chiese

Grace Services è una moderna applicazione web progettata per semplificare e ottimizzare la gestione dei volontari e la pianificazione dei servizi all'interno delle organizzazioni ecclesiastiche. Sviluppata con un'architettura moderna, offre strumenti intuitivi sia per gli amministratori che per i volontari, integrando anche un assistente basato su IA per rendere la composizione dei team più rapida ed efficiente.

## Funzionalità Principali

- **Gestione Multi-Chiesa**: Un'unica piattaforma per gestire diverse sedi o campus.
- **Accesso Basato sui Ruoli**: Permessi differenziati per Superuser, Coordinatori, Leader di servizio e Volontari.
- **Dashboard Intelligente**: Una panoramica immediata dei prossimi eventi e delle criticità da risolvere, come leader mancanti, ruoli scoperti o conflitti di disponibilità.
- **Pianificazione Eventi**: Crea eventi singoli o ricorrenti (es. Culto Domenicale) con facilità.
- **Assegnazione Team Intuitiva**: Assegna leader e membri del team a ruoli specifici all'interno di un servizio.
- **Assistente IA**: Utilizza l'intelligenza artificiale per ricevere suggerimenti sui volontari più adatti a ricoprire le posizioni vacanti, basandosi su competenze e preferenze.
- **Gestione Indisponibilità**: I volontari possono segnare i periodi in cui non sono disponibili, evitando assegnazioni errate.
- **Notifiche**: Sistema di notifiche in-app per tenere tutti aggiornati.
- **Design Moderno e Responsivo**: Interfaccia utente pulita, moderna e utilizzabile sia su desktop che su dispositivi mobili.

## Stack Tecnologico

- **Framework Frontend**: [Next.js](https://nextjs.org/) con App Router
- **Linguaggio**: [TypeScript](https://www.typescriptlang.org/)
- **UI Components**: [Shadcn/ui](https://ui.shadcn.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Backend & Database**: [PocketBase](https://pocketbase.io/) (utilizzato come BaaS - Backend-as-a-Service)
- **Intelligenza Artificiale**: [Google AI & Genkit](https://firebase.google.com/docs/genkit)
- **Autenticazione**: Gestita tramite PocketBase (Email/Password e OAuth con Google)

## Primi Passi

### Prerequisiti

- [Node.js](https://nodejs.org/en) (versione 18 o successiva)
- [npm](https://www.npmjs.com/) o un altro package manager

### Installazione

1.  **Clona il repository**:
    ```bash
    git clone [URL_DEL_TUO_REPOSITORY]
    cd [NOME_DELLA_CARTELLA]
    ```

2.  **Installa le dipendenze**:
    ```bash
    npm install
    ```

3.  **Configura le variabili d'ambiente**:
    Crea un file `.env.local` nella root del progetto e aggiungi le variabili necessarie. Per PocketBase, avrai bisogno dell'URL del tuo server.
    ```env
    # Esempio per PocketBase
    POCKETBASE_URL=https://tuo-server.pocketbase.io
    ```

### Avviare l'Applicazione

Per avviare il server di sviluppo in locale, esegui:
```bash
npm run dev
```
L'applicazione sarà disponibile all'indirizzo `http://localhost:3000` (o la porta specificata).

## Struttura del Progetto

```
/
├── src/
│   ├── app/                # Pagine principali dell'applicazione (App Router)
│   │   ├── (auth)/         # Pagine di autenticazione (login, register)
│   │   ├── (app)/          # Pagine protette dopo il login (dashboard, etc.)
│   │   ├── layout.tsx
│   │   └── page.tsx        # Landing page
│   ├── components/         # Componenti React riutilizzabili
│   │   ├── ui/             # Componenti base di Shadcn/ui
│   │   └── ...
│   ├── contexts/           # React Context (es. AuthContext)
│   ├── hooks/              # Custom hooks
│   ├── lib/                # Funzioni di utilità e configurazioni (es. PocketBase, utils)
│   └── ai/                 # Logica relativa a Genkit e IA
│       ├── flows/          # Flussi Genkit
│       └── genkit.ts       # Configurazione del client Genkit
├── public/                 # File statici
└── ...                     # File di configurazione (tailwind.config.ts, next.config.ts, etc.)

```
