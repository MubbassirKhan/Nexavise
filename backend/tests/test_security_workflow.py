import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from database import store
from main import app
from services.risk_engine import score_finding
from services.scanner_service import complete_scan
from services.security_scanner import HttpObservation, ScanTargetError, normalize_hostname, validate_target


class SecurityWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.admin_headers = {"X-User-Id": "u1"}
        self.analyst_headers = {"X-User-Id": "u2"}

    def test_localhost_is_blocked(self):
        with self.assertRaises(ScanTargetError):
            validate_target({"hostname": "localhost", "url": "http://localhost"})

    def test_private_ip_is_blocked(self):
        with self.assertRaises(ScanTargetError):
            validate_target({"hostname": "127.0.0.1", "url": "http://127.0.0.1"})

    def test_hostname_normalization_variants(self):
        expected = "nexavise-test.vercel.app"
        variants = [
            "https://nexavise-test.vercel.app/",
            "http://nexavise-test.vercel.app",
            "nexavise-test.vercel.app",
            "https://nexavise-test.vercel.app/path",
        ]
        self.assertTrue(all(normalize_hostname(value) == expected for value in variants))

    @patch("services.security_scanner._resolve_public_addresses")
    def test_target_url_matches_full_url_asset_case_insensitively(self, _resolve):
        asset = {"hostname": "https://nexavise-test.vercel.app/", "url": "https://nexavise-test.vercel.app/"}
        variants = [
            "https://nexavise-test.vercel.app/",
            "http://nexavise-test.vercel.app",
            "https://NEXAVISE-TEST.VERCEL.APP/path?check=1#fragment",
        ]
        for target in variants:
            self.assertEqual(validate_target(asset, target), target.rstrip("/"))

    @patch("services.security_scanner._resolve_public_addresses")
    def test_different_hostname_and_suffix_tricks_are_rejected(self, _resolve):
        asset = {"hostname": "https://nexavise-test.vercel.app/", "url": "https://nexavise-test.vercel.app/"}
        for target in (
            "https://example.com/",
            "https://nexavise-test.vercel.app.attacker.com/",
            "https://attacker.com/?target=nexavise-test.vercel.app",
        ):
            with self.assertRaises(ScanTargetError):
                validate_target(asset, target)

    def test_malformed_and_unsupported_targets_are_rejected(self):
        asset = {"hostname": "nexavise-test.vercel.app", "url": "https://nexavise-test.vercel.app/"}
        for target in ("not a url", "ftp://nexavise-test.vercel.app/file", "file://nexavise-test.vercel.app"):
            with self.assertRaises(ScanTargetError):
                validate_target(asset, target)

    def test_risk_score_is_deterministic(self):
        first = score_finding("medium", "internet", 3)
        second = score_finding("medium", "internet", 3)
        self.assertEqual(first, second)

    def test_admin_endpoint_denies_analyst(self):
        response = self.client.get("/api/users", headers=self.analyst_headers)
        self.assertEqual(response.status_code, 403)

    def test_unknown_project_asset_cannot_be_scanned(self):
        response = self.client.post(
            "/api/scans",
            headers=self.admin_headers,
            json={"projectId": "missing", "assetId": "missing", "scanner": "nuclei", "options": {}},
        )
        self.assertEqual(response.status_code, 404)

    @patch("services.scanner_service.generate_attack_paths")
    @patch("services.scanner_service.persist_scan_result")
    @patch("services.scanner_service.persist_risk_score")
    @patch("services.scanner_service.persist_finding", side_effect=lambda finding: finding)
    @patch("services.scanner_service.update_scan")
    @patch("services.scanner_service.scan_asset")
    @patch("services.scanner_service.get_asset")
    @patch("services.scanner_service.get_scan")
    def test_scan_worker_persists_successful_lifecycle(self, get_scan, get_asset, scan_asset, update_scan, persist_finding, persist_risk_score, persist_scan_result, generate_attack_paths):
        scan = {"id": "scan-test", "projectId": "proj-1", "assetId": "asset-test", "targetUrl": "https://example.com", "createdById": "u1"}
        asset = {"id": "asset-test", "projectId": "proj-1", "hostname": "example.com", "url": "https://example.com", "authorized": True, "exposure": "internet", "criticality": 3}
        observation = HttpObservation("Example", "https://example.com", 200, {}, "<html></html>", [])
        raw_finding = {"findingType": "missing-csp", "title": "Missing CSP", "description": "CSP is absent", "severity": "low", "evidence": "header absent", "remediation": "Add CSP", "scanner": "Nexavise HTTP Scanner"}
        get_scan.return_value = scan
        get_asset.return_value = asset
        scan_asset.return_value = (observation, [raw_finding])

        with patch.object(store, "findings", []), patch.object(store, "persist"), patch.object(store, "log"):
            complete_scan("scan-test")

        self.assertEqual(update_scan.call_args_list[-1].args[1]["status"], "completed")
        persist_finding.assert_called_once()
        persist_risk_score.assert_called_once()
        persist_scan_result.assert_called_once()
        generate_attack_paths.assert_called_once_with("proj-1")

    @patch("services.scanner_service.update_scan")
    @patch("services.scanner_service.scan_asset", side_effect=RuntimeError("scanner connection reset"))
    @patch("services.scanner_service.get_asset")
    @patch("services.scanner_service.get_scan")
    def test_scan_worker_persists_actual_failure(self, get_scan, get_asset, scan_asset, update_scan):
        get_scan.return_value = {"id": "scan-failed", "projectId": "proj-1", "assetId": "asset-test", "targetUrl": "https://example.com"}
        get_asset.return_value = {"id": "asset-test", "projectId": "proj-1", "hostname": "example.com", "authorized": True}

        with patch.object(store, "persist"), patch.object(store, "log"):
            complete_scan("scan-failed")

        failure = update_scan.call_args_list[-1].args[1]
        self.assertEqual(failure["status"], "failed")
        self.assertIn("scanner connection reset", failure["error"])


if __name__ == "__main__":
    unittest.main()
