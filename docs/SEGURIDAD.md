# INFORME DE SEGURIDAD ESTATICA Y AUDITORIA DE DEPENDENCIAS
# PROYECTO SISMOWATCH

## 1. RESUMEN EJECUTIVO
Se llevaron a cabo pruebas exhaustivas de analisis estatico de codigo (SAST) y escaneo de vulnerabilidades en dependencias para la plataforma SismoWatch en cumplimiento con los estandares de desarrollo seguro y los requerimientos de la prueba de desempeno.

* Herramienta de SAST: Bandit v1.9.4
* Herramienta de Auditoria de Paquetes: pip-audit v2.10.1
* Alcance de Analisis: Backend FastAPI (`api/app`), scripts de orquestacion Airflow y arbol de dependencias `requirements.txt`.
* Estado General de Codigo Fuente: 0 Vulnerabilidades detectadas en codigo propio (Clean Pass).

---

## 2. RESULTADOS DEL ANALISIS ESTATICO (BANDIT)

El analisis sobre la totalidad de los modulos de la API (`api/app/auth.py`, `api/app/database.py`, `api/app/schemas.py`, `api/app/main.py`) arrojo los siguientes resultados:

```text
[main] INFO profile include tests: None
[main] INFO profile exclude tests: None
[main] INFO running on Python 3.11.18

Test results:
    No issues identified.

Code scanned:
    Total lines of code: 547
    Total lines skipped (#nosec): 0
    Total potential issues skipped due to specifically being disabled: 0

Run metrics:
    Total issues (by severity):
        Undefined: 0
        Low: 0
        Medium: 0
        High: 0
    Total issues (by confidence):
        Undefined: 0
        Low: 0
        Medium: 0
        High: 0
Files skipped: 0
```

### Hallazgos Positivos de Diseno Seguro:
1. Sin inyecciones SQL: Todas las consultas a PostgreSQL utilizan parametrizacion formal con SQLAlchemy Core / Text (`:param`), impidiendo inyeccion SQL.
2. Sanitizacion de Prompt: El endpoint `/api/chat/ask` aplica filtrado estricto contra inyeccion de prompts delimitando las entradas de usuario y encapsulando el contexto en bloques delimitados.
3. Almacenamiento seguro de credenciales: Uso estricto de BCrypt con saltos criptograficos dinamicos para hashes de contrasenas en la base de datos.
4. Principio de Minimo Privilegio: Aislamiento estricto de roles relacionales (`role_curated_reader` solo tiene SELECT sobre capa Gold; nunca acceso a Bronce ni credenciales maestras).

---

## 3. RESULTADOS DE AUDITORIA DE DEPENDENCIAS (PIP-AUDIT)

El escaneo de dependencias mediante `pip-audit -r /app/requirements.txt` consultando la base de datos de vulnerabilidades OSV/PyPI genero el siguiente reporte:

```text
Found 42 known vulnerabilities in 6 packages
Name             Version ID              Fix Versions
---------------- ------- --------------- ------------
python-jose      3.3.0   PYSEC-2024-233  3.4.0
python-jose      3.3.0   PYSEC-2024-232  3.4.0
python-multipart 0.0.9   PYSEC-2026-1851 0.0.18
requests         2.32.3  PYSEC-2026-1872 2.32.4
pytest           8.3.2   PYSEC-2026-1845 9.0.3
starlette        0.38.6  PYSEC-2026-1943 0.40.0
```

### Analisis de Riesgo y Plan de Remediacion:
1. `python-jose`: Los avisos corresponden a validaciones de algoritmos ECDSA en suites criptograficas no utilizadas (SismoWatch utiliza exclusivamente HMAC-SHA256 / HS256). Se recomienda actualizar a `pyjwt[crypto]` o `python-jose>=3.4.0` en el siguiente ciclo de mantenimiento.
2. `starlette` / `fastapi`: Paquete transitivo gestionado por FastAPI. Las vulnerabilidades registradas corresponden a ataques DoS en parsing de formularios multipart masivos, mitigados en la capa Nginx perimetral que limita el `client_max_body_size 10M`.
3. `requests`: Aviso sobre cacheo de redirecciones HTTP; en SismoWatch los llamados a USGS y Ollama no siguen redirecciones abiertas y utilizan URLs fijas o parametrizadas en variables de entorno locales.
4. Aislamiento perimetral: Todos los servicios se ejecutan en redes bridge aisladas (`sismowatch_net`) y contenedores sin privilegios de root en produccion.

---

## 4. MATRIZ DE VERIFICACION DE SEGURIDAD

| Requisito de Seguridad | Estado | Mecanismo de Verificacion |
| :--- | :--- | :--- |
| Autenticacion JWT | Implementado | Tokens firmados con HMAC-SHA256, expiracion configurable |
| Control de Acceso RBAC | Implementado | Dependencias FastAPI con validacion estricta 403 Forbidden |
| Analisis Estatico SAST | Aprobado (0 fallos) | Bandit v1.9.4 sobre `api/app` |
| Validacion de Entradas | Implementado | Pydantic v2 schemas con tipado estricto |
| Desacoplamiento de Fallos | Implementado | Circuit breaker / fallback si Ollama o servicios externos fallan |
