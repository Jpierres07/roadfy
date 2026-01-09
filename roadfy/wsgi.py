"""
WSGI entry point for production deployment.
Este archivo es usado por servidores WSGI como Gunicorn, uWSGI, o Passenger.
"""
import sys
import os

# Asegurar que el directorio del proyecto esté en el path
project_dir = os.path.dirname(os.path.abspath(__file__))
if project_dir not in sys.path:
    sys.path.insert(0, project_dir)

from app import create_app

# Crear la aplicación Flask
application = create_app()

# Alias para compatibilidad
app = application

# Para ejecución directa (solo desarrollo)
if __name__ == "__main__":
    application.run(host='0.0.0.0', port=8000)
