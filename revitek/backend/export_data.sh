#!/bin/bash

# Script para exportar datos esenciales de la base de datos local
# NO exporta: reservaciones, clientes regulares, vehículos, direcciones, slots

echo "🔄 Exportando datos desde la base de datos local..."

# Activar entorno virtual
source .venv/bin/activate

# Crear directorio de fixtures si no existe
mkdir -p fixtures

# 1. Exportar Regiones y Comunas
echo "📍 Exportando regiones y comunas..."
python manage.py dumpdata clients.Region clients.Commune \
    --indent 2 \
    --output fixtures/regions_communes.json

# 2. Exportar Catálogo (Categorías, Servicios, Reglas de tiempo)
echo "📦 Exportando catálogo (categorías, servicios, reglas)..."
python manage.py dumpdata catalog.Category catalog.Service catalog.ServiceTimeRule \
    --indent 2 \
    --output fixtures/catalog_data.json

# 3. Exportar solo usuario admin
echo "👤 Exportando usuario administrador..."
ADMIN_IDS=$(python manage.py shell -c "from apps.clients.models import User; import sys; sys.stdout.write(','.join(str(u.id) for u in User.objects.filter(is_staff=True)))")
python manage.py dumpdata clients.User \
    --indent 2 \
    --pks "$ADMIN_IDS" \
    --output fixtures/admin_user.json

# 4. Exportar Profesionales y sus servicios
echo "👨‍💼 Exportando profesionales y servicios..."
python manage.py dumpdata agenda.Professional agenda.ProfessionalService agenda.WorkSchedule agenda.Break \
    --indent 2 \
    --output fixtures/professionals_data.json

echo ""
echo "✅ Exportación completada!"
echo ""
echo "📁 Archivos creados:"
ls -lh fixtures/*.json

echo ""
echo "📊 Resumen de objetos exportados:"
echo "  - Regiones y Comunas: $(grep -o '"model"' fixtures/regions_communes.json | wc -l) objetos"
echo "  - Catálogo: $(grep -o '"model"' fixtures/catalog_data.json | wc -l) objetos"
echo "  - Admin user: $(grep -o '"model"' fixtures/admin_user.json | wc -l) objetos"
echo "  - Profesionales: $(grep -o '"model"' fixtures/professionals_data.json | wc -l) objetos"
