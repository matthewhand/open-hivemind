import os
import re

def process_file(filepath):
    try:
        with open(filepath, 'r') as f:
            lines = f.readlines()

        new_lines = []
        i = 0
        while i < len(lines):
            line = lines[i]

            # Remove "export default {" blocks completely
            if line.startswith("export default {"):
                while i < len(lines):
                    if lines[i].startswith("};") or lines[i].strip() == "};":
                        i += 1
                        break
                    i += 1
                continue

            # Remove unloadProvider
            if line.startswith("export function unloadProvider") or line.startswith("export async function unloadProvider"):
                open_braces = line.count('{') - line.count('}')
                while i < len(lines):
                    if open_braces == 0 and ('{' in line or i > line):
                         break
                    i += 1
                    if i < len(lines):
                        open_braces += lines[i].count('{') - lines[i].count('}')
                        if open_braces <= 0 and ('}' in lines[i]):
                             i += 1
                             break
                continue

            new_lines.append(line)
            i += 1

        with open(filepath, 'w') as f:
            f.writelines(new_lines)
    except Exception as e:
        print(f"Error {filepath}: {e}")

process_file("src/message/ProviderRegistry.ts")
process_file("src/message/helpers/processing/SemanticRelevanceChecker.ts")
process_file("src/utils/xssSanitizer.ts")
process_file("src/validation/inputValidator.ts")
