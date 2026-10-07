# BBVA México SPEI Adapter

Pure deterministic banking adapter for BBVA México (Mexico / MXN) SPEI transfer records with clave de rastreo.

## Specifications
- **Country:** Mexico (`MX`)
- **Currency:** `MXN` (minor units: 2, 100 centavos = 1 MXN)
- **Supported Payment Types:** Transferencia Interbancaria SPEI, BBVA a BBVA
- **Identifier:** `claveRastreo` (e.g. `MBAN01002304150098472839`)
- **Statuses Supported:** `LIQUIDADA`, `LIQUIDADO`, `EXITOSA`, `SETTLED`
