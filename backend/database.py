import os
from pyairtable import Api
from dotenv import load_dotenv

load_dotenv()

_api = None
_base = None


def get_base():
    global _api, _base
    if _base is None:
        _api = Api(os.environ["AIRTABLE_API_KEY"])
        _base = _api.base(os.environ["AIRTABLE_BASE_ID"])
    return _base


def scans_table():
    return get_base().table("Scans")


def businesses_table():
    return get_base().table("Businesses")


def proposals_table():
    return get_base().table("Proposals")
