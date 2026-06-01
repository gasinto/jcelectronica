# ============================================
#  JC Electrónica — Servidor Local
#  Node.js PURO — sin dependencias externas
#  Ejecutá este script para levantar el server
#  Después abrí http://localhost:3000
# ============================================

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║     JC Electrónica — Servidor Local     ║" -ForegroundColor Cyan
Write-Host "  ╠══════════════════════════════════════════╣" -ForegroundColor Cyan
Write-Host "  ║  Abrí en tu navegador:                  ║" -ForegroundColor Cyan
Write-Host "  ║  →  http://localhost:3000               ║" -ForegroundColor White
Write-Host "  ║  →  http://localhost:3000/catalogo.html  ║" -ForegroundColor White
Write-Host "  ║  →  http://localhost:3000/servicios.html ║" -ForegroundColor White
Write-Host "  ║  →  http://localhost:3000/gestion.html   ║" -ForegroundColor White
Write-Host "  ║                                          ║" -ForegroundColor Cyan
Write-Host "  ║  Para salir: Ctrl + C                    ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

node server.js
