from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('agenda', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='reserva',
            name='cancelled_by',
            field=models.CharField(max_length=32, choices=[('admin', 'Admin'), ('client', 'Client')], null=True, blank=True),
        ),
    ]
