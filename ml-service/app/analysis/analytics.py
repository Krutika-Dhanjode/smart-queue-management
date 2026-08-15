from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import numpy as np

router = APIRouter()

class QueueStats(BaseModel):
    total_joined: int
    served: int
    skipped: int
    removed: int
    avg_waiting_time: float
    avg_service_time: float
    max_waiting_time: float

class HourlyStats(BaseModel):
    hour: int
    count: int
    avg_wait: float

@router.post("/queue-summary")
async def analyze_queue(stats: QueueStats):
    completion_rate = (stats.served / max(stats.total_joined, 1)) * 100
    
    return {
        "completion_rate": round(completion_rate, 2),
        "avg_total_time": round(stats.avg_waiting_time + stats.avg_service_time, 2),
        "efficiency_score": round(
            (stats.served / max(stats.total_joined, 1)) * 100 -
            (stats.skipped / max(stats.total_joined, 1)) * 50,
            2
        ),
        "peak_wait": stats.max_waiting_time,
    }

@router.post("/peak-hours")
async def analyze_peak_hours(hourly_stats: List[HourlyStats]):
    if not hourly_stats:
        return {"peak_hours": [], "recommendation": "No data available"}
    
    counts = [s.count for s in hourly_stats]
    avg_count = np.mean(counts)
    peak_threshold = avg_count * 1.2
    
    peak_hours = [
        {"hour": s.hour, "count": s.count}
        for s in hourly_stats
        if s.count >= peak_threshold
    ]
    
    return {
        "peak_hours": peak_hours,
        "average_count": round(float(avg_count), 2),
        "recommendation": f"Consider adding more counters during peak hours: {[p['hour'] for p in peak_hours]}",
    }
