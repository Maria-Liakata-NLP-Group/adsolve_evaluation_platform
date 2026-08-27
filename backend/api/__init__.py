"""AdSoLve evaluation API package.

The .env file is loaded here, at package import time, because submodules read
os.environ while they are being imported — api.db builds the SQLAlchemy engine
from DATABASE_URL, and api.routers.config reads ADMIN_TOKEN per request. Loading
any later would leave those values unset.
"""

from .env import load_environment

load_environment()
