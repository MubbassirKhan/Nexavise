#!/usr/bin/env python3
from database import store
from services.asset_repository import list_assets
from services.finding_repository import list_findings

project_id = "proj-1"

# Check what assets are available
assets = list_assets(project_id)
print(f"Total assets: {len(assets)}")

# Check what findings are available
findings = list_findings(project_id)
print(f"Total findings: {len(findings)}")

# Check what findings match the criteria
critical_findings = [f for f in findings if f.get("severity") == "critical"]
print(f"Critical findings: {len(critical_findings)}")

if critical_findings:
    c = critical_findings[0]
    print(f"  - ID: {c['id']}")
    print(f"  - Status: {c.get('status')}")
    print(f"  - Asset ID: {c.get('assetId')}")
    
    # Check if that asset is in the list
    asset = next((a for a in assets if a['id'] == c['assetId']), None)
    if asset:
        print(f"  - Asset found: {asset['hostname']}")
        print(f"  - Authorized: {asset.get('authorized')}")
        print(f"  - Exposure: {asset.get('exposure')}")
    else:
        print(f"  - Asset NOT found: {c.get('assetId')}")

# Check if internet assets are being identified
internet_assets = [a for a in assets if a.get("exposure") == "internet" and a.get("authorized")]
print(f"\nInternet-facing authorized assets: {len(internet_assets)}")
for a in internet_assets[:3]:
    print(f"  - {a['hostname']} (id: {a['id']})")

# Check which findings would be included in path generation
filtered_findings = [
    f for f in findings 
    if f.get("status") != "resolved" 
    and f.get("severity", "").lower() in {"critical", "high", "medium", "low"}
    and f.get("assetId") in [a["id"] for a in internet_assets]
]
print(f"\nFindings that should have paths: {len(filtered_findings)}")
for f in filtered_findings:
    print(f"  - {f['severity'].upper()}: {f['title']} (asset: {f.get('assetId')})")
