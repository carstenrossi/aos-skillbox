# Admin User Management - Skillbox

## Überblick

Das Admin-User-Management-System bietet umfassende Funktionen für die Verwaltung von Benutzern durch Administratoren. Es umfasst Sicherheitsfeatures, Audit-Logging und E-Mail-Benachrichtigungen.

## Features

### ✅ Implementiert

- **Admin-User-Erstellung** mit E-Mail/Passwort
- **Self-Service Passwort-Änderung** für User
- **Admin-Override** für alle Passwörter
- **Passwort-Reset per E-Mail** mit Bestätigungslink
- **Passwort-Richtlinien** (Mindestlänge, Komplexität)
- **Rate Limiting** für Reset-Versuche (Spam-Schutz)
- **Token-Expiration** für Reset-Links
- **Audit-Trail** für alle Admin-Passwort-Zugriffe
- **E-Mail-Validierung** bei User-Erstellung
- **Passwort-Stärke-Anzeige** im Backend
- **Bestätigungs-E-Mails** bei Passwort-Änderungen
- **E-Mail-Templates** für verschiedene Szenarien
- **Brevo SMTP Integration**

## API Endpunkte

### User Management

#### Benutzer erstellen
```http
POST /api/admin/users
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "SecurePassword123!",
  "first_name": "Test",
  "last_name": "User",
  "role": "user",
  "sendWelcomeEmail": true
}
```

#### Alle Benutzer abrufen
```http
GET /api/admin/users?page=1&limit=50&role=user&search=test
Authorization: Bearer <admin_token>
```

#### Benutzer-Details abrufen
```http
GET /api/admin/users/:userId
Authorization: Bearer <admin_token>
```

#### Benutzerrolle ändern
```http
PUT /api/admin/users/:userId/role
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "role": "manager"
}
```

#### Passwort zurücksetzen (Admin)
```http
PUT /api/admin/users/:userId/password
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "newPassword": "NewSecurePassword123!",
  "sendNotification": true
}
```

#### Benutzer aktivieren/deaktivieren
```http
PUT /api/admin/users/:userId/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "isActive": false
}
```

#### Benutzer löschen (Soft Delete)
```http
DELETE /api/admin/users/:userId
Authorization: Bearer <admin_token>
```

### Passwort-Management

#### Sicheres Passwort generieren
```http
POST /api/admin/password/generate
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "length": 16,
  "role": "admin"
}
```

#### Passwort-Stärke validieren
```http
POST /api/admin/password/validate
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "password": "TestPassword123!",
  "username": "testuser",
  "email": "test@example.com",
  "role": "user"
}
```

### Audit & Logging

#### Audit-Logs abrufen
```http
GET /api/admin/audit/logs?page=1&limit=50&severity=HIGH&adminUserId=admin123
Authorization: Bearer <admin_token>
```

#### Audit-Statistiken
```http
GET /api/admin/audit/stats?timeRange=24h
Authorization: Bearer <admin_token>
```

#### Audit-Logs exportieren
```http
GET /api/admin/audit/export?format=csv&startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <admin_token>
```

### System-Management

#### E-Mail-Test
```http
POST /api/admin/email/test
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "to": "admin@example.com"
}
```

#### System-Gesundheitscheck
```http
GET /api/admin/system/health
Authorization: Bearer <admin_token>
```

## Sicherheitsrichtlinien

### Passwort-Richtlinien

#### Standard-Benutzer
- Mindestlänge: 8 Zeichen
- Großbuchstaben erforderlich
- Kleinbuchstaben erforderlich
- Zahlen erforderlich
- Sonderzeichen erforderlich (min. 1)

#### Manager
- Mindestlänge: 10 Zeichen
- Alle Standard-Anforderungen
- Mindestens 1 Sonderzeichen

#### Administrator
- Mindestlänge: 12 Zeichen
- Alle Standard-Anforderungen
- Mindestens 2 Sonderzeichen
- Max. 2 aufeinanderfolgende Zeichen

### Verbotene Muster
- Gängige Passwörter (Top 100)
- Sequentielle Zeichen (123, abc)
- Tastaturmuster (qwerty, asdf)
- Benutzername im Passwort
- E-Mail-Adresse im Passwort
- Projekt-spezifische Begriffe (skillbox, admin, etc.)

## E-Mail-Konfiguration

### Brevo SMTP Setup

1. **Account erstellen** bei [Brevo](https://www.brevo.com)
2. **SMTP-Zugangsdaten** generieren
3. **Umgebungsvariablen** setzen:

```bash
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-brevo-email@domain.com
SMTP_PASS=your-brevo-smtp-key
SMTP_FROM="Skillbox" <noreply@your-domain.com>
```

### Alternative E-Mail-Provider

#### Gmail
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password
```

#### Outlook
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

## E-Mail-Templates

### Verfügbare E-Mail-Templates
- **welcome**: Willkommens-E-Mail für neue Benutzer
- **password-reset**: Passwort-Reset-Link
- **password-reset-notification**: Bestätigung nach Passwort-Änderung
- **role-change**: Benachrichtigung bei Rollenänderung
- **account-status**: Account-Aktivierung/Deaktivierung

### Template-Variablen
- `{{firstName}}` - Vorname des Benutzers
- `{{username}}` - Benutzername
- `{{email}}` - E-Mail-Adresse
- `{{resetUrl}}` - Passwort-Reset-URL
- `{{loginUrl}}` - Login-URL
- `{{temporaryPassword}}` - Temporäres Passwort
- `{{year}}` - Aktuelles Jahr

## Audit-Logging

### Geloggte Aktionen
- **Benutzer-Management**: CREATE_USER, UPDATE_USER, DELETE_USER, UPDATE_USER_ROLE
- **Passwort-Management**: RESET_USER_PASSWORD
- **Account-Management**: ACTIVATE_USER, DEACTIVATE_USER
- **Sicherheit**: LOGIN_AS_USER, FORCE_LOGOUT_USER

### Severity-Level
- **LOW**: Normale Aktionen (z.B. Benutzer anzeigen)
- **MEDIUM**: Benutzer erstellen/ändern
- **HIGH**: Rollenänderungen, Account-Deaktivierung
- **CRITICAL**: Passwort-Resets, Benutzer löschen

### Audit-Log-Felder
- `timestamp`: Zeitstempel der Aktion
- `adminUserId`: ID des ausführenden Administrators
- `action`: Art der Aktion
- `targetUserId`: ID des betroffenen Benutzers
- `details`: Zusätzliche Details zur Aktion
- `ipAddress`: IP-Adresse des Administrators
- `userAgent`: Browser/Client-Information
- `severity`: Schweregrad der Aktion

## Rate Limiting

### Admin-API
- **100 Anfragen** pro 15 Minuten pro IP
- **Separate Limits** für verschiedene Aktionen

### E-Mail-Versand
- **5 E-Mails** pro Stunde pro E-Mail-Adresse
- **Automatische Verzögerung** bei verdächtigen Aktivitäten

## Installation & Setup

### 1. Dependencies installieren
```bash
cd backend
npm install
```

### 2. Umgebungsvariablen konfigurieren
Kopiere `.env.example` zu `.env` und konfiguriere:
- SMTP-Einstellungen
- JWT-Secrets
- Admin-Zugangsdaten

### 3. Server starten
```bash
npm run dev
```

### 4. Admin-Account testen
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

## Sicherheitshinweise

### Produktions-Setup
1. **Starke JWT-Secrets** verwenden
2. **HTTPS** für alle Verbindungen
3. **Rate Limiting** aktivieren
4. **Audit-Logs** regelmäßig überprüfen
5. **E-Mail-Verschlüsselung** aktivieren
6. **Backup-Strategie** für Audit-Logs

### DSGVO-Compliance
- **Datenschutz-Hinweise** in E-Mails
- **Audit-Log-Retention** konfigurieren
- **Daten-Export-Funktionen** für Benutzer
- **Daten-Löschung** bei Account-Deaktivierung

## Troubleshooting

### E-Mail wird nicht versendet
1. SMTP-Konfiguration prüfen
2. Netzwerk-Firewall-Einstellungen
3. E-Mail-Provider-Limits
4. Log-Dateien analysieren: `logs/audit.log`

### Passwort-Validation schlägt fehl
1. Passwort-Richtlinien überprüfen
2. Rollenspezifische Anforderungen beachten
3. Verbotene Muster vermeiden

### Audit-Logs fehlen
1. Schreibberechtigungen für `logs/` Ordner
2. Speicherplatz verfügbar
3. Winston-Logger-Konfiguration

## API-Antwortformat

### Erfolgreiche Antwort
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user123",
      "username": "testuser",
      "email": "test@example.com",
      "role": "user",
      "is_active": true,
      "created_at": "2024-01-01T10:00:00.000Z"
    }
  },
  "message": "User created successfully",
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

### Fehler-Antwort
```json
{
  "success": false,
  "error": {
    "message": "Username already exists",
    "code": "USERNAME_EXISTS",
    "details": ["validation details"]
  },
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

## Nächste Schritte

1. **Frontend-Integration** für Admin-Panel
2. **Multi-Factor Authentication** (MFA)
3. **Advanced Role-Based Permissions**
4. **Bulk-User-Operations**
5. **API-Key-Management**
6. **Single Sign-On (SSO) Integration** 