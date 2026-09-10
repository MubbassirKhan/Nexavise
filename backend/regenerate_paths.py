#!/usr/bin/env python3
from database import store

# Delete all existing attack paths for the project
if store.supabase:
    try:
        # Delete all paths for proj-1
        response = store.supabase.table("attack_paths").delete().eq("project_id", "proj-1").execute()
        print(f"Deleted attack paths: {len(response.data or [])}")
        
        # Now regenerate
        from services.attack_path_service import generate_attack_paths
        paths = generate_attack_paths("proj-1")
        print(f"\nGenerated {len(paths)} new attack paths")
        
        # Count by severity
        severity_counts = {}
        for p in paths:
            sev = p.get("severity", "unknown")
            severity_counts[sev] = severity_counts.get(sev, 0) + 1
        
        print(f"Paths by severity:")
        for sev, count in sorted(severity_counts.items()):
            print(f"  {sev}: {count}")
        
        # Check for critical
        critical_paths = [p for p in paths if p.get("severity") == "critical"]
        if critical_paths:
            print(f"\nCritical paths found:")
            for p in critical_paths:
                print(f"  - {p['name']} (Risk: {p['riskScore']})")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
else:
    print("Supabase not configured")
