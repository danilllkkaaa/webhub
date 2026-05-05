from pydantic import BaseModel
from typing import Optional


class WebinarAnalytics(BaseModel):
    webinar_id: int
    total_registrations: int
    total_visitors: int
    conversion_reg_to_visit: float
    avg_watch_seconds: float
    total_chat_messages: int
    total_offer_clicks: int
    conversion_visit_to_click: float
    utm_breakdown: dict
