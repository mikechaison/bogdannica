from django.apps import AppConfig


class MemesConfig(AppConfig):
    name = 'memes'

    def ready(self) -> None:
        from .sqlite_compat import install

        install()
