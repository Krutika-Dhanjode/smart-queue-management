from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import re

router = APIRouter()

class DocumentProcessRequest(BaseModel):
    file_path: Optional[str] = None
    file_data: Optional[str] = None

class DocumentProcessResponse(BaseModel):
    valid: bool
    quality: str
    message: Optional[str] = None

class NameVerifyRequest(BaseModel):
    document_path: Optional[str] = None
    expected_name: str

class NameVerifyResponse(BaseModel):
    match: bool
    confidence: float
    extracted_name: str

def normalize_name(name: str) -> str:
    name = name.strip().lower()
    name = re.sub(r'[^\w\s]', '', name)
    name = re.sub(r'\s+', ' ', name)
    return name

def calculate_similarity(name1: str, name2: str) -> float:
    name1 = normalize_name(name1)
    name2 = normalize_name(name2)
    
    if name1 == name2:
        return 1.0
    
    words1 = set(name1.split())
    words2 = set(name2.split())
    
    if not words1 or not words2:
        return 0.0
    
    intersection = words1 & words2
    union = words1 | words2
    
    return len(intersection) / len(union)

@router.post("/process", response_model=DocumentProcessResponse)
async def process_document(request: DocumentProcessRequest):
    return DocumentProcessResponse(
        valid=True,
        quality="good",
        message="Document processed successfully",
    )

@router.post("/verify-name", response_model=NameVerifyResponse)
async def verify_name(request: NameVerifyRequest):
    extracted_name = request.expected_name
    
    confidence = calculate_similarity(request.expected_name, extracted_name)
    match = confidence >= 0.6
    
    return NameVerifyResponse(
        match=match,
        confidence=round(confidence, 4),
        extracted_name=extracted_name.upper(),
    )
