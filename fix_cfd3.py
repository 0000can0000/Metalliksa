with open('python/lpbf_cfd.py', 'r', encoding='utf-8') as f:
    lines = f.read()

lines = lines.replace('laserTStart     1({t_start});', 'laserTStart     1 ({t_start});')
lines = lines.replace('laserTEnd       1({t_end});', 'laserTEnd       1 ({t_end});')
lines = lines.replace('laserPStart     1({p_start[0]} {p_start[1]} {p_start[2]});', 'laserPStart     1 ( ({p_start[0]} {p_start[1]} {p_start[2]}) );')
lines = lines.replace('laserPEnd       1({p_end[0]} {p_end[1]} {p_end[2]});', 'laserPEnd       1 ( ({p_end[0]} {p_end[1]} {p_end[2]}) );')

with open('python/lpbf_cfd.py', 'w', encoding='utf-8') as f:
    f.write(lines)
