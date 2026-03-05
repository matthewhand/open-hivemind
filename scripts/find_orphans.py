import os
import re
import sys

def find_orphans(root_dir):
    all_files = []
    file_map = {}
    
    # 1. Index all .tsx files
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith('.tsx') and not file.endswith('.test.tsx'):
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, root_dir)
                all_files.append(rel_path)
                
                # Store filename without extension for searching
                name_no_ext = os.path.splitext(file)[0]
                file_map[rel_path] = {
                    'name': name_no_ext,
                    'path': full_path,
                    'is_used': False
                }

    # 2. Search for usages
    for checker_path in all_files:
        checker_full_path = file_map[checker_path]['path']
        
        try:
            with open(checker_full_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Check usage of OTHER files in THIS file
            for potential_orphan in all_files:
                if potential_orphan == checker_path:
                    continue
                    
                orphan_name = file_map[potential_orphan]['name']
                
                # Simple heuristic: check if the component name appears in the content
                # This is not perfect (could be false positives), but good for a first pass
                if orphan_name in content:
                    file_map[potential_orphan]['is_used'] = True
                    
        except Exception as e:
            print(f"Error reading {checker_path}: {e}")

    # 3. Identify orphans
    orphans = []
    for file_path, data in file_map.items():
        # Exclude obvious entry points
        if file_path in ['index.tsx', 'App.tsx', 'main.tsx', 'router/AppRouter.tsx']:
            continue
            
        if not data['is_used']:
            orphans.append(file_path)

    return orphans

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python find_orphans.py <root_dir>")
        print("Example: python find_orphans.py src/client/src")
        sys.exit(1)
        
    root_dir = sys.argv[1]
    if not os.path.isabs(root_dir):
        root_dir = os.path.abspath(root_dir)
        
    orphans = find_orphans(root_dir)
    
    print(f"Potential Orphaned Components in {root_dir}:")
    for orphan in sorted(orphans):
        print(f"- {orphan}")
