from django.db import migrations, models


def promote_primary_administrator(apps, schema_editor):
    User = apps.get_model("auth", "User")
    PerfilUsuario = apps.get_model("inventario", "PerfilUsuario")
    primary = User.objects.filter(
        email__iexact="salomonjesuschavarrocastaneda@gmail.com",
    ).first()
    if primary:
        primary.is_active = True
        primary.is_staff = True
        primary.save(update_fields=["is_active", "is_staff"])
        profile, _ = PerfilUsuario.objects.get_or_create(
            usuario_id=primary.id,
            defaults={"rol": "Super Administrador"},
        )
        profile.rol = "Super Administrador"
        profile.save(update_fields=["rol"])
        return

    primary = User.objects.filter(is_staff=True).order_by("date_joined", "id").first()
    if not primary:
        return
    profile, _ = PerfilUsuario.objects.get_or_create(
        usuario_id=primary.id,
        defaults={"rol": "Super Administrador"},
    )
    if profile.rol != "Super Administrador":
        profile.rol = "Super Administrador"
        profile.save(update_fields=["rol"])


class Migration(migrations.Migration):

    dependencies = [
        ("inventario", "0004_product_deletion_history"),
    ]

    operations = [
        migrations.AlterField(
            model_name="perfilusuario",
            name="rol",
            field=models.CharField(
                choices=[
                    ("Super Administrador", "Super Administrador"),
                    ("Administrador", "Administrador"),
                    ("Empleado", "Empleado"),
                    ("Cliente", "Cliente"),
                ],
                default="Empleado",
                max_length=20,
            ),
        ),
        migrations.RunPython(promote_primary_administrator, migrations.RunPython.noop),
    ]
