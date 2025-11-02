from django.db import migrations


def create_initial_services(apps, schema_editor):
    Servicio = apps.get_model('catalogo', 'Servicio')

    entries = [
        {
            'nombre': 'AUTOMOVIL REVISION TÉCNICA',
            'categoria': 'SERVICIO REVISION TÉCNICA',
            'duracion_min': 120,
            'precio': 55000,
            'activo': True,
        },
        {
            'nombre': 'MOTO REVISION TECNICA',
            'categoria': 'SERVICIO REVISION TÉCNICA',
            'duracion_min': 120,
            'precio': 50000,
            'activo': True,
        },
        {
            'nombre': 'Grabado patentes (10 vidrios)',
            'categoria': 'Grabado patente',
            'duracion_min': 90,
            'precio': 30000,
            'activo': True,
        },
        {
            'nombre': 'BORRADO GRABADO PATENTES',
            'categoria': 'Grabado patente',
            'duracion_min': 480,
            'precio': 300000,
            'activo': True,
        },
        {
            'nombre': 'LAVADO y ASPIRADO',
            'categoria': 'LAVADOS',
            'duracion_min': 180,
            'precio': 45000,
            'activo': True,
        },
        {
            'nombre': 'PULIDO DE FOCO C/U',
            'categoria': 'LAVADOS',
            'duracion_min': 120,
            'precio': 50000,
            'activo': True,
        },
        {
            'nombre': 'LAVADO TAPIZ',
            'categoria': 'LAVADOS',
            'duracion_min': 480,
            'precio': 100000,
            'activo': True,
        },
        {
            'nombre': 'TRASLADO VEHICULO',
            'categoria': 'Servicio de traslado',
            'duracion_min': 90,
            'precio': 40000,
            'activo': True,
        },
        {
            'nombre': 'COMPRA VENTA',
            'categoria': 'OTROS',
            'duracion_min': 120,
            'precio': 0,
            'activo': True,
        },
        {
            'nombre': 'DETAILING',
            'categoria': 'OTROS',
            'duracion_min': 480,
            'precio': 0,
            'activo': True,
        },
        {
            'nombre': 'MANTENCIONES POR KM',
            'categoria': 'OTROS',
            'duracion_min': 480,
            'precio': 0,
            'activo': True,
        },
    ]

    for item in entries:
        Servicio.objects.update_or_create(nombre=item['nombre'], defaults=item)


def reverse_func(apps, schema_editor):
    Servicio = apps.get_model('catalogo', 'Servicio')
    nombres = [
        'AUTOMOVIL REVISION TÉCNICA',
        'MOTO REVISION TECNICA',
        'Grabado patentes (10 vidrios)',
        'BORRADO GRABADO PATENTES',
        'LAVADO y ASPIRADO',
        'PULIDO DE FOCO C/U',
        'LAVADO TAPIZ',
        'TRASLADO VEHICULO',
        'COMPRA VENTA',
        'DETAILING',
        'MANTENCIONES POR KM',
    ]
    Servicio.objects.filter(nombre__in=nombres).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('catalogo', '0002_add_precio'),
    ]

    operations = [
        migrations.RunPython(create_initial_services, reverse_func),
    ]
