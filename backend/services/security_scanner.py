from __future__ import annotations

import ipaddress
import re
import socket
from dataclasses import dataclass
from datetime import datetime, timezone
from http.cookies import SimpleCookie
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup, Comment


USER_AGENT = "Nexavise-Sentinel-Security-Scanner/1.0"
MAX_BODY_BYTES = 2_000_000
MAX_DISCOVERED_URLS = 25
TIMEOUT = httpx.Timeout(10.0, connect=5.0)


class ScanTargetError(ValueError):
    pass


class TargetHostMismatchError(ScanTargetError):
    pass


@dataclass
class HttpObservation:
    title: str
    url: str
    status_code: int
    headers: dict[str, str]
    body: str
    links: list[str]


def _resolve_public_addresses(hostname: str) -> None:
    try:
        addresses = {item[4][0] for item in socket.getaddrinfo(hostname, None, type=socket.SOCK_STREAM)}
    except socket.gaierror as exc:
        raise ScanTargetError("Unable to resolve the authorized asset hostname") from exc
    for address in addresses:
        parsed = ipaddress.ip_address(address)
        if parsed.is_private or parsed.is_loopback or parsed.is_link_local or parsed.is_reserved or parsed.is_unspecified:
            raise ScanTargetError("Private, local, link-local, or reserved targets are blocked")


def normalize_hostname(value: str) -> str:
    """Return a case-insensitive hostname from a bare host or HTTP(S) URL."""
    raw_value = str(value or "").strip()
    if not raw_value:
        raise ScanTargetError("A target hostname or URL is required")
    try:
        parsed = urlparse(raw_value if "://" in raw_value else f"//{raw_value}")
    except ValueError as exc:
        raise ScanTargetError("Invalid target hostname or URL") from exc
    if parsed.scheme and parsed.scheme.lower() not in {"http", "https"}:
        raise ScanTargetError("Only http:// and https:// targets are supported")
    if parsed.username or parsed.password:
        raise ScanTargetError("Target URLs may not contain credentials")
    try:
        hostname = (parsed.hostname or "").lower().rstrip(".")
    except ValueError as exc:
        raise ScanTargetError("Invalid target hostname or URL") from exc
    if not hostname:
        raise ScanTargetError("Invalid target hostname or URL")
    if any(character.isspace() for character in hostname):
        raise ScanTargetError("Invalid target hostname or URL")
    return hostname


def validate_target(asset: dict, target_url: str | None = None) -> str:
    authorized_value = asset.get("hostname") or asset.get("url")
    authorized_hostname = normalize_hostname(authorized_value)
    raw_url = str(target_url or asset.get("url") or asset.get("hostname") or "").strip()
    try:
        parsed = urlparse(raw_url)
    except ValueError as exc:
        raise ScanTargetError("Invalid target hostname or URL") from exc
    if parsed.scheme.lower() not in {"http", "https"} or not parsed.hostname:
        raise ScanTargetError("Only http:// and https:// targets are supported")
    if parsed.username or parsed.password:
        raise ScanTargetError("Target URLs may not contain credentials")
    target_hostname = normalize_hostname(raw_url)
    if target_hostname != authorized_hostname:
        raise TargetHostMismatchError("Target URL must belong to the authorized asset hostname")
    if target_hostname in {"localhost", "localhost.localdomain", "0.0.0.0", "::1"} or target_hostname.endswith((".local", ".internal", ".localhost")):
        raise ScanTargetError("Internal hostnames are blocked")
    try:
        literal = ipaddress.ip_address(target_hostname)
        if literal.is_private or literal.is_loopback or literal.is_link_local or literal.is_reserved or literal.is_unspecified:
            raise ScanTargetError("Private, local, link-local, or reserved targets are blocked")
    except ValueError:
        _resolve_public_addresses(target_hostname)
    return raw_url.rstrip("/")


def _read_response(response: httpx.Response) -> str:
    body = bytearray()
    for chunk in response.iter_bytes():
        body.extend(chunk)
        if len(body) >= MAX_BODY_BYTES:
            break
    return bytes(body[:MAX_BODY_BYTES]).decode(response.encoding or "utf-8", errors="replace")


def _fetch(client: httpx.Client, url: str, host: str) -> HttpObservation | None:
    try:
        response = client.get(url)
        if response.url.host != host:
            return None
        body = _read_response(response)
        soup = BeautifulSoup(body, "html.parser")
        links = []
        for anchor in soup.find_all("a", href=True):
            candidate = urljoin(str(response.url), anchor["href"])
            parsed = urlparse(candidate)
            if parsed.scheme in {"http", "https"} and parsed.hostname == host and candidate not in links:
                links.append(candidate.split("#", 1)[0])
            if len(links) >= MAX_DISCOVERED_URLS:
                break
        return HttpObservation(
            title=soup.title.get_text(" ", strip=True)[:200] if soup.title else "",
            url=str(response.url),
            status_code=response.status_code,
            headers={key.lower(): value for key, value in response.headers.items()},
            body=body,
            links=links,
        )
    except httpx.HTTPError:
        return None


def _finding(asset: dict, observation: HttpObservation, finding_type: str, title: str, description: str, severity: str, evidence: str, remediation: str, affected_url: str | None = None) -> dict:
    return {
        "title": title,
        "description": description,
        "severity": severity,
        "assetId": asset["id"],
        "projectId": asset["projectId"],
        "scanner": "Nexavise HTTP Scanner",
        "status": "open",
        "evidence": evidence[:4000],
        "affectedUrl": affected_url or observation.url,
        "remediation": remediation,
        "observedAt": datetime.now(timezone.utc).isoformat(),
        "findingType": finding_type,
        "assetHostname": asset["hostname"],
    }


def scan_asset(asset: dict, target_url: str | None = None) -> tuple[HttpObservation, list[dict]]:
    target = validate_target(asset, target_url)
    host = urlparse(target).hostname
    if not host:
        raise ScanTargetError("Invalid scan target")
    with httpx.Client(
        headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8"},
        timeout=TIMEOUT,
        follow_redirects=True,
        max_redirects=3,
        limits=httpx.Limits(max_connections=4, max_keepalive_connections=2),
    ) as client:
        observation = _fetch(client, target, host)
        if observation is None and target.startswith("https://"):
            observation = _fetch(client, "http://" + target[8:], host)
        if observation is None:
            raise ScanTargetError("The authorized target did not return an HTTP response")

        findings: list[dict] = []
        headers = observation.headers
        checks = [
            ("missing-csp", "Missing Content-Security-Policy", "The response does not define a Content-Security-Policy header.", "low", "Content-Security-Policy header was absent", "Define a restrictive Content-Security-Policy appropriate for the application."),
            ("missing-content-type-options", "Missing X-Content-Type-Options", "The response does not prevent MIME-sniffing.", "low", "X-Content-Type-Options header was absent", "Set X-Content-Type-Options: nosniff."),
            ("missing-referrer-policy", "Missing Referrer-Policy", "The response does not define a referrer disclosure policy.", "low", "Referrer-Policy header was absent", "Set a restrictive Referrer-Policy such as strict-origin-when-cross-origin."),
            ("missing-permissions-policy", "Missing Permissions-Policy", "The response does not restrict browser feature access.", "low", "Permissions-Policy header was absent", "Define a Permissions-Policy for browser capabilities the application does not need."),
        ]
        for finding_type, title, description, severity, evidence, remediation in checks:
            header_name = {"missing-csp": "content-security-policy", "missing-content-type-options": "x-content-type-options", "missing-referrer-policy": "referrer-policy", "missing-permissions-policy": "permissions-policy"}[finding_type]
            if header_name not in headers:
                findings.append(_finding(asset, observation, finding_type, title, description, severity, evidence, remediation))
        if urlparse(observation.url).scheme == "https" and "strict-transport-security" not in headers:
            findings.append(_finding(asset, observation, "missing-hsts", "Missing Strict-Transport-Security", "HTTPS was used but the response did not advertise HSTS.", "low", "Strict-Transport-Security header was absent on an HTTPS response", "Set Strict-Transport-Security with an appropriate max-age after confirming HTTPS is complete."))
        frame = headers.get("x-frame-options", "").lower()
        if not frame or frame not in {"deny", "sameorigin"}:
            findings.append(_finding(asset, observation, "weak-frame-options", "Missing or weak X-Frame-Options", "The response does not clearly prevent framing by untrusted origins.", "low", f"X-Frame-Options value: {headers.get('x-frame-options', '<absent')}", "Set X-Frame-Options to DENY or SAMEORIGIN and use CSP frame-ancestors."))
        for cookie_header in observation.headers.get("set-cookie", "").split(","):
            cookie = SimpleCookie()
            cookie.load(cookie_header)
            for morsel in cookie.values():
                flags = cookie_header.lower()
                missing = [flag for flag in ("secure", "httponly", "samesite") if flag not in flags]
                if missing:
                    findings.append(_finding(asset, observation, "cookie-flags", "Cookie missing security flags", "A response cookie is missing one or more recommended security attributes.", "medium" if "httponly" in missing else "low", f"Cookie {morsel.key} missing: {', '.join(missing)}", "Set Secure, HttpOnly, and an appropriate SameSite value on session cookies."))
        for header in ("server", "x-powered-by"):
            if headers.get(header):
                findings.append(_finding(asset, observation, f"technology-disclosure-{header}", "Server technology disclosure", f"The {header} response header discloses implementation information.", "info", f"{header}: {headers[header]}", "Remove or minimize technology-identifying response headers."))
        comments = " ".join(str(comment) for comment in BeautifulSoup(observation.body, "html.parser").find_all(string=lambda text: isinstance(text, Comment)))
        if comments and re.search(r"\b(debug|password|secret|internal|todo)\b", comments, re.IGNORECASE):
            findings.append(_finding(asset, observation, "sensitive-html-comment", "Sensitive information in HTML comments", "HTML comments contain terms that may expose internal implementation information.", "low", comments, "Remove sensitive development notes and secrets from public HTML."))
        soup = BeautifulSoup(observation.body, "html.parser")
        for form in soup.find_all("form"):
            action = urljoin(observation.url, form.get("action") or observation.url)
            if urlparse(observation.url).scheme == "https" and urlparse(action).scheme == "http":
                findings.append(_finding(asset, observation, "insecure-form-action", "Form submits over HTTP", "An HTTPS page contains a form that submits to an HTTP URL.", "medium", f"Form action: {action}", "Submit sensitive forms only over HTTPS.", action))
        insecure_resources = [urljoin(observation.url, tag.get(attribute)) for tag in soup.find_all(src=True) for attribute in ("src",) if tag.get(attribute).startswith("http://")]
        insecure_resources.extend(urljoin(observation.url, tag.get("href")) for tag in soup.find_all(href=True) if tag.get("href").startswith("http://"))
        if urlparse(observation.url).scheme == "https" and insecure_resources:
            findings.append(_finding(asset, observation, "mixed-content", "Mixed content reference", "An HTTPS page references one or more HTTP resources.", "medium", "\n".join(insecure_resources[:10]), "Load all page resources over HTTPS.", insecure_resources[0]))
        for marker in re.findall(r"\b(debug|development|staging|test|internal)\b", observation.body, re.IGNORECASE):
            findings.append(_finding(asset, observation, "public-environment-marker", "Public environment marker", "The public response contains an environment-related marker that may reveal deployment information.", "info", f"Observed marker: {marker}", "Remove environment markers from public responses."))
            break
        return observation, findings