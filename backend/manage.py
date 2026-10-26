#!/usr/bin/env python
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

if __name__ == "__main__":
    load_dotenv(Path(__file__).resolve().parent / ".env")
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    if (
        len(sys.argv) > 1
        and sys.argv[1] == "runserver"
        and not any(not arg.startswith("-") for arg in sys.argv[2:])
    ):
        sys.argv.append(f"127.0.0.1:{os.getenv('PORT', '8000')}")
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)
