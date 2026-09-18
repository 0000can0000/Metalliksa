with open('python/lpbf_cfd.py', 'r', encoding='utf-8') as f:
    lines = f.read()

lines = lines.replace('{\"\\\\n\".join(alpha_vals)}', '{chr(10).join(alpha_vals)}')

with open('python/lpbf_cfd.py', 'w', encoding='utf-8') as f:
    f.write(lines)
