from django.db import migrations, models


def set_home_card_images(apps, schema_editor):
    CafeConfig = apps.get_model("config", "CafeConfig")
    CafeConfig.objects.filter(pk=1).update(
        barra_atencion_image="home/barra_atencion.webp",
        espacio_disfrutar_image="home/espacio_disfrutar.webp",
        cafe_snacks_image="home/cafe_snacks.webp",
    )


def clear_home_card_images(apps, schema_editor):
    CafeConfig = apps.get_model("config", "CafeConfig")
    CafeConfig.objects.filter(pk=1).update(
        barra_atencion_image=None,
        espacio_disfrutar_image=None,
        cafe_snacks_image=None,
    )


class Migration(migrations.Migration):
    dependencies = [
        ("config", "0005_paymentmethod_qr_image"),
    ]

    operations = [
        migrations.AddField(
            model_name="cafeconfig",
            name="barra_atencion_image",
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to="home/",
                verbose_name="imagen de barra de atencion",
            ),
        ),
        migrations.AddField(
            model_name="cafeconfig",
            name="espacio_disfrutar_image",
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to="home/",
                verbose_name="imagen de espacio para disfrutar",
            ),
        ),
        migrations.AddField(
            model_name="cafeconfig",
            name="cafe_snacks_image",
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to="home/",
                verbose_name="imagen de cafe y snacks",
            ),
        ),
        migrations.RunPython(set_home_card_images, clear_home_card_images),
    ]
