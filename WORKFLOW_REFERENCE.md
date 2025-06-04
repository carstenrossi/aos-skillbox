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
# Build & Push Production Images
./scripts/build-smart.sh -e production -p

# Update docker-compose.prod.yml with new image tags
# Deploy to Elestio
```

---

## 🔧 **Environment Mapping**

| Environment | Frontend Port | Backend Port | API URL Detection |
|-------------|---------------|--------------|-------------------|
| **Local**   | 3000          | 3001         | `localhost:3001`  |
| **Docker Dev** | 3003      | 3002         | `localhost:3002`  |
| **Production** | 80        | 3001         | Relative URLs     |

---

## 📁 **Key Files**

- `DEPLOYMENT.md` - Complete workflow documentation
- `scripts/build-smart.sh` - Automated build script
- `frontend/src/config/index.ts` - Smart API URL detection
- `docker-compose.dev.yml` - Development containers
- `docker-compose.prod.yml` - Production containers

---

## 🚨 **Troubleshooting**

| Problem | Likely Cause | Solution |
|---------|--------------|----------|
| CORS errors | Wrong API URL | Check `config/index.ts` |
| 401 Auth errors | Token not sent | Check localStorage & headers |
| API format errors | Inconsistent responses | Use `{ success: true, data: {...} }` |

---

## ✅ **Deployment Checklist**

- [ ] All changes made in **local source code**
- [ ] **Local testing** completed (localhost:3000)
- [ ] **Docker dev build** successful (`./scripts/build-smart.sh -e development`)
- [ ] **Docker dev testing** completed (localhost:3003)
- [ ] **Production build & push** successful (`./scripts/build-smart.sh -e production -p`)
- [ ] **docker-compose.prod.yml** updated with new image tags
- [ ] **Production deployment** tested

---

**🔄 REMEMBER:** Source Code → Docker Dev → Docker Production  
**📖 FULL DOCS:** See `DEPLOYMENT.md` 