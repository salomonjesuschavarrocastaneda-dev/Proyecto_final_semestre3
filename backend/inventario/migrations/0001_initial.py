# Generated for the MAGNUSSIG SIG inventory app.
import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

class Migration(migrations.Migration):
    initial = True
    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [
        migrations.CreateModel(
            name='Categoria',
            fields=[('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),('nombre', models.CharField(max_length=100, unique=True)),('descripcion', models.CharField(blank=True, max_length=255)),('activa', models.BooleanField(default=True)),('creado', models.DateTimeField(auto_now_add=True))],
            options={'ordering':['nombre'],'verbose_name_plural':'categorías'},
        ),
        migrations.CreateModel(
            name='PerfilUsuario',
            fields=[('id',models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name='ID')),('rol',models.CharField(choices=[('Administrador','Administrador'),('Empleado','Empleado')],default='Empleado',max_length=20)),('usuario',models.OneToOneField(on_delete=django.db.models.deletion.CASCADE,related_name='perfil_inventario',to=settings.AUTH_USER_MODEL))],
        ),
        migrations.CreateModel(
            name='Producto',
            fields=[('id',models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name='ID')),('codigo',models.CharField(max_length=40,unique=True)),('nombre',models.CharField(max_length=180)),('descripcion',models.TextField(blank=True)),('precio',models.DecimalField(decimal_places=2,max_digits=14,validators=[django.core.validators.MinValueValidator(0)])),('stock',models.PositiveIntegerField(default=0)),('stock_minimo',models.PositiveIntegerField(default=0)),('estado',models.CharField(choices=[('activo','Activo'),('inactivo','Inactivo')],default='activo',max_length=12)),('creado',models.DateTimeField(auto_now_add=True)),('actualizado',models.DateTimeField(auto_now=True)),('categoria',models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name='productos',to='inventario.categoria'))],
            options={'ordering':['nombre']},
        ),
        migrations.CreateModel(
            name='Movimiento',
            fields=[('id',models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name='ID')),('referencia',models.CharField(blank=True,max_length=40,unique=True)),('tipo',models.CharField(choices=[('entrada','Entrada'),('salida','Salida'),('ajuste','Ajuste')],max_length=10)),('cantidad',models.PositiveIntegerField(validators=[django.core.validators.MinValueValidator(1)])),('stock_anterior',models.PositiveIntegerField(default=0)),('stock_nuevo',models.PositiveIntegerField(default=0)),('fecha',models.DateField()),('observacion',models.CharField(blank=True,max_length=500)),('creado',models.DateTimeField(auto_now_add=True)),('producto',models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name='movimientos',to='inventario.producto')),('usuario',models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.SET_NULL,related_name='movimientos_inventario',to=settings.AUTH_USER_MODEL))],
            options={'ordering':['-creado']},
        ),
    ]
