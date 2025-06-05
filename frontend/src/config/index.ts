// Central configuration loader with smart environment detection
const environment = process.env.NODE_ENV || 'development';

// Smart API URL detection based on context
function getApiUrl(): string {
  // 1. If REACT_APP_API_URL is set (from Docker build), use it
  if (process.env.REACT_APP_API_URL) {
    console.log('🐳 Using Docker API URL:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }

  // 2. Detect current frontend URL to determine context
  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';
  console.log('🔍 DEBUG - Current URL:', currentUrl, 'Environment:', environment);
  
  if (currentUrl.includes(':3003')) {
    // Docker Frontend (Port 3003) should use Docker Backend (Port 3002)
    const dockerApiUrl = 'http://localhost:3002';
    console.log('🐳 Detected Docker Frontend, using Docker Backend:', dockerApiUrl);
    return dockerApiUrl;
  }
  
  if (currentUrl.includes(':3000') || currentUrl === '') {
    // Local Frontend (Port 3000) should use Local Backend (Port 3001)
    const localApiUrl = 'http://localhost:3001';
    console.log('💻 Detected Local Frontend, using Local Backend:', localApiUrl);
    return localApiUrl;
  }

  // 3. Production or unknown environment
  if (environment === 'production') {
    // For production, use the current domain as base URL since nginx runs on same server
    // This avoids the %22%22 encoding problem that happens with empty strings
    const prodApiUrl = typeof window !== 'undefined' ? window.location.origin : 'https://skillboxdocker2-u31060.vm.elestio.app';
    console.log('🚀 Production: Using domain as baseUrl:', prodApiUrl);
    console.log('🔍 API Config will be:', { baseUrl: prodApiUrl, fullExample: prodApiUrl + '/api/assistants' });
    return prodApiUrl;
  }

  // 4. Fallback
  console.log('⚠️ Unknown environment, falling back to localhost:3001');
  return 'http://localhost:3001';
}

let config;

if (environment === 'production') {
  config = require('./env.production').config;
} else {
  config = require('./env.development').config;
}

export default {
  ...config,
  // Smart API URL based on context
  API_URL: getApiUrl(),
  ENVIRONMENT: config.ENVIRONMENT || environment,
  
  // Add debugging info
  CURRENT_URL: typeof window !== 'undefined' ? window.location.origin : 'unknown',
  BUILD_API_URL: process.env.REACT_APP_API_URL || 'not-set'
}; 