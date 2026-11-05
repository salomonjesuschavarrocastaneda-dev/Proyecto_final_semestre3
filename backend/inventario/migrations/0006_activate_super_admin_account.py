from django.db import migrations


def activate_super_admin(apps, schema_editor):
    User = apps.get_model("auth", "User")
    PerfilUsuario = apps.get_model("inventario", "PerfilUsuario")
    email = "salomonjesuschavarrocastaneda@gmail.com"
    user = User.objects.filter(email__iexact=email).first()
    if not user:
        return

    user.is_active = True
    user.is_staff = True
    user.save(update_fields=["is_active", "is_staff"])
    profile, _ = PerfilUsuario.objects.get_or_create(
        usuario_id=user.id,
        defaults={"rol": "Super Administrador"},
    )
    profile.rol = "Super Administrador"
    profile.save(update_fields=["rol"])


class Migration(migrations.Migration):

    dependencies = [
        ("inventario", "0005_perfilusuario_roles"),
    ]

    operations = [
        migrations.RunPython(activate_super_admin, migrations.RunPython.noop),
    ]
