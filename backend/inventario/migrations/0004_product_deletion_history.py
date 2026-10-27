import django.db.models.deletion
from django.db import migrations, models


def preserve_product_details(apps, schema_editor):
    Movimiento = apps.get_model("inventario", "Movimiento")
    DetalleVenta = apps.get_model("inventario", "DetalleVenta")
    database = schema_editor.connection.alias

    for movement in Movimiento.objects.using(database).select_related("producto").iterator():
        product = movement.producto
        movement.producto_codigo_historico = product.codigo
        movement.producto_nombre_historico = product.nombre
        movement.save(
            using=database,
            update_fields=[
                "producto_codigo_historico",
                "producto_nombre_historico",
            ],
        )

    for detail in DetalleVenta.objects.using(database).select_related(
        "producto__categoria"
    ).iterator():
        product = detail.producto
        detail.producto_codigo_historico = product.codigo
        detail.producto_nombre_historico = product.nombre
        detail.categoria_nombre_historica = product.categoria.nombre
        detail.save(
            using=database,
            update_fields=[
                "producto_codigo_historico",
                "producto_nombre_historico",
                "categoria_nombre_historica",
            ],
        )


class Migration(migrations.Migration):

    dependencies = [
        ("inventario", "0003_solicitudayuda_mensajeayuda_venta_detalleventa"),
    ]

    operations = [
        migrations.AddField(
            model_name="movimiento",
            name="producto_codigo_historico",
            field=models.CharField(blank=True, default="", max_length=40),
        ),
        migrations.AddField(
            model_name="movimiento",
            name="producto_nombre_historico",
            field=models.CharField(blank=True, default="", max_length=180),
        ),
        migrations.AddField(
            model_name="detalleventa",
            name="categoria_nombre_historica",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.AddField(
            model_name="detalleventa",
            name="producto_codigo_historico",
            field=models.CharField(blank=True, default="", max_length=40),
        ),
        migrations.AddField(
            model_name="detalleventa",
            name="producto_nombre_historico",
            field=models.CharField(blank=True, default="", max_length=180),
        ),
        migrations.RunPython(preserve_product_details, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="movimiento",
            name="producto",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="movimientos",
                to="inventario.producto",
            ),
        ),
        migrations.AlterField(
            model_name="detalleventa",
            name="producto",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="detalles_venta",
                to="inventario.producto",
            ),
        ),
    ]
