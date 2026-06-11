"""Hello-world PostgreSQL loader for AdSoLve.

Creates a tiny test dataframe and writes it to a PostgreSQL table using SQLAlchemy.

Set DATABASE_URL before running, for example:
postgresql+psycopg2://postgres@localhost:5432/adsolve
"""

from __future__ import annotations

import getpass
import os
from typing import Final

import pandas as pd
from sqlalchemy.exc import OperationalError
from sqlalchemy import String, create_engine, text


TABLE_NAME: Final[str] = "test_dataframe"


def get_database_url() -> str:
	"""Return the database URL from the environment or a local default."""
	default_user = getpass.getuser()
	default_url = f"postgresql+psycopg2://{default_user}@localhost:5432/adsolve"
	return os.environ.get("DATABASE_URL", default_url)


def build_test_dataframe() -> pd.DataFrame:
	"""Build the test dataframe requested by the user."""
	return pd.DataFrame(
		[
			{"id": "1", "content": "hello"},
			{"id": "2", "content": "world"},
		]
	)


def main() -> None:
	database_url = get_database_url()
	dataframe = build_test_dataframe()

	try:
		engine = create_engine(database_url)

		with engine.begin() as connection:
			dataframe.to_sql(
				TABLE_NAME,
				con=connection,
				if_exists="replace",
				index=False,
				dtype={"id": String(), "content": String()},
			)

		with engine.connect() as connection:
			row_count = connection.execute(text(f'SELECT COUNT(*) FROM "{TABLE_NAME}"')).scalar_one()
	except OperationalError as error:
		raise SystemExit(
			"Could not connect to PostgreSQL. Set DATABASE_URL with explicit credentials "
			"if your local role is not the current macOS user."
		) from error

	print(f"Connected to {database_url}")
	print(f"Wrote {len(dataframe)} rows to table '{TABLE_NAME}'.")
	print(f"Verified row count: {row_count}")
	print(dataframe.to_string(index=False))


if __name__ == "__main__":
	main()