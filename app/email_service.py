"""
Servicio de envío de emails para recuperación de contraseña.
En desarrollo, imprime el enlace en consola. En producción, envía email real.
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_password_reset_email(email: str, reset_token: str, frontend_url: str = None):
    """
    Envía email con enlace de recuperación de contraseña.
    
    Args:
        email: Email del usuario
        reset_token: Token de recuperación
        frontend_url: URL del frontend (opcional)
    """
    # URL del frontend (por defecto localhost:9002)
    if not frontend_url:
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:9002')
    
    reset_link = f"{frontend_url}/reset-password?token={reset_token}&email={email}"
    
    # Configuración de email desde variables de entorno
    smtp_enabled = os.getenv('SMTP_ENABLED', 'false').lower() == 'true'
    smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
    smtp_port = int(os.getenv('SMTP_PORT', '587'))
    smtp_user = os.getenv('SMTP_USER', '')
    smtp_password = os.getenv('SMTP_PASSWORD', '')
    smtp_from = os.getenv('SMTP_FROM', smtp_user)
    
    # Contenido del email
    subject = "Recuperación de Contraseña - ROADFY"
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
            .content {{ background-color: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }}
            .button {{ display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>ROADFY</h1>
                <p>Recuperación de Contraseña</p>
            </div>
            <div class="content">
                <p>Hola,</p>
                <p>Recibimos una solicitud para recuperar tu contraseña en ROADFY.</p>
                <p>Haz clic en el siguiente botón para restablecer tu contraseña:</p>
                <div style="text-align: center;">
                    <a href="{reset_link}" class="button">Restablecer Contraseña</a>
                </div>
                <p>O copia y pega este enlace en tu navegador:</p>
                <p style="word-break: break-all; color: #3b82f6;">{reset_link}</p>
                <p><strong>Este enlace expirará en 1 hora.</strong></p>
                <p>Si no solicitaste este cambio, puedes ignorar este email.</p>
            </div>
            <div class="footer">
                <p>&copy; {os.getenv('CURRENT_YEAR', '2025')} ROADFY. Todos los derechos reservados.</p>
                <p>RímacW y ShuanJP</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
    ROADFY - Recuperación de Contraseña
    
    Hola,
    
    Recibimos una solicitud para recuperar tu contraseña en ROADFY.
    
    Haz clic en el siguiente enlace para restablecer tu contraseña:
    {reset_link}
    
    Este enlace expirará en 1 hora.
    
    Si no solicitaste este cambio, puedes ignorar este email.
    
    © {os.getenv('CURRENT_YEAR', '2025')} ROADFY. Todos los derechos reservados.
    RímacW y ShuanJP
    """
    
    # Si SMTP está habilitado, enviar email real
    if smtp_enabled and smtp_user and smtp_password:
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = smtp_from
            msg['To'] = email
            
            part1 = MIMEText(text_body, 'plain', 'utf-8')
            part2 = MIMEText(html_body, 'html', 'utf-8')
            
            msg.attach(part1)
            msg.attach(part2)
            
            # Configurar conexión SMTP con mejor manejo de errores
            print(f"📧 Intentando enviar email a {email}...")
            print(f"   SMTP Host: {smtp_host}:{smtp_port}")
            print(f"   SMTP User: {smtp_user}")
            
            # Usar SSL si el puerto es 465, TLS si es 587
            if smtp_port == 465:
                # SSL para Gmail (puerto 465)
                import ssl
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(smtp_host, smtp_port, context=context, timeout=10) as server:
                    server.login(smtp_user, smtp_password)
                    server.send_message(msg)
            else:
                # TLS (puerto 587) - Recomendado para Gmail
                with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_password)
                    server.send_message(msg)
            
            print(f"✅ Email enviado exitosamente a {email}")
            return True
        except smtplib.SMTPAuthenticationError as e:
            error_msg = f"Error de autenticación SMTP: {str(e)}"
            print(f"❌ {error_msg}")
            print("💡 Verifica:")
            print("   - Que SMTP_USER y SMTP_PASSWORD sean correctos")
            print("   - Si usas Gmail, necesitas una 'Contraseña de aplicación' (no tu contraseña normal)")
            print("   - Que la verificación en 2 pasos esté habilitada en Gmail")
            print_password_reset_info(email, reset_link)
            return False
        except smtplib.SMTPRecipientsRefused as e:
            print(f"❌ Error: El destinatario fue rechazado: {str(e)}")
            print_password_reset_info(email, reset_link)
            return False
        except smtplib.SMTPServerDisconnected as e:
            print(f"❌ Error: El servidor SMTP se desconectó: {str(e)}")
            print("💡 Verifica SMTP_HOST y SMTP_PORT.")
            print_password_reset_info(email, reset_link)
            return False
        except Exception as e:
            error_msg = f"Error inesperado al enviar email: {str(e)}"
            print(f"❌ {error_msg}")
            print(f"💡 Tipo de error: {type(e).__name__}")
            import traceback
            traceback.print_exc()
            print_password_reset_info(email, reset_link)
            return False
    else:
        # Modo desarrollo: imprimir en consola
        if not smtp_enabled:
            print("ℹ️  SMTP_ENABLED=false - Modo desarrollo activo")
        if not smtp_user or not smtp_password:
            print("ℹ️  SMTP_USER o SMTP_PASSWORD no configurados")
        print_password_reset_info(email, reset_link)
        return True

def print_password_reset_info(email: str, reset_link: str):
    """Imprime información de recuperación en consola (modo desarrollo o fallback)."""
    print("\n" + "="*80)
    print("📧 EMAIL DE RECUPERACIÓN DE CONTRASEÑA")
    print("="*80)
    print(f"Para: {email}")
    print(f"Enlace de recuperación: {reset_link}")
    print("="*80 + "\n")
    print("💡 NOTA: Si quieres emails reales, configura SMTP en .env")
    print("\n")
