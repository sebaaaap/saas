# Envío de Cotizaciones (WhatsApp y Correo)

Este documento detalla la arquitectura y la implementación de la funcionalidad para enviar cotizaciones mediante correo electrónico y WhatsApp. La solución está diseñada para funcionar en un entorno local (PC del cliente) y es escalable para un modelo SaaS.

## Arquitectura

### 1. Envío por Correo Electrónico (Email)
Para el envío de correos, utilizaremos el protocolo estándar SMTP.
- **Entorno Local:** El cliente puede configurar su propio correo (por ejemplo, Gmail con "Contraseñas de Aplicación" o un correo corporativo). El sistema en su PC usará estas credenciales para enviar el correo con el PDF adjunto.
- **Entorno SaaS:** En el futuro, podrás utilizar un proveedor de envíos masivos como SendGrid, Resend o Amazon SES. La transición es completamente transparente para el código; solo cambiarás las variables de entorno (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`).

### 2. Envío por WhatsApp
El envío por WhatsApp presenta distintos desafíos dependiendo del entorno. Hemos diseñado una solución híbrida:

- **Fase 1: Enlace Inteligente (Click-to-Chat) [Ideal para Local]:** 
  El sistema genera un enlace tipo `https://wa.me/NUMERO?text=MENSAJE` que abre la aplicación de WhatsApp (Web o Escritorio) del cliente con un mensaje profesional pre-armado y un enlace para descargar la cotización. Esta es la forma más segura y gratuita de hacerlo funcionar localmente sin requerir infraestructura externa ni incurrir en costos de APIs.

- **Fase 2: API de WhatsApp (Background) [Ideal para SaaS]:**
  El código ya está preparado para integrarse con una API de WhatsApp (como Meta Cloud API, Evolution API o Twilio). En este modelo, el servidor envía un mensaje directamente al cliente con el PDF de la cotización sin que el usuario local tenga que abrir su WhatsApp.

## Implementación Realizada

1. **Backend - Servicio de Comunicación (`communication_service.py`):**
   - Se creó un servicio que gestiona la lógica de correos usando `smtplib` y `email.message`.
   - Se añadió la lógica para construir los enlaces y/o peticiones a API de WhatsApp.

2. **Backend - Endpoints (`api/quotes.py`):**
   - `POST /quotes/{quote_id}/send-email`: Endpoint que recibe el correo de destino y envía la cotización.
   - `POST /quotes/{quote_id}/send-whatsapp`: Endpoint que retorna el enlace inteligente para abrir en el frontend o lo envía por API.

3. **Frontend - UI (`quotes-ot-manager.tsx`):**
   - Se agregaron botones de "Enviar por Email" y "Enviar por WhatsApp" en las tarjetas de cotización.
   - Diálogos para confirmar el correo electrónico y número de teléfono (pre-cargando los datos del cliente si existen).

## Siguientes Pasos (SaaS)
Cuando transiciones a SaaS:
1. Configura un servidor SMTP global (ej. Resend) para el envío de todos los correos.
2. Contrata o despliega una instancia de **Evolution API** o usa la **API de WhatsApp Cloud (Meta)** para el envío de mensajes de forma invisible en segundo plano, en lugar de usar los enlaces `wa.me`. Podrás usar los mismos endpoints actuales, solo habilitando el parámetro para usar la API en lugar del link.
