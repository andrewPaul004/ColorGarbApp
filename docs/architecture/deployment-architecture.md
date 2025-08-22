# Deployment Architecture

## Deployment Strategy

**Frontend Deployment:**
- **Platform:** Azure Static Web Apps
- **Build Command:** `npm run build`
- **Output Directory:** `apps/web/dist`
- **CDN/Edge:** Built-in Azure CDN with global edge locations

**Backend Deployment:**
- **Platform:** Azure App Service (Linux containers)
- **Build Command:** `dotnet publish -c Release`
- **Deployment Method:** Container deployment with Azure Container Registry

## CI/CD Pipeline

```yaml