"""
Conexión directa a MySQL usando PyMySQL.
"""
import pymysql
from app.config import Config
from contextlib import contextmanager

def get_db_connection():
    """
    Obtiene una conexión a la base de datos MySQL.
    
    Returns:
        pymysql.Connection: Conexión a la base de datos
    """
    try:
        connection = pymysql.connect(
            host=Config.DB_HOST,
            port=Config.DB_PORT,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=Config.DB_NAME,
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=False
        )
        return connection
    except Exception as e:
        print(f"[DB] Error al conectar a la base de datos: {e}")
        return None

@contextmanager
def get_db():
    """
    Context manager para obtener una conexión a la base de datos.
    Útil para usar con 'with' statement.
    
    Usage:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            results = cursor.fetchall()
    """
    conn = get_db_connection()
    if not conn:
        raise Exception("No se pudo conectar a la base de datos")
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def test_connection():
    """Prueba la conexión a la base de datos."""
    try:
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.close()
            conn.close()
            print(f"[DB] Conexión exitosa a {Config.DB_NAME}")
            return True
        else:
            print(f"[DB] No se pudo conectar a {Config.DB_NAME}")
            return False
    except Exception as e:
        print(f"[DB] Error en prueba de conexión: {e}")
        return False
