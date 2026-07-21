from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "username": "sara_soc",
                "email": "sara@example.com",
                "password": "StrongPassw0rd!",
            }
        }
    )


class UserResponse(BaseModel):
    id: UUID
    username: str
    email: EmailStr
    created_at: datetime

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "username": "sara_soc",
                "email": "sara@example.com",
                "created_at": "2026-01-15T10:30:00Z",
            }
        }
    )
