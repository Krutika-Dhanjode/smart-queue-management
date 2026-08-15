from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.prediction.wait_time import router as prediction_router
from app.document_processing.document import router as document_router
from app.analysis.analytics import router as analysis_router

app = FastAPI(
    title="Smart Queue ML Service",
    description="ML/AI service for queue management predictions and document processing",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(prediction_router, prefix="/predict", tags=["prediction"])
app.include_router(document_router, prefix="/document", tags=["document"])
app.include_router(analysis_router, prefix="/analysis", tags=["analysis"])

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "ml-service"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
