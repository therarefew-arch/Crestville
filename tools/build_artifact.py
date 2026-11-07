"""Builds play.html (the page published as a claude.ai artifact) from index.html."""
import re

src = open('index.html').read()
body = re.search(r'<body>(.*)</body>', src, re.S).group(1)
head = '''<title>Crestville</title>
<meta name="theme-color" content="#fbf3e3">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@500;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/style.css">
<style>html, body { height: 100%; background: #fbf3e3; color-scheme: light; }</style>
'''
open('play.html', 'w').write(head + body)
print('wrote play.html')
