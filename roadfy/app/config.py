"""
Configuración de la aplicación Flask.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Cargar .env desde la carpeta roadfy
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

class Config:
    """Configuración base."""
    # JWT
    JWT_SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-change-this-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', '30')) * 60
    
    # CORS (para desarrollo o si se necesita acceso externo)
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:8000,http://localhost:3000,http://localhost:5173').split(',')
    CORS_ORIGINS = [origin.strip() for origin in CORS_ORIGINS if origin.strip()]
    
    # Frontend (URL base del frontend)
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:8000')
    
    # Database (para PyMySQL)
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = int(os.getenv('DB_PORT', '3306'))
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')
    DB_NAME = os.getenv('DB_NAME', 'roadfy_db')
    
    # Email (opcional)
    SMTP_ENABLED = os.getenv('SMTP_ENABLED', 'false').lower() == 'true'
    SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.gmail.com')
    SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
    SMTP_USER = os.getenv('SMTP_USER', '')
    SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')
