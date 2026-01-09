"""
Script para ejecutar el servidor Flask.
Uso: python run.py
Para desarrollo: DEBUG=true python run.py
Para producción: python run.py (debug=False por defecto)
"""
import os
from app import create_app

if __name__ == "__main__":
    app = create_app()
    # Solo activar debug si está explícitamente configurado en variables de entorno
    debug_mode = os.getenv('DEBUG', 'false').lower() == 'true'
    app.run(debug=debug_mode, host='0.0.0.0', port=8000)
