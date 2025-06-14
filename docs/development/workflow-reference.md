# 🚀 Skillbox Workflow Quick Reference

## 🎯 **MANDATORY 3-STAGE WORKFLOW**

```
1. 💻 Local Source Code Development  →  2. 🐳 Docker Dev Testing  →  3. 🚀 Production Deployment
```

### ⚠️ **GOLDEN RULE:**
**NIEMALS direkt in Docker entwickeln!** Alle Änderungen MÜSSEN im lokalen Source Code beginnen!

---

## 📋 **Quick Commands**

### Stage 1: Local Development
```bash
# Backend (Terminal 1)
cd backend && npm run dev

# Frontend (Terminal 2) 
cd frontend && npm start

# Test: http://localhost:3000
```

### Stage 2: Docker Dev Testing
```bash
# Build & Test Docker Images
./scripts/build-smart.sh -e development
docker-compose -f docker-compose.dev.yml up -d

# Test: http://localhost:3003 (Frontend) + http://localhost:3002 (Backend)
```

### Stage 3: Production Deployment
```bash
# Build & Push Production Images (automatisch Multi-Platform!)
./scripts/build-smart.sh -e production -p

# ✅ Automatisch: AMD64 + ARM64 Support
# ✅ Automatisch: latest-production Tags
# ✅ Automatisch: Multi-Platform Manifest Verification
```

---

## 🔧 **Environment Mapping**

| Environment | Frontend Port | Backend Port | API URL Detection | Platform Support |
|-------------|---------------|--------------|-------------------|------------------|
| **Local**   | 3000          | 3001         | `localhost:3001`  | Local Platform   |
| **Docker Dev** | 3003      | 3002         | `localhost:3002`  | Local Platform   |
| **Production** | 80        | 3001         | Relative URLs     | **Multi-Platform (AMD64+ARM64)** |

---

## 🚨 **Platform-Kompatibilität (WICHTIG!)**

### ✅ **Automatisch gelöst:**
- **Production**: Verwendet automatisch Multi-Platform (AMD64 + ARM64)
- **Elestio Support**: Server pullt automatisch die richtige Architektur  
- **Manifest-Schutz**: Multi-Platform Manifests werden nicht überschrieben
- **Verification**: Script prüft Multi-Platform Manifest nach Build

### 🔍 **Wie erkenne ich Platform-Probleme:**
```bash
# ❌ BAD: "exec format error" in Container-Logs
# ❌ BAD: Platform-Mismatch Warnungen beim Docker Pull
# ❌ BAD: Container starten aber funktionieren nicht

# ✅ GOOD: Multi-Platform Manifest Verification im Build-Log
# ✅ GOOD: Container starten und funktionieren korrekt
```

### 🛠️ **Bei Platform-Problemen:**
```bash
# 1. Überprüfe Multi-Platform Manifest
docker buildx imagetools inspect ghcr.io/carstenrossi/skillbox-backend:latest-production

# 2. Sollte zeigen: linux/amd64 + linux/arm64

# 3. Falls nicht: Neu bauen mit korrigiertem Script
./scripts/build-smart.sh -e production -p
```

---

## 📁 **Key Files**

- `DEPLOYMENT.md` - Complete workflow documentation
- `scripts/build-smart.sh` - **FIXED** Multi-Platform Build script
- `frontend/src/config/index.ts` - Smart API URL detection
- `docker-compose.dev.yml` - Development containers
- `docker-compose.prod.yml` - **FIXED** Production containers mit latest-production

---

## 🚨 **Troubleshooting**

| Problem | Likely Cause | Solution |
|---------|--------------|----------|
| CORS errors | Wrong API URL | Check `config/index.ts` |
| 401 Auth errors | Token not sent | Check localStorage & headers |
| API format errors | Inconsistent responses | Use `{ success: true, data: {...} }` |
| **exec format error** | **Platform mismatch** | **Use production build script (auto Multi-Platform)** |
| **502 Bad Gateway** | **Container nicht erreichbar** | **Überprüfe Platform + Container-Status** |

---

## ✅ **Deployment Checklist**

- [ ] All changes made in **local source code**
- [ ] **Local testing** completed (localhost:3000)
- [ ] **Docker dev build** successful (`./scripts/build-smart.sh -e development`)
- [ ] **Docker dev testing** completed (localhost:3003)
- [ ] **Production build & push** successful (`./scripts/build-smart.sh -e production -p`)
- [ ] **Multi-Platform manifest** verified (automatisch im Script)
- [ ] **docker-compose.prod.yml** uses latest-production tags
- [ ] **Production deployment** tested

---

## 🔒 **Platform-Problem Prevention**

### **Niemals manuell:**
```bash
# ❌ NIEMALS: Manuelle Platform-spezifische Builds
docker build --platform linux/amd64

# ❌ NIEMALS: Direkte Image Tags ohne Script
docker tag local-image registry/image:tag
```

### **Immer verwenden:**
```bash
# ✅ IMMER: Smart Build Script für Production
./scripts/build-smart.sh -e production -p

# ✅ IMMER: latest-production Tags in docker-compose.prod.yml  
# ✅ IMMER: Multi-Platform Manifest Verification prüfen
```

---

**🔄 REMEMBER:** Source Code → Docker Dev → Docker Production (Multi-Platform)  
**📖 FULL DOCS:** See `DEPLOYMENT.md`  
**🛡️ PLATFORM-SAFE:** Production builds automatisch Multi-Platform! 