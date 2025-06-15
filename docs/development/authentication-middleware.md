# Authentication Middleware Dokumentation

## Übersicht

Das Skillbox Backend System verwendet **zwei verschiedene Middleware-Versionen** für die JWT-Authentifizierung. Diese Trennung wurde aufgrund von TypeScript-Kompatibilitätsproblemen mit Multer bei File Upload Operationen eingeführt.

## 🔐 Middleware-Versionen

### 1. `authenticateToken` (Standard)

**Datei**: `backend/src/middleware/auth.ts`

```typescript
export const authenticateToken = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void>
```

#### Eigenschaften:
- **Parameter**: `AuthenticatedRequest` (Custom Interface)
- **Typisierung**: Direkt `req.user = { ... }` ohne Type Assertion
- **Verwendung**: Standard API-Routes

#### Verwendet in:
- `backend/src/routes/auth.ts` - Authentifizierung Routes
- `backend/src/routes/admin.ts` - Admin Panel Routes  
- `backend/src/routes/conversations.ts` - Chat/Conversation Routes

### 2. `authenticateTokenStandard` (Multer-Kompatibel)

**Datei**: `backend/src/middleware/auth.ts`

```typescript
export const authenticateTokenStandard = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void>
```

#### Eigenschaften:
- **Parameter**: Standard Express `Request`
- **Typisierung**: `(req as any).user = { ... }` mit Type Assertion
- **Verwendung**: File Upload Routes mit Multer

#### Verwendet in:
- `backend/src/routes/files.ts` - Alle File Upload Endpoints

## 🎯 Warum zwei Versionen?

### Das TypeScript-Kompatibilitätsproblem

**Problem**: Multer erweitert den Express `Request` mit zusätzlichen Properties für File Handling:
```typescript
// Multer fügt hinzu:
interface MulterRequest extends Request {
  file?: Express.Multer.File;
  files?: Express.Multer.File[];
}
```

**Konflikt**: Unser `AuthenticatedRequest` Interface hatte Konflikte mit Multer's Request-Erweiterungen:
```
Error: Type 'Request' is missing properties from type 'AuthenticatedRequest': 
cache, credentials, destination, integrity, and 14 more
```

### Die Lösung

1. **Standard Middleware** für normale API-Routes
2. **Standard-kompatible Middleware** für Multer File Upload Routes
3. **Type Guards** für sichere User-Validierung in File Routes

## 🛡️ Type Guards

Für die `authenticateTokenStandard` Middleware verwenden wir Type Guards:

```typescript
// In backend/src/routes/files.ts
const isAuthenticated = (req: Request): req is Request & { user: JWTPayload } => {
  return 'user' in req && req.user !== undefined;
};

// Verwendung:
if (!isAuthenticated(req)) {
  res.status(401).json({
    success: false,
    error: { message: 'Authentication required', code: 'NOT_AUTHENTICATED' }
  });
  return;
}
// Jetzt ist req.user typsicher verfügbar
```

## 🔧 Funktionalität

Beide Middleware-Versionen bieten **identische Funktionalität**:

### JWT Token Verifikation
- Extraktion des Bearer Tokens aus Authorization Header
- JWT Signatur-Verifikation mit `JWT_SECRET`
- Token Expiry Validation

### User Validation
- Überprüfung ob User in Datenbank existiert
- Validation des `is_active` Status
- Aktualisierung der User-Daten im Token Payload

### Error Handling
- Strukturierte Error Responses
- Development vs Production Error Details
- Konsistente HTTP Status Codes

### User Payload
Beide Middleware setzen identische User-Daten:
```typescript
req.user = {
  userId: user.id,
  username: user.username,
  email: user.email,
  role: user.role,
  isAdmin: user.is_admin,
  iat: decoded.iat,
  exp: decoded.exp
};
```

## 📍 Verwendungsrichtlinien

### Wann `authenticateToken` verwenden:
- Standard API-Routes ohne File Upload
- Routes die `AuthenticatedRequest` Interface nutzen
- Alle bestehenden Routes (außer File Upload)

### Wann `authenticateTokenStandard` verwenden:
- File Upload Routes mit Multer
- Routes die Standard Express `Request` benötigen
- Neue Routes mit komplexen Request-Erweiterungen

## 🔄 Migration Überlegungen

### Mögliche Vereinfachung:
Das System könnte auf **eine einzige Middleware** vereinfacht werden durch:

1. **Verbessertes AuthenticatedRequest Interface**
   - Bessere Kompatibilität mit Express Request
   - Entfernung konfliktierender Properties

2. **Universelle Type Guards**
   - Einheitliche User-Validierung
   - Runtime Type Safety

3. **Multer-kompatible Typisierung**
   - Conditional Types für File Upload Routes
   - Generische Request-Erweiterungen

### Aktueller Status:
- ✅ **Funktional**: Beide Middleware arbeiten korrekt
- ✅ **Getestet**: File Upload und Standard Routes funktionieren
- ✅ **Typsicher**: Type Guards gewährleisten Sicherheit
- ⚠️ **Redundant**: Code-Duplikation zwischen beiden Versionen

## 🚀 Implementierungsdetails

### JWT Konfiguration
```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
```

### Error Response Format
```typescript
{
  success: false,
  error: {
    message: string,
    code: string,
    details?: string // nur in development
  },
  timestamp: string
}
```

### Unterstützte Error Codes
- `MISSING_TOKEN` - Kein Authorization Header
- `INVALID_TOKEN` - JWT Verifikation fehlgeschlagen
- `USER_INACTIVE` - User existiert nicht oder ist deaktiviert

## 📝 Wartung

### Bei Änderungen an der Authentifizierung:
1. **Beide Middleware** müssen synchron gehalten werden
2. **Tests** für beide Versionen durchführen
3. **Error Handling** konsistent halten
4. **JWT Payload** Struktur beibehalten

### Monitoring:
- Logs überwachen für Authentication Errors
- Performance beider Middleware vergleichen
- Type Safety Violations beobachten

---

**Erstellt**: 2025-06-15  
**Version**: 1.0  
**Status**: Aktiv - Zwei Middleware-Versionen in Produktion 