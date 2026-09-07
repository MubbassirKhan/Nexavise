from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator

Role = Literal["admin", "analyst"]
Scanner = Literal["nmap", "nuclei"]
Severity = Literal["critical", "high", "medium", "low", "info"]
FindingStatus = Literal["open", "confirmed", "false_positive", "accepted_risk", "in_progress", "resolved"]


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=200)
    password: str = Field(min_length=1, max_length=200)


class ProjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str = Field(default="", max_length=500)
    organizationId: str = Field(default="org-1", min_length=1, max_length=80)


class ProjectPatch(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=500)


class Port(BaseModel):
    number: int = Field(ge=1, le=65535)
    protocol: Literal["tcp", "udp"] = "tcp"
    service: str = Field(min_length=1, max_length=80)
    state: Literal["open", "closed", "filtered"] = "open"


class AssetCreate(BaseModel):
    projectId: str
    hostname: str = Field(min_length=1, max_length=255)
    ip: str | None = None
    url: str | None = None
    type: str = Field(default="host", min_length=1, max_length=30)
    status: Literal["active", "inactive", "unknown"] = "active"
    exposure: Literal["internet", "internal", "dmz"] = "internal"
    technologies: list[str] = Field(default_factory=list, max_length=30)
    ports: list[Port] = Field(default_factory=list, max_length=100)
    authorized: bool = False
    criticality: int = Field(default=3, ge=1, le=5)
    tags: list[str] = Field(default_factory=list, max_length=30)

    @field_validator("hostname", "ip", "url")
    @classmethod
    def strip_text(cls, value):
        return value.strip() if isinstance(value, str) else value


class AssetPatch(BaseModel):
    hostname: str | None = Field(default=None, min_length=1, max_length=255)
    ip: str | None = None
    url: str | None = None
    status: Literal["active", "inactive", "unknown"] | None = None
    exposure: Literal["internet", "internal", "dmz"] | None = None
    technologies: list[str] | None = None
    ports: list[Port] | None = None
    authorized: bool | None = None
    criticality: int | None = Field(default=None, ge=1, le=5)
    tags: list[str] | None = None


class ScanCreate(BaseModel):
    projectId: str
    assetId: str
    scanner: Scanner
    options: dict[str, Any] = Field(default_factory=dict)


class DiscoveryRequest(BaseModel):
    assetId: str = Field(min_length=1, max_length=80)


class FindingPatch(BaseModel):
    status: FindingStatus | None = None
    remediation: str | None = Field(default=None, max_length=4000)


class AssignRequest(BaseModel):
    userId: str = Field(min_length=1, max_length=80)


class ReportCreate(BaseModel):
    projectId: str
    reportType: Literal["executive", "technical", "combined"] = "combined"


class APIModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
