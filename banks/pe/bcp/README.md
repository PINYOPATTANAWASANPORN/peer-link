# Banco de Crédito del Perú (BCP) Adapter

Pure deterministic banking adapter for Banco de Crédito del Perú (BCP - Peru / PEN) transfer records.

## Specifications
- **Country:** Peru (`PE`)
- **Currency:** `PEN` (minor units: 2, 100 céntimos = 1 PEN)
- **Supported Payment Types:** BCP a BCP, Interbank CCI transfer
- **Identifier:** `numeroOperacion` (e.g. `00548921`)
- **Statuses Supported:** `EXITOSO`, `PROCESADO`, `REALIZADO`, `SETTLED`
