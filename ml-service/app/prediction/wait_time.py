from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import numpy as np
from datetime import datetime

router = APIRouter()

class WaitTimeRequest(BaseModel):
    queue_type_id: str
    people_ahead: int = 0
    queue_length: int = 0
    active_counters: int = 1
    service_type: str = "normal"
    time_of_day: Optional[int] = None
    day_of_week: Optional[int] = None
    historical_average_service_time: Optional[float] = None
    current_service_duration: Optional[float] = None
    break_duration: Optional[float] = None

class WaitTimeResponse(BaseModel):
    estimated_wait_minutes: float
    lower_bound: float
    upper_bound: float
    model_version: str

@router.post("/wait-time", response_model=WaitTimeResponse)
async def predict_wait_time(request: WaitTimeRequest):
    avg_service_time = request.historical_average_service_time or 5.0
    people = request.people_ahead or request.queue_length
    
    estimated = (people / max(request.active_counters, 1)) * avg_service_time
    
    if request.break_duration:
        estimated += request.break_duration
    
    lower_bound = max(0, estimated * 0.8)
    upper_bound = estimated * 1.2
    
    return WaitTimeResponse(
        estimated_wait_minutes=round(estimated, 2),
        lower_bound=round(lower_bound, 2),
        upper_bound=round(upper_bound, 2),
        model_version="statistical-fallback",
    )
