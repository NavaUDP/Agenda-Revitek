#!/bin/bash

# Script para importar fixtures a la base de datos Railway
# Requiere que las variables de entorno de Railway estén configuradas

echo "🚂 Importando datos a Railway..."

# Verificar que existe DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL no está configurada"
    echo "Por favor exporta la variable:"
    echo "  export DATABASE_URL='postgresql://postgres:gFKhuWWALYGsVwdvfVtwtTTcXonwmyaK@maglev.proxy.rlwy.net:57992/railway'"
    exit 1
fi

# Activar entorno virtual
source .venv/bin/activate

# 1. Ejecutar migraciones
echo "🔄 Ejecutando migraciones en Railway..."
python manage.py migrate

# 2. Importar fixtures en orden (respetando dependencias)
echo ""
echo "📍 Importando regiones y comunas..."
python manage.py loaddata fixtures/regions_communes.json

echo ""
echo "📦 Importando catálogo..."
python manage.py loaddata fixtures/catalog_data.json

echo ""
echo "👨‍💼 Importando profesionales..."
python manage.py loaddata fixtures/professionals_data.json

echo ""
echo "👤 Importando usuario administrador..."
python manage.py loaddata fixtures/admin_user.json

echo ""
echo "✅ Importación completada!"
echo ""
echo "🔍 Verificando datos importados..."
python manage.py shell -c "
from apps.catalog.models import Service, Category
from apps.clients.models import Region, Commune, User
from apps.agenda.models import Professional

print(f'✓ Servicios: {Service.objects.count()}')
print(f'✓ Categorías: {Category.objects.count()}')
print(f'✓ Regiones: {Region.objects.count()}')
print(f'✓ Comunas: {Commune.objects.count()}')
print(f'✓ Usuarios admin: {User.objects.filter(is_staff=True).count()}')
print(f'✓ Profesionales: {Professional.objects.count()}')
"

echo ""
echo "🎉 ¡Datos importados exitosamente a Railway!"
